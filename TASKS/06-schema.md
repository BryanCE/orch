# The schema

The authoritative DDL. Reasoning is in `04-db-thinking.md`; the outside practice it was checked
against is in `05-db-research.md`; the entity model it serves is `01-agent-model.md`.

**Shape:** a **5NF** entity-relationship core — no table here has a join dependency left to
remove — with the Data Vault hub-and-satellite pattern applied only to facts that genuinely need
history. Telemetry is not in the database at all.

**Where it goes past 5NF, and why it stops there.** 6NF — a key plus at most one attribute — is
what warehouses use, and its selling point is adding an attribute without touching a table. Rule
8 gives orch the opposite deal: one live shape, old data reaped, a column as cheap as a table.
So 6NF is taken **only where the split deletes a constraint**: `agent_endings`,
`agent_worktrees` and `task_cancellations` exist because a row that is either there or not says
"ended", "is a worktree", "cancelled" without a `CHECK` keeping two nullable columns in step.
Everything else stays 5NF, where the attributes in a row share one timeline because they
describe one event — a process instance, a lease, a claim.

---

## Conventions, stated once and obeyed everywhere

| rule | why |
|---|---|
| Validity is the **half-open interval** `[since, until)`; `until IS NULL` is open | adjacent rows meet exactly — no gap, no shared instant, and the convention survives a change of granularity |
| Instants are `INTEGER` epoch **milliseconds** | the dominant operation is arithmetic, not display; 8 bytes, native sort, no timezone can be wrong |
| Every column declares `NULL` or `NOT NULL` explicitly | never rely on the implicit default in a `STRICT` table |
| `STRICT` on every table | declared types enforced, not advisory |
| `WITHOUT ROWID` where the primary key *is* the access path and rows are small | removes a redundant B-tree and clusters by the key actually queried |
| A fact **every** row has is a column; a fact **only some** have is its own table; a fact that **changes** is a satellite with `since`/`until` | this is the whole placement rule. It is why `cwd` is a column, `agent_worktrees` and `agent_endings` are tables, and `agent_spaces` has a timeline |
| Absence is `NULL` and never a sentinel | `"local"` as a workspace value is why this is written down |
| A nullable instant beats a boolean | `until` says *when*, not merely *whether* |
| Extensible sets are lookup tables; closed sets are `TEXT` + `CHECK` | adding a harness is data; adding a release reason is a model change |

---

## DDL

```sql
PRAGMA foreign_keys = ON;   -- without this every REFERENCES clause is a comment

-- ══ lookup tables ═══════════════════════════════════════════════════════════
-- Extensible sets. Adding one is an INSERT plus a provider registration, never
-- a migration and never an edit to a consumer.

CREATE TABLE harnesses (              -- what runs an agent
  id          TEXT    NOT NULL PRIMARY KEY,   -- pi | claude | codex | omp | the next one
  name        TEXT    NOT NULL,
  enabled_at  INTEGER NULL
) STRICT, WITHOUT ROWID;

CREATE TABLE plexers (                -- the interaction layer an agent is shown in
  id          TEXT    NOT NULL PRIMARY KEY,   -- herdr | tmux | headless | the next one
  name        TEXT    NOT NULL,
  enabled_at  INTEGER NULL
) STRICT, WITHOUT ROWID;

CREATE TABLE hosts (                  -- a machine an agent can run on
  id          TEXT    NOT NULL PRIMARY KEY,
  name        TEXT    NOT NULL,
  os          TEXT    NOT NULL CHECK (os IN ('linux','windows','darwin')),
  created_at  INTEGER NOT NULL
) STRICT, WITHOUT ROWID;

CREATE TABLE host_plexers (           -- which plexer is installed where, and at what release
  host_id    TEXT    NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  plexer_id  TEXT    NOT NULL REFERENCES plexers(id),
  since      INTEGER NOT NULL,
  until      INTEGER NULL,                             -- closed when the install changes version
  version    TEXT    NOT NULL,
  PRIMARY KEY (host_id, plexer_id, since),
  CHECK (until IS NULL OR until > since)
) STRICT, WITHOUT ROWID;

-- ══ spaces ══════════════════════════════════════════════════════════════════

CREATE TABLE spaces (                 -- orch's grouping of work, and the comms boundary
  id          TEXT    NOT NULL PRIMARY KEY,
  name        TEXT    NOT NULL,               -- NOT unique: a name is for humans (C4c)
  created_by  TEXT    NULL REFERENCES agents(id),  -- provenance. NOBODY OWNS A SPACE.
  created_at  INTEGER NOT NULL
) STRICT, WITHOUT ROWID;

-- ══ the hub: identity, and only what cannot vary ════════════════════════════

CREATE TABLE agents (
  id            TEXT    NOT NULL PRIMARY KEY,
  spawned_by    TEXT    NULL     REFERENCES agents(id),    -- IMMUTABLE. NULL = nothing spawned it
  root_agent_id TEXT    NOT NULL REFERENCES agents(id),    -- the pack. Immutable function of
                                                           -- immutable inputs, so it cannot drift.
  harness_id    TEXT    NOT NULL REFERENCES harnesses(id), -- constitutive: never changes
  cwd           TEXT    NOT NULL,                          -- where it runs. Fixed at birth: only a
                                                           -- process can chdir itself, and no agent
                                                           -- harness does.
  name          TEXT    NOT NULL,                          -- NOT unique (C4c)
  label         TEXT    NULL,
  created_at    INTEGER NOT NULL,
  CHECK (spawned_by IS NULL OR spawned_by <> id),
  CHECK (spawned_by IS NOT NULL OR root_agent_id = id)     -- no spawner ⇒ it is its own root
) STRICT, WITHOUT ROWID;

CREATE TABLE agent_worktrees (        -- an agent working in a git worktree. NO ROW = the repo itself.
  agent_id  TEXT    NOT NULL PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  path      TEXT    NOT NULL,
  branch    TEXT    NOT NULL                           -- a worktree always has one
) STRICT, WITHOUT ROWID;

CREATE TABLE agent_endings (          -- an agent that ended. NO ROW = still alive.
  agent_id  TEXT    NOT NULL PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  ended_at  INTEGER NOT NULL,
  closed_by TEXT    NULL REFERENCES agents(id)         -- who asked. NULL = nobody did, so it died —
                                                       -- the clean/crash answer, and no harness is
                                                       -- consulted for it (D13)
) STRICT, WITHOUT ROWID;

-- ══ satellites ══════════════════════════════════════════════════════════════
-- One per INDEPENDENTLY-VARYING fact. The test for "independently" is whether an
-- operation exists that changes it and leaves its neighbours untouched.
--
-- Key is (agent_id, since): the natural key. No surrogate, because nothing ever
-- looks one up by a surrogate. WITHOUT ROWID then clusters an agent's whole
-- history contiguously, which is exactly how these are read.

CREATE TABLE agent_processes (        -- one row per process INSTANCE; a restart is a new row
  agent_id    TEXT    NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  since       INTEGER NOT NULL,
  until       INTEGER NULL,
  host_id     TEXT    NOT NULL REFERENCES hosts(id),   -- a process is bound to its machine
  pid         INTEGER NOT NULL,
  start_token TEXT    NULL,                            -- opaque; equality only, never parsed
  PRIMARY KEY (agent_id, since),
  CHECK (until IS NULL OR until > since)
) STRICT, WITHOUT ROWID;

CREATE TABLE agent_plexers (          -- an agent shown in an interaction layer. NO ROW = headless.
  agent_id  TEXT    NOT NULL PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  plexer_id TEXT    NOT NULL REFERENCES plexers(id)    -- immutable: a live pty is not re-parented
) STRICT, WITHOUT ROWID;

CREATE TABLE agent_handles (          -- the plexer's own coordinate for it, which it renumbers
  agent_id  TEXT    NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  since     INTEGER NOT NULL,
  until     INTEGER NULL,
  handle    TEXT    NOT NULL,                          -- opaque; handed back, never parsed or shown
  PRIMARY KEY (agent_id, since),
  CHECK (until IS NULL OR until > since)
) STRICT, WITHOUT ROWID;

CREATE TABLE agent_spaces (           -- which grouping of work it belongs to
  agent_id  TEXT    NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  since     INTEGER NOT NULL,
  until     INTEGER NULL,
  space_id  TEXT    NOT NULL REFERENCES spaces(id),
  PRIMARY KEY (agent_id, since),
  CHECK (until IS NULL OR until > since)
) STRICT, WITHOUT ROWID;

CREATE TABLE agent_tunings (          -- how it is configured. NOT where it is.
  agent_id  TEXT    NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  since     INTEGER NOT NULL,
  until     INTEGER NULL,
  model     TEXT    NOT NULL,
  thinking  TEXT    NULL,                              -- meaningless without the model it qualifies
  PRIMARY KEY (agent_id, since),
  CHECK (until IS NULL OR until > since)
) STRICT, WITHOUT ROWID;

-- ══ leases ══════════════════════════════════════════════════════════════════
-- The ONE table that keeps a surrogate key, because that key is load-bearing:
-- it is the FENCING TOKEN. It must be monotonic across ALL agents so a woken
-- zombie orch presenting a stale lease id is rejected. A composite key cannot
-- do that, so this table keeps its rowid.

CREATE TABLE agent_leases (
  id             INTEGER NOT NULL PRIMARY KEY,         -- monotonic fencing token
  agent_id       TEXT    NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  orch_id        TEXT    NOT NULL REFERENCES agents(id),   -- the orch that may drive it
  since          INTEGER NOT NULL,
  until          INTEGER NULL,
  release_reason TEXT    NULL CHECK (release_reason IN ('released','handoff','adopted','expired')),
  CHECK (until IS NULL OR until > since),
  CHECK ((until IS NULL) = (release_reason IS NULL)),  -- closed IFF it says why
  CHECK (orch_id <> agent_id)                          -- nothing leases itself
) STRICT;

-- ══ environments of things that are not agents ══════════════════════════════
-- E11: everything has an environment. A space or a pack can be given a home of
-- its own inside a plexer (E8). The grouping is ORCH's and the name is ORCH's;
-- the plexer only renders it, using whatever it groups by internally — so what
-- is stored here is the coordinate to hand back, never a word orch says out
-- loud. There is no orch noun for "workspace"/"session" and there must not be
-- one: the thing being grouped is already called a space or a pack (E10).
--
-- A pack is its root agent, so a pack's home keys on an agent id. Not a
-- satellite of `agents`: it describes the PACK, and only the root has one.

CREATE TABLE space_plexers (
  space_id  TEXT    NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  since     INTEGER NOT NULL,
  until     INTEGER NULL,
  plexer_id TEXT    NOT NULL REFERENCES plexers(id),
  handle    TEXT    NOT NULL,                          -- opaque; equality only, never parsed
  PRIMARY KEY (space_id, since),
  CHECK (until IS NULL OR until > since)
) STRICT, WITHOUT ROWID;

CREATE TABLE pack_plexers (
  pack_id   TEXT    NOT NULL REFERENCES agents(id) ON DELETE CASCADE,  -- the root agent
  since     INTEGER NOT NULL,
  until     INTEGER NULL,
  plexer_id TEXT    NOT NULL REFERENCES plexers(id),
  handle    TEXT    NOT NULL,
  PRIMARY KEY (pack_id, since),
  CHECK (until IS NULL OR until > since)
) STRICT, WITHOUT ROWID;

-- ══ the queue ═══════════════════════════════════════════════════════════════
-- A task is a hub; every claim is an attempt row. `retries`, `last_error` and
-- `agent_key` are gone because all three were the newest attempt flattened onto
-- the task and then overwritten.

CREATE TABLE tasks (
  id             TEXT    NOT NULL PRIMARY KEY,
  text           TEXT    NOT NULL,                        -- editable by the enqueuer while unclaimed
  opts           TEXT    NOT NULL,                        -- JSON: the harness's own arguments
  enqueued_by    TEXT    NOT NULL REFERENCES agents(id),  -- results come back HERE, not to the runner (Cq4)
  scope_agent_id TEXT    NULL REFERENCES agents(id),      -- exactly one scope, chosen at enqueue (Cq2)
  scope_pack_id  TEXT    NULL REFERENCES agents(id),      -- a pack is its root agent
  scope_space_id TEXT    NULL REFERENCES spaces(id),
  created_at     INTEGER NOT NULL,
  CHECK ((scope_agent_id IS NOT NULL)
       + (scope_pack_id  IS NOT NULL)
       + (scope_space_id IS NOT NULL) = 1)                -- unscoped and multi-scoped are both malformed
) STRICT, WITHOUT ROWID;

CREATE TABLE task_cancellations (     -- a cancelled task. NO ROW = not cancelled.
  task_id      TEXT    NOT NULL PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  cancelled_at INTEGER NOT NULL,
  cancelled_by TEXT    NOT NULL REFERENCES agents(id)   -- a cancellation always says by whom (Cq9)
) STRICT, WITHOUT ROWID;

CREATE TABLE task_attempts (          -- one row per claim; a retry is a NEW row
  task_id     TEXT    NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  since       INTEGER NOT NULL,
  until       INTEGER NULL,
  agent_id    TEXT    NOT NULL REFERENCES agents(id),   -- who claimed it THIS time (Cq6)
  dispatch_id TEXT    NOT NULL,
  outcome     TEXT    NULL CHECK (outcome IN ('done','failed')),
  result      TEXT    NULL,
  error       TEXT    NULL,
  PRIMARY KEY (task_id, since),
  CHECK (until IS NULL OR until > since),
  CHECK ((until IS NULL) = (outcome IS NULL)),          -- settled IFF it says how
  CHECK (outcome <> 'failed' OR error  IS NOT NULL),    -- a failure states why
  CHECK (outcome =  'done'   OR result IS NULL)         -- only a success carries a result
) STRICT, WITHOUT ROWID;

CREATE TABLE pack_intakes (           -- the consuming half of space scope (Cq3)
  pack_id   TEXT    NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  space_id  TEXT    NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  since     INTEGER NOT NULL,
  until     INTEGER NULL,
  PRIMARY KEY (pack_id, space_id, since),
  CHECK (until IS NULL OR until > since)
) STRICT, WITHOUT ROWID;

-- ══ "at most one current X" is a database fact, not application logic ════════

CREATE UNIQUE INDEX one_install      ON host_plexers(host_id, plexer_id) WHERE until IS NULL;
CREATE UNIQUE INDEX one_live_process ON agent_processes(agent_id)   WHERE until IS NULL;
CREATE UNIQUE INDEX one_handle       ON agent_handles(agent_id)     WHERE until IS NULL;
CREATE UNIQUE INDEX one_space        ON agent_spaces(agent_id)      WHERE until IS NULL;
CREATE UNIQUE INDEX one_tuning       ON agent_tunings(agent_id)     WHERE until IS NULL;
CREATE UNIQUE INDEX one_lease        ON agent_leases(agent_id)      WHERE until IS NULL;
CREATE UNIQUE INDEX one_space_home   ON space_plexers(space_id)     WHERE until IS NULL;
CREATE UNIQUE INDEX one_pack_home    ON pack_plexers(pack_id)       WHERE until IS NULL;
CREATE UNIQUE INDEX one_intake       ON pack_intakes(pack_id, space_id) WHERE until IS NULL;

-- The claim itself. Two racing claimants collide on this index and one loses —
-- an INSERT guarded by a unique index, not an UPDATE ... WHERE that can silently
-- admit a second winner.
CREATE UNIQUE INDEX one_open_attempt ON task_attempts(task_id)      WHERE until IS NULL;

-- ══ the access paths that are not the primary key ═══════════════════════════

-- Ending and cancelling are their own tables, so "live" is an anti-join rather
-- than a predicate, and these indexes cover the whole set. The anti-join is
-- against a primary key on a table holding only the ended ones.
CREATE INDEX agents_by_pack    ON agents(root_agent_id);
CREATE INDEX agents_by_spawner ON agents(spawned_by);
CREATE INDEX leases_by_orch    ON agent_leases(orch_id) WHERE until IS NULL;

CREATE INDEX tasks_by_agent    ON tasks(scope_agent_id);
CREATE INDEX tasks_by_pack     ON tasks(scope_pack_id);
CREATE INDEX tasks_by_space    ON tasks(scope_space_id);
CREATE INDEX tasks_by_enqueuer ON tasks(enqueued_by);
CREATE INDEX attempts_running  ON task_attempts(agent_id) WHERE until IS NULL;

-- ══ task state is DERIVED — there is one definition of it and this is it ═════
-- No `state` column: a stored one is a second truth that drifts from the
-- attempts it summarises. 'failed' means the newest attempt failed; whether it
-- is retried is policy (`queue.max_retries`), and a retry is the next attempt.

CREATE VIEW task_states AS
SELECT t.id AS task_id,
       CASE
         WHEN c.task_id IS NOT NULL THEN 'cancelled'
         WHEN a.task_id IS NULL     THEN 'queued'
         WHEN a.until   IS NULL     THEN 'claimed'
         ELSE a.outcome
       END AS state
FROM tasks t
LEFT JOIN task_cancellations c ON c.task_id = t.id
LEFT JOIN task_attempts a
       ON a.task_id = t.id
      AND a.since = (SELECT MAX(since) FROM task_attempts WHERE task_id = t.id);

-- ══ no overlapping history ══════════════════════════════════════════════════
-- The partial unique indexes above forbid two OPEN intervals. They do not forbid
-- two CLOSED intervals overlapping. SQLite has no exclusion constraint, so the
-- enforcement is a trigger — NOT application code, which races between its check
-- and its insert. One per satellite, identical but for the table name.

CREATE TRIGGER agent_handles_no_overlap
BEFORE INSERT ON agent_handles
BEGIN
  SELECT RAISE(ABORT, 'overlapping interval')
  WHERE EXISTS (
    SELECT 1 FROM agent_handles
    WHERE agent_id = NEW.agent_id
      AND NEW.since < COALESCE(until, 9223372036854775807)
      AND COALESCE(NEW.until, 9223372036854775807) > since
  );
END;

-- …and the same trigger for agent_processes, agent_spaces, agent_tunings,
-- agent_leases, space_plexers, pack_plexers, host_plexers, task_attempts, and
-- pack_intakes — keyed on (host_id, plexer_id), task_id and (pack_id, space_id)
-- respectively.
```

---

## Why each table is where it is

**`agents` holds only what cannot vary.** `id`, `spawned_by`, `root_agent_id`, `harness_id`,
`cwd` are immutable; `name` and `label` are mutable but need no history,
because no code ever reads a name — an id is what references and logs carry.

**`cwd` is on the hub because a running agent cannot change it, and every agent has one.** Only
a process can `chdir` itself and no harness does; nothing outside it can. Granting read access
to another path is not a move. So there is no second directory row for any agent, ever — and a
satellite whose history is always one row is a join answering a question nobody can ask.

**A plexer placement and its coordinate are two facts, not one.** Which plexer an agent is in
never changes — a live pty is not re-parented into another multiplexer — and only some agents
are in one at all, so `agent_plexers` is a row that exists or does not, with no interval. The
coordinate does change: herdr renumbers a pane when it moves workspace (Eh7), so `agent_handles`
carries the timeline. Welded together, every renumber wrote a new row restating a plexer that
had not changed, and `plexer_id` looked like something that could vary.

**`tab_label` is deleted.** It is the plexer's own display string on its own timeline, and E10
says orch never speaks a plexer's word — so it was a column orch had to store, keep current, and
never show. That is the `wF` mistake with a longer name.

**`agent_worktrees` is a table because only some agents have one.** Kept on the hub it would be
two nullable columns plus a `CHECK` tying them together; as a table, a worktree agent has a row
and a repo agent does not, and "a worktree always has a branch" is `NOT NULL` rather than a rule
someone has to remember.

**`harness_id` is on the hub, not a satellite.** No operation changes an agent's harness; a
different harness is a different agent. Putting an immutable fact in a satellite invites
"which is it on *now*", implying an answer that could differ from what it was created with.

**`model`/`thinking` are a satellite, and not part of environment.** They are configuration, not
location, and they churn faster than anything that surrounds the agent. Filing them under "where
it is" would make that phrase mean "everything else" — the failure that produced `workspace`.

**`host_id` is on the process, not on an environment axis.** A process is inherently bound to the
machine it runs on, and a headless agent has no plexer but certainly has a host.

**The plexer's version is on the host, not on the agent.** One herdr install serves every agent
in it, so a copy per agent is the same fact written N times — and the copies go stale the moment
it is upgraded, which is what made "is what's possible stored or derived?" look like a real
question. With the version where the install is, what an agent can do is a function of what is
there now, and there is nothing to keep in sync.

**`root_agent_id` is the one materialized value.** A cache can only drift if an input can change;
`spawned_by` is immutable, so the root is immutable, so no update path exists that could make it
wrong. It turns every pack query — the most common scoping query in the system — into an indexed
equality test instead of a recursive walk. The standard objection to materialized paths is
re-parenting cost, and re-parenting is impossible here by invariant.

**`agent_leases` keeps its surrogate key** because that key is the fencing token and must be
monotonic across all agents. Every other satellite drops its surrogate for the natural
`(agent_id, since)`, since nothing ever looked one up by a surrogate.

**`agent_endings` answers "clean or crash" without asking a harness.** The question was whether
any harness can reliably signal a clean exit. It does not need to: orch already knows whether
*it* asked. The row exists only for an agent that ended, and `closed_by` on it says who asked —
NULL means nobody did, so it died. Both facts are orch's own, so the answer never depends on
harness cooperation, and "a close is never recorded without an ending" is structural rather than
a `CHECK`. Live agents are the ones with no row here.

**The queue is a hub with attempt satellites, for the same reason agents are.** A task's
immutable facts are its text, its options, its enqueuer and its scope. A *claim* is not a fact
about the task — it is an event, it happens more than once, and each one has its own agent, its
own dispatch, its own ending. Flattening the newest one onto the task is what produced Cq6:
`agent_key` stamped at first claim and kept through every requeue, pinning a pack-scoped retry
to an agent that may be dead. With the binding on the attempt, a pack-scoped retry lands
anywhere in the pack because there is nothing left to re-pin — the bug is unrepresentable
rather than fixed.

**Scope is three nullable references and a CHECK, not `(kind, id)`.** A polymorphic pair cannot
carry a foreign key, so a task could name a pack that never existed. Three typed columns with
`exactly one non-null` keep every scope pointing at a real row and keep each one indexable on
its own — and `scope_pack_id` referencing `agents(id)` is exact, because a pack *is* its root
agent (A10).

**`pack_intakes` is the second half of space scope.** Publishing into a space is one side;
Cq3 requires the consuming pack to opt in, and an opt-in that is not stored is not an opt-in.
Without this table, "space" is Cq8 with a nicer name.

**`space_plexers` / `pack_plexers` are not agent satellites.** They describe a space's or a
pack's home in a plexer, and only the root agent has the pack's. Keeping them off `agents`
is what stops "the pack's home" and "the root agent's pane" from becoming the same column.

---

## What is deliberately absent

| absent | why |
|---|---|
| a `lifetime` column | it answered "does the work survive its spawner?", and the answer is permanently yes |
| an `orphaned_at` column | denormalized state; an expired lease is `until` + `release_reason = 'expired'` |
| a `packs` table | a pack is the provenance root — a query, not a row. A table would be a second truth that can disagree |
| a `subjects` supertype | agents are the only owner today. When a second one appears, `subjects(id, kind)` referenced by `agents.id` and `spaces.id` is the move, with satellites re-keyed to `subject_id` |
| an EAV `facts` table | takes any future axis for free and costs every type and every foreign key — it trades the database's ability to say *no* |
| transaction time (bitemporal) | orchd is the single writer and records as it observes, so valid and transaction time coincide. Revisit only if a second writer appears |
| telemetry | `state`, `task`, `cost`, `tokens`, `context`, `turns` — the agent's churning claim about itself. `status.json` is its home |
| `queue.retries` | a counter that has thrown away what it counted. It is `COUNT(*)` over attempts, and cannot disagree with them |
| `queue.last_error` | the newest attempt's `error`. Storing it twice loses every earlier one |
| `queue.agent_key` | the binding belongs to the attempt, not the task. On the task it survives requeue and re-pins a retry to a dead agent (Cq6) |
| `queue.state` | derived by `task_states`. A stored state is a second truth that drifts from the attempts it summarises |
| `queue.origin_workspace` | replaced by scope (Cq7). It was a plexer coordinate doing a routing job |
| an `idle_since` column | idleness is the absence of an open lease and an open attempt, and both already record when they closed. A column would be a third place to get it wrong |
| a plexer-neutral noun for "workspace" | E10 asked for one. The grouping is already called a **space** or a **pack**; what the plexer groups by is a coordinate orch hands back, and naming a coordinate is how `wF` got printed as a name |

---

## Retention adds no columns — it reads the clocks the model already keeps

Every instant retention needs is already recorded, so the policy is settings plus a sweep, and
the schema is untouched. That is the test it had to pass: a retention rule needing a new column
would mean the model was not recording when things happened.

| question | the clock that answers it |
|---|---|
| when did it stop being held? | newest `agent_leases.until` |
| when did it stop working? | newest `task_attempts.until` for that agent |
| when did it go idle? | the later of those two, or `agents.created_at` if it never had either. Shown to the user; never a trigger |
| when did its process end? | `agent_processes.until` |
| when did the agent end? | `agent_endings.ended_at` |

**Idle is derived, never stored:** no open lease *and* no open attempt. Both are already partial
unique indexes, so both are one indexed lookup.

### The policy

**Every window is the user's to set, in `settings.json`.** Not one of these numbers is a
constant in the source. The values below are *defaults* — what orch uses when the user has said
nothing — and each one is overridable on its own, without touching the others.

A retention window is a statement about how long the user wants their own work kept around.
Deciding that for them, in code they cannot see or change, is the same mistake as orch naming
things for them.

| window | what it does | default |
|---|---|---|
| `retention.ended_agents_days` | **the long fallback.** An ended agent's row, satellites and presence directory go this long after `agent_endings.ended_at`, provenance tree permitting (H3). A backstop so the store cannot grow forever, not a cleanup policy. Deleting a record is normally something the user does | `90` |
| `retention.queue_days` | **settled** tasks and their attempts are deleted this long after the last attempt closed | `14` |
| `retention.events_days` | stored events | `7` |
| `retention.runs_days` | completed runs | `30` |
| `retention.outbox_days` | delivered outbox messages | `7` |
| `retention.logs_days` | headless log files | `7` |

Two rules the sweep may never break:

- **Nothing alive is ever ended by the sweep** (D11). With no `agent_endings` row, retention does
  not touch it. Unheld and idle is a normal state, not a leak. Two things close an agent: the user,
  or the orch that spawned it. The sweep is neither, and no window makes it one.
- **A queued task is never deleted on age** (Cq10, Cq11). Only *settled* tasks age out.
  Unrunnable is surfaced and reaped deliberately, because a new orch changes who is alive.

### Naming

Every window is `<what it reaps>_days`. `ended_agents_days` follows it and names what it
deletes. A retention key names a *thing kept*, never an action taken.

The clock is `agent_endings.ended_at`, a fact orch recorded. Never a file's timestamp, which is the
filesystem's opinion about when something was last touched standing in for when an agent died.

**Idle is still derived and still displayed** — it is how you tell a working fleet from an
abandoned one at a glance. It just never triggers anything.

## Open

Nothing in the schema. Two items sit outside it:

- **`queue.max_retries` is policy, not model** — the view reports `failed`; how many attempts
  a task gets before it stays that way belongs in `settings.json` next to the pack cap.
- **`D10` lock-delay** — the cooldown after lease expiry is designed as a rule but has no
  number and no home yet.
