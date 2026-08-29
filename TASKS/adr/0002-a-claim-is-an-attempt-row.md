# 0002 — A claim is an attempt row; task state is derived

## Status

Accepted — 2026-08-27

## Context

The queue is one flat table (`src/db/schema.ts`): `id, text, opts, origin_workspace,
created_at, updated_at, state, retries, last_error, agent_key, dispatch_id, result`.

Four of those columns are the newest *claim*, flattened onto the task and then overwritten by
the next one. That flattening produced a live defect rather than a stylistic complaint:

**`agent_key` is stamped at first claim and kept through every requeue** (`src/queue.ts:33-38`),
so a failed task retries only on the agent that first took it — including when that agent is
dead. The rule the design wanted (Cq6: a pack-scoped task retries anywhere in the pack, only an
agent-scoped one re-pins) was perfectly stateable against the flat table, and perfectly
forgettable, which is what it turned out to be.

The same flattening loses history that matters when something goes wrong. `retries` is a counter
that has discarded what it counted. `last_error` keeps one error and drops every earlier one, so
a task that failed three times across three agents can report only the third.

Meanwhile `state` is stored *and* derivable, which is two answers to one question — the failure
mode this rebuild has been deleting everywhere else (`lifetime`, `orphaned_at`, a `packs` table).

## Decision

**A task is a hub; every claim is an attempt row.**

- `tasks` — `id`, `text`, `opts`, `enqueued_by`, the scope, `created_at`, and cancellation.
  Text and options are editable by the enqueuer while unclaimed (Cq9) but need no history.
- `task_attempts` — one row per claim, keyed `(task_id, since)`: which agent took it, which
  dispatch, when it started, when and how it ended, its result or its error.
- `pack_intakes` — a pack's standing opt-in to consume a space's pool, because the consuming
  half of Cq3's two-sided consent has to be stored somewhere.
- `task_states` — a view. `cancelled` if cancelled; otherwise no attempts is `queued`, an open
  attempt is `claimed`, and a settled newest attempt is its outcome.

`retries`, `last_error`, `agent_key`, `state` and `origin_workspace` all leave the schema.

Scope is **three typed nullable references** — `scope_agent_id`, `scope_pack_id`,
`scope_space_id` — with a CHECK that exactly one is non-null.

## Consequences

- **Cq6 becomes unrepresentable rather than enforced.** With the binding on the attempt, a
  pack-scoped retry lands anywhere in the pack because there is nothing left to re-pin. No
  branch, no rule to remember, no test guarding a column that could still be written.
- **The claim gets a stronger mechanism on the way past.** Today it is a conditional `UPDATE`
  reporting how many rows changed (`writeTaskClaim`); it becomes an `INSERT` under
  `one_open_attempt` — the same partial-unique-index primitive as every lease and environment
  axis. Two racing claimants collide on the index; one gets a constraint violation. There is no
  arrangement in which both proceed.
- **Full failure history survives**, so "why did this task fail" is answerable across agents and
  across retries instead of only for the last attempt.
- **Reads cost a join.** `SELECT * FROM queue` becomes a join against the newest attempt, and
  every consumer of `TaskRec` changes shape. This is the real price and it is paid once.
- `queue.max_retries` stays policy in `settings.json`: the view reports `failed`, and how many
  attempts a task gets before that is final is not a schema question.
- Retention deletes settled tasks and their attempts together via `ON DELETE CASCADE`. A queued
  task is still never deleted on age (Cq10, Cq11).

## Alternatives considered

- **Keep the flat table and fix `agent_key` at the requeue site.** Rejected: it fixes the one
  known instance of a shape problem. The next rule about claims is equally forgettable, and the
  lost error history stays lost.
- **A `(scope_kind, scope_id)` pair.** Rejected: a polymorphic pair cannot carry a foreign key,
  so a task could name a pack that never existed — and the three scopes would share one index
  where each wants its own.
- **Keep a stored `state` alongside the attempts, as a cache.** Rejected: `root_agent_id` is
  materialized because its inputs are immutable and it therefore cannot drift. A task's state
  changes constantly, so a stored copy is exactly the drifting second truth that argument
  permits nowhere else.
- **A separate `task_results` table.** Rejected: a result belongs to the attempt that produced
  it, one-to-one. A second table would allow a result with no attempt.
