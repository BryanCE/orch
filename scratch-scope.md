# event scope and subscriptions — plan (scratch, delete when landed)

## The bug that started this

`orch status` has no ownership filter. `scopeFleetRows` filters on space, `managed`, and
exited/liveness, nothing else. An agent running `orch status` sees the entire fleet, including other
orchs' agents, so its monitors fire on work it does not own.

`orch events` scopes by ownership, but does it in the wrong place (client-side, in the CLI process)
using the wrong fact (the lease).

## The model

A **subscription** is a row. It is the only thing that decides which agents an orch hears from.

- Spawning writes one automatically, spawner to slave. That is what makes the default "immediate
  family". No spawn, no row, no events.
- Closing or killing the slave deletes the row.
- An orch may subscribe to any agent **in its space**, including an agent in another orch's tree.
  Two sibling orchs coordinating is a real case and ownership must not block it.
- Unsubscribe exists, including from your own slave, to shut a noisy one up.
- **The space is the hard wall.** Not ownership. Not the tree.
- A human has no agent id and therefore no subscriptions. A human sees everything.

### Addressing a subscription

You name an agent. The flags say how much of the tree beneath it comes with it.

| command | what it delivers |
|---|---|
| `subscribe orch-1` | ONLY orch-1's own events. Nothing under it. |
| `subscribe orch-1 --branch` | orch-1 plus its direct children. |
| `subscribe orch-1 --branch --depth=2` | orch-1, its children, its grandchildren. |
| `subscribe orch-1 --branch --depth=all` | orch-1 and everything under it, however deep. |

`--branch` on its own means depth 1. `--depth` without `--branch` is meaningless and is refused.

**A branch subscription is a live query, not a snapshot.** It delivers whatever is in that branch at
the time an event fires. Slaves that appear under the branch later are included; slaves that die drop
out. That is what "subscribed to a branch" means, and it is why naming a branch beats listing agents:
the tree keeps reshaping and the subscription stays true.

### Shape: copy `agent_leases` exactly

Nothing is stored on `agents`. Nothing on the spawnee. A subscription is its own relationship table
with two foreign keys to `agents.id`, exactly like `agent_leases` (`agent_id` + `orch_id`).

```
subscriptions
  subscriber_agent_id  FK agents.id  ON DELETE CASCADE
  target_agent_id      FK agents.id  ON DELETE CASCADE
  branch               0 = the named agent only
  depth                NULL unless branch; N levels, or "all"
  created_at           INTEGER epoch millis
  uniqueIndex(subscriber, target)
```

**No `until`, no history. Unsubscribe DELETES the row.** This data lives minutes to hours, maybe
days. It is not a fact anyone reads back later, so the interval shape `agent_leases` uses would be
storing months of dead relationships to answer a question nobody asks.

- Closing or killing an agent deletes every subscription naming it, on either side. It goes in
  `endAgent()` (`store/agent-rows.ts:83`), the ONLY writer of an `agent_endings` row, so every verb
  that can end an agent funnels through one statement. Nowhere else.
- `daemon/retention.ts` is what actually deletes agent rows after a cutoff, so the FK cascade is a
  real backstop for anything that ever survives the ending.
- History lives in `orch logs`, not the table. Log the subscribe and the unsubscribe as decision
  records and "why didn't my monitor fire" is answerable with zero dead rows. The table holds what is
  true now; the log holds what happened.
- **Doctor never touches it.** Doctor checks declared composition against reality (Rule 9).
  Subscriptions are ephemeral runtime data, not declared config. Not its job.

### The rule that keeps spawn honest

Spawn writes two records about the same moment, and they are DIFFERENT FACTS:

- `agents.spawned_by` is provenance. Immutable, permanent, survives everything.
- the subscription row is a listening relationship. Revocable, deleted, short-lived.

They are allowed to disagree. Unsubscribing from your own slave leaves provenance intact and that is
correct, not drift. Never derive a subscription from provenance, never repair provenance from
subscriptions.

## Settled, with reasons

- **Ownership is provenance, not the lease.** `close-authority.ts` states it: user, then orch, then
  the slaves that orch owns. The lease answers who is DRIVING (gates dispatch, steer, model, reset).
  Provenance answers whose it is (gates ending it). Subscriptions answer who HEARS it, and that is a
  third question again.
- **Close authority does not change.** It stays subtree-wide. A grandparent must always be able to
  kill a runaway grandchild it never subscribed to.
- **No scope flags on the default.** `--mine` and `--any-agent` get deleted from `events`. Nothing
  equivalent is added to `status`. The default is the subscription rows and nothing else.
- **The daemon computes it.** The `status` RPC takes no params today
  (`status: () => fleetStatus(directory)`), which is the actual gap. It gets the caller claim,
  resolves it the way `register-session` already does, reads subscriptions, and answers rows already
  scoped. The client renders what it is handed, filters nothing, reads no lease table.
- **One mechanism, not two.** Everything an orch hears is a row. There is no second, derived path for
  "family" running alongside the subscription table.
- **Rows survive a daemon reload,** so a live monitor does not have to re-present its scope on
  redial. `subscribeEvents` redials and the daemon reads the same rows.

## Open

- [ ] **Space is mutable** (Rule 11: environment changes). If a subscribed agent MOVES to another
      space, does the subscription die, or is the space checked only when subscribing?
- [ ] **Verb naming.** `orch subscribe` / `orch unsubscribe` / `orch subscriptions`, or fold into an
      existing verb.
- [ ] **Depth cap** is a setting, not a literal (Rule 17). Where it sits, and what `all` maps to.
- [ ] **"Pack" collides.** `rootAgentId` is called the pack in code today and means the root of the
      WHOLE tree. Immediate family is one level. Two sets, one word. Needs a new word for the whole
      tree and a word for one level. (You said you do not love "pack".)

## Status is a human command

An orch has no eyes and no business browsing a dashboard. Every orch use of `orch status` the skill
teaches is a workaround for a defect elsewhere (below). Once those are fixed, an orch needs:

- **transitions** from `events`, pushed,
- **facts** from the return value of the command it just ran,
- **its working set**, which is its subscriptions.

The table stays, for humans, space-scoped as today. Capacity stays global, because it is a number
about the machine and not about anyone's agents.

## Defects the skill is papering over

**The principle:** every "verify it worked" line in a skill is a bug report someone wrote down as a
habit instead of fixing. The doctrine outlives the bug, agents burn a command on it forever, and the
defect stays. A command that succeeds must be believable. If the skill has to tell an agent to check,
the COMMAND is broken and the check is the workaround. (Rule 8 applied to behaviour instead of data.
Candidate for CLAUDE.md.)

Five of them, all in or around the watch section:

- [ ] **`reset` re-pins the spawn-time model** and silently discards a later `orch model` change.
      Doctrine it produced: "verify the MODEL column in `orch status`." Fix reset, delete the line.
      (scratch.md item 1.)
- [ ] **`orch dispatch` returns ACCEPTED, not DELIVERED.** It is durable and queued, so it returns
      instantly and the agent cannot tell whether the prompt landed. Doctrine it produced: poll
      `orch status --json` for a matching `.dispatchId`. Delivery is a TRANSITION and there is
      already a push stream for transitions. Emit it, and the armed monitor gets it free.
- [ ] **Nothing answers "do I already have a monitor armed."** Doctrine it produced:
      `pgrep -fa "orch events"`, then compare its panes against `orch status`, then `kill` the pid.
      Orch's own state read out of the OS process table. The daemon HOLDS those stream connections
      and knows its subscribers. Expose it.
- [ ] **Space scoping drops a fleet that has no space** (U9). Doctrine it produced: "`--all` is
      REQUIRED today", so every armed watch is fleet-wide whether it wants to be or not. Rule 11 says
      `"local"` is a missing value with a name; a missing space must not act as a filter that matches
      nothing. Fixing this is a prerequisite for the subscription work, since a scoped default that
      drops everything is worse than no scope.
- [ ] **Empty replay reads as broken scope.** Doctrine it produced: "a silent stream means the SCOPE
      is wrong." On a fresh daemon there is simply no history, so the smoke test gave a false
      negative and nearly cost an armed watch. Either replay has a bug or the check needs to
      distinguish "no history" from "wrong scope". Investigate before rewriting the line.
      (scratch.md item 3.)

## Wrong turns to revert first

Written before the design was settled, all wrong:

- [ ] Delete `src/policy/scope.ts` (client-side predicate, lease-based, wrong layer and wrong fact).
- [ ] Revert `AgentScopeInput` / `CallerScopeChoice` / `ResolvedCallerScope` out of
      `src/types/policy.ts`.
- [ ] Revert `src/commands/events.ts` to HEAD.
- [ ] `EventScopeInput` in `src/types/command.ts` gets deleted for real in wave 4, not restored.

## Tasks

### Wave 1 — the store

- [ ] Table as shaped above. Two FKs to `agents.id`, both cascading. No `until`, no history.
- [ ] Migration written, then HANDED TO BRYAN to run (Rule 1). Never run it.
- [ ] Row writers and readers in `src/store/subscription-rows.ts`, following `lease-rows.ts` style.
- [ ] Spawn writes the spawner-to-slave row.
- [ ] `endAgent()` deletes every row naming that agent, either side. One place, no second copy.
- [ ] Subscribe and unsubscribe write decision-log records, so history lives in `orch logs`.
- [ ] Tests: spawn writes it, close deletes it, killing the subscriber deletes it, unsubscribing from
      your own slave leaves `spawned_by` untouched.

### Wave 2 — the policy

- [ ] Resolve "which agents does this caller hear" from the rows, expanding branch subscriptions
      through the existing `policy/provenance.ts` walk. One traversal per call, not one per row.
- [ ] Refuse a subscription whose target is outside the caller's space, reusing the existing space
      wall rather than writing a second one.
- [ ] Refuse `--depth` without `--branch`.
- [ ] Tests: leaf subscription delivers one agent; `--branch` delivers depth 1; `--depth=2` delivers
      two levels; `--depth=all` delivers the lot; a slave spawned AFTER the subscription appears in a
      branch subscription; cross-space is refused; a human hears everything.

### Wave 3 — the wire

- [ ] `sessionClaim()` carries the launch credential (`ORCH_AGENT_ID`). A spawned agent identifies by
      its minted id, a driving session by its `sessionToken`. The claim has no field for the former
      today.
- [ ] Daemon resolves claim to caller agent id, reusing `agentIdBySessionToken`. No new id space.
- [ ] `status` handler takes params and filters rows through wave 2 before answering.
- [ ] Event push stream filtered by the same policy, daemon-side.
- [ ] Tests: two orchs registered, each hears only its own subscriptions; a human claim hears
      everything; an unresolvable claim is treated as a human at a shell, never as a lockout.

### Wave 4 — the clients

- [ ] `status.ts`: rows arrive scoped. The offline branch calls the wave 2 policy locally. Same rule,
      second call site, not a second rule.
- [ ] `events.ts`: delete `eventInMineScope`, `eventInScope`, `--mine`, `--any-agent`, and
      `EventScopeInput`.
- [ ] Subscribe / unsubscribe / list verbs.
- [ ] `help.ts` and `commands/index.ts` usage lines.

### Wave 5 — the five defects

Separate from the subscription table. U9 (space drops a spaceless fleet) comes FIRST, before any
scoped default ships.

- [ ] U9: a missing space stops acting as a filter that matches nothing.
- [ ] `reset` keeps the current model pin, or says loudly that it reverted.
- [ ] Dispatch delivery emitted as a transition on the event stream.
- [ ] A way to ask orch whether this session already has a monitor armed, answered by the daemon that
      holds the connection, not by `pgrep`.
- [ ] Replay: find out whether empty history is a bug or normal, then fix the code or the doctrine.
- [ ] Delete every verify-it-worked line the fixes make obsolete.

### Wave 6 — docs and gate

- [ ] `skills/orch/SKILL.md`: the default is immediate family, how to subscribe wider, and that
      `orch status` from an agent shows its own fleet.
- [ ] `bun check` clean over the whole tree.
- [ ] `bun test` on: `close-authority`, `commands-status`, `commands-events`, `daemon-events`,
      `owner-scoping`, `events-scope-notice`, plus the new subscription tests.
- [ ] Delete this file.

## Not in scope

The rest of `scratch.md`: reset re-pinning the model, `--file`/stdin dispatch, `redispatch`, the pack
cap in the skill, the leftover `--name` flag. Separate work.
