# The agent model — fundamentals

Nothing here is inherited from the current code. Every choice is made for its purpose and
justified. Where the existing store does something different, the existing store is wrong.

---

## 1. The axiom

**An orchestrator is an agent. A worker is an agent. A Claude session driving orch is an
agent.** One entity, pointing at itself twice — once for who spawned it, once for who holds
it.

There is no other way to track identity. The moment a spawner is a different *kind* of thing
from a spawnee, you need a second id space, a second liveness mechanism, a second naming
scheme, and a join to answer the only question that matters: *who is responsible for this?*

**orch owns every agent.** An environment — herdr, tmux, headless, whatever comes next — is
**where an agent is currently running**. Recorded, queryable, displayed. Never identity.

## 2. Four facts, never welded together

| fact | mutable | lives in |
|---|---|---|
| **Identity** — the minted id, and nothing else in it | never | `agents.id` |
| **Provenance** — who spawned it | never | `agents.spawned_by` |
| **Ownership** — who holds it now | yes | `agent_leases` |
| **Placement** — where it runs | yes | `agent_placements` |

Anything encoded into an identity can never change without breaking every reference to it.
That is precisely why identity holds nothing but the minted id.

**The bug this prevents, live on disk today:**

```
headless~local~7x5hd4h610     "local" is a missing value wearing a name
herdr~wF~0uh7scyzxh           "wF" is herdr's own id, displayed as if you chose it
```

Three facts welded into one key, two of them lies. `backend` and `workspace` become columns.

---

## 3. Data types, chosen from purpose

### Identifiers → `TEXT`

An agent id is minted, opaque, and never parsed. It is **typed by a human** (`orch dispatch
trmcsf8ifc`), grepped in logs, and used as a presence directory name.

- Not a UUID: 36 characters you cannot type. A 10-character base36 id is typeable and still
  collision-free at this scale.
- Not an INTEGER surrogate key with a TEXT unique alongside it. Two identifiers for one thing
  is how one leaks into a place the other belongs. At hundreds of agents the join cost is
  irrelevant; the confusion cost is not.

### Instants → `INTEGER` epoch milliseconds

The dominant operation on every timestamp in this system is **arithmetic**, not display:
grace expiry, retention age, lease age, uptime.

- TEXT forces a parse per row, or a string comparison that orders but cannot subtract.
- 8 bytes against 24. Native sort. No timezone can ever be wrong.
- Format at the edge, where rendering already happens.

### Durations → `INTEGER` milliseconds

Same unit as instants, so `now - since` is directly comparable to a configured window with no
conversion anywhere.

### Process id → `INTEGER`. Start token → `TEXT`

`start_token` is an opaque platform string — Linux clock ticks, Windows `.NET` ticks, a
`ps lstart` date. Compared for equality, never parsed, never ordered.

### Extensible sets → a lookup table. Closed sets → `TEXT` with `CHECK`.

**Harnesses and plexers are rows**, in `harnesses` and `plexers`. They are meant to grow —
adding one is data plus a provider registration, never a schema change and never an edit to a
consumer. A `CHECK` list would make every new harness a migration.

`release_reason` stays `TEXT` with `CHECK`: it is a closed set that only changes when the
lifecycle model itself changes, so the constraint belongs in the schema where it is visible.

Integer codes for either would be premature and unreadable in a dump.

### Booleans → `INTEGER NOT NULL CHECK (x IN (0,1))`

SQLite has no boolean type. Use a real one where the fact is genuinely two-state and a
timestamp would be meaningless.

But check first whether the thing is actually an *event*. Every flag this design reached for
turned out to be one — `ended_at`, `until`, `released_at` — and a nullable instant carries
strictly more information for the same cost: not just *whether*, but *when*. `is_closed` is
worse than `ended_at` in every way.

### Absence → `NULL`, and nothing else

`NULL` means *not applicable*. Never a sentinel string. `"local"` is the entire reason this
rule is written down.

---

## 4. The schema

```sql
PRAGMA foreign_keys = ON;   -- SQLite ignores every REFERENCES clause without this

CREATE TABLE spaces (                          -- a user's grouping of work. Not a path.
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL UNIQUE,
  created_by  TEXT             REFERENCES agents(id),   -- provenance. Nobody OWNS a space.
  created_at  INTEGER NOT NULL
) STRICT;

CREATE TABLE harnesses (                       -- what runs an agent. Data, not a CHECK list.
  id          TEXT    PRIMARY KEY,             -- pi | claude | codex | omp | the next one
  name        TEXT    NOT NULL,
  enabled_at  INTEGER
) STRICT;

CREATE TABLE plexers (                         -- where an agent is placed. Data, not a CHECK list.
  id          TEXT    PRIMARY KEY,             -- herdr | tmux | headless | the next one
  name        TEXT    NOT NULL,
  enabled_at  INTEGER
) STRICT;

CREATE TABLE agents (                          -- identity, and what is genuinely 1:1 with it
  id           TEXT    PRIMARY KEY,
  space_id     TEXT             REFERENCES spaces(id),   -- optional; an agent may have none
  spawned_by   TEXT             REFERENCES agents(id),   -- IMMUTABLE. NULL = nothing spawned it
  harness_id   TEXT    NOT NULL REFERENCES harnesses(id),
  name         TEXT    NOT NULL,
  label        TEXT,
  model        TEXT,
  thinking     TEXT,
  created_at   INTEGER NOT NULL,
  ended_at     INTEGER                                   -- set on close; row survives for history
) STRICT;

CREATE TABLE agent_processes (                 -- one row per process INSTANCE; restart = new row
  id          INTEGER PRIMARY KEY,
  agent_id    TEXT    NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  pid         INTEGER NOT NULL,
  start_token TEXT,
  started_at  INTEGER NOT NULL,
  ended_at    INTEGER
) STRICT;

CREATE TABLE agent_placements (                -- one row per placement; move = new row
  id        INTEGER PRIMARY KEY,
  agent_id  TEXT    NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  plexer_id TEXT    NOT NULL REFERENCES plexers(id),
  handle    TEXT,
  tab_label TEXT,
  cwd       TEXT    NOT NULL,
  worktree  TEXT,
  branch    TEXT,
  since     INTEGER NOT NULL,
  until     INTEGER
) STRICT;

CREATE TABLE agent_leases (                    -- one row per holding
  id             INTEGER PRIMARY KEY,
  agent_id       TEXT    NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  holder_id      TEXT    NOT NULL REFERENCES agents(id),
  acquired_at    INTEGER NOT NULL,
  released_at    INTEGER,
  release_reason TEXT CHECK (release_reason IN ('released','handoff','adopted','expired'))
) STRICT;

-- "At most one current X" is a database fact, not application logic.
CREATE UNIQUE INDEX one_live_process ON agent_processes(agent_id)  WHERE ended_at IS NULL;
CREATE UNIQUE INDEX one_placement    ON agent_placements(agent_id) WHERE until IS NULL;
CREATE UNIQUE INDEX one_lease        ON agent_leases(agent_id)     WHERE released_at IS NULL;
```

`STRICT` makes declared types enforced instead of advisory — Rule 8 says one live shape, and
this is the database enforcing it rather than trusting every writer.

`ON DELETE CASCADE` reaches only the child tables. `agents.spawned_by` deliberately has no
cascade: reaping an agent that still has descendants is **refused**, forcing a reap to walk
the tree instead of silently destroying provenance.

## 5. Why each split exists

- **Placement** — the columns go NULL *as a group*: a session has no placement at all, and
  gets no row rather than seven NULLs. Agents also move, and a move is a new row.
- **Processes** — `orch restart` yields a new pid and start token while identity is unchanged.
  A different entity's lifecycle wearing the same id.
- **Leases** — ownership is a relationship with its own attributes. **Handoff and adoption are
  inserts, not overwrites**, so *why is this mine now?* is answerable. A mutable `held_by`
  column cannot deliver that.

`name`, `label`, `model`, `adapter` stay on `agents`: genuinely 1:1, no repeating group, no
transitive dependency. Splitting those is over-normalizing.

**There is no `lifetime` column.** Owned-vs-detached answered one question — *does the work
survive its spawner?* — and that answer is permanently yes. See `NOTES.md`.

**There is no `orphaned_at` column.** It was denormalized state. An expired lease is
`released_at` with `release_reason = 'expired'`, and the grace window runs from there.

## 6. The composed object

One object at the call site, five tables underneath.

```ts
interface Agent {
  id: string;
  name: string;
  space: Space | null;               // optional grouping
  spawnedBy: string | null;          // provenance, immutable
  process: AgentProcess | null;      // ended_at IS NULL
  placement: AgentPlacement | null;  // until IS NULL — null when it runs nowhere
  lease: AgentLease | null;          // released_at IS NULL — null when unheld
}
```

`agent.placement === null` is honest. `agent.lease === null` means unheld. Neither is a
sentinel pretending to be data.

## 7. What stays out of the database

Telemetry — `state`, `task`, `dispatchId`, `lastText`, `currentFile`, `filesTouched`,
`tokens`, `cost`, `context`, `turns`, `asking`, `blockedMessage`, `sessionPath`.

That is the agent's claim **about itself**, it churns every few seconds, and `status.json` is
already its home and the basis of the whole bridge protocol. orchd merges the tables and the
presence files and serves one view, so the web reads exactly one source: **orchd**. Never
herdr, never a harness, never the filesystem directly.

## 8. The hierarchy

Every box is an agent. Indentation is provenance; "held by" is ownership.

```
space "website"                                   ← optional grouping, nothing owns it
  ├── agent 3f2a  "claude — client"               no spawner, no placement   ┐ pack
  │     ├── agent  api-1      herdr %255          held by 3f2a               │
  │     └── agent  api-2      herdr %256          held by 3f2a               ┘
  ├── agent 9c1b  "pi — server"                   no spawner, no placement   ┐ pack
  │     └── agent  parser-1   headless            held by 9c1b               ┘
  └── agent nightly-1         headless            UNHELD — still working
```

A **space** groups packs. It is optional, it is not a path, and it is the reachability
boundary: `3f2a` and `9c1b` may coordinate because they share a space. With no space set, the
boundary is the repo root.

A **pack** is an orch and the slaves it spawned. Nobody creates a pack — spawning creates it.

---

## 9. Liveness — one primitive

```
processInstanceMatches(pid, start_token)      src/process-identity.ts
```

Because a holder is just another agent row, this answers **"is this agent alive?"** and **"is
this holder still alive?"** with the same code and the same two columns. A recycled pid can
never pass for the agent orch recorded.

Recording `start_token` at spawn is what makes `close` real for a headless orphan. A pane
backend hides the gap because closing the pane happens to kill the process; headless has no
such accident.

## 10. Ownership

### Containment is not ownership

| | what it is | lifecycle meaning |
|---|---|---|
| **Containment** — space > pack > agent | a scope | none. Static structure. |
| **Ownership** — one agent holds another | a lease | yes. One holder, transferable. |

**Nobody owns a space.** Ownership means the owner's death affects the owned, and a space does
not die when an agent does. A space carries `created_by` as provenance and nothing more.

If an orch owned its space, it would hold authority over every *other* orch's agents in that
space — precisely what must never happen. Orchs in one space are peers.

Because containment is a tree, the UI gets both entry points for free: space-first (one
grouping, several packs, unheld agents listed at space level) and orch-first (your packs
across spaces). That is navigation, not modelling.

### Held or unheld

An agent is held by another agent, or held by nobody. **Unheld is normal, not a leak.**

You are not an owner, because you are not in the model. You reach the system through the CLI
and the web — two doors, one daemon — and neither carries an identity. An owner value meaning
"the human" is `"local"` all over again. No accounts, ever; same-uid is the whole trust
boundary. Your standing intent lives in `settings.json`; your live intent is a command.

### One driver at a time

**Two live orchestrators must never drive the same agent.** Interleaved dispatches and
conflicting steers are chaos. This is **mutual exclusion, not authorization**:

| command | gated | why |
|---|---|---|
| `dispatch` `steer` `model` `reset` | **yes** | driving. Two drivers interleaving is the chaos. |
| `abort` `close` `reap` | **no** | ending. Nothing to interleave with, and the human must always be able to stop a runaway agent from the CLI or the web. |

**Today's defect is that the gate has no liveness.** `ownership.owner` is a bare string with
no pid and no token, so a *dead* orchestrator's claim is indistinguishable from a live one and
blocks writes forever behind `--steal`. A dead holder is not a collision. The lease supplies
the liveness the gate is missing; `--steal` keeps its real job — taking an agent from a **live**
orchestrator.

### The lease

| operation | who asserts | row effect |
|---|---|---|
| **renew** | the holder, implicitly | none — `processInstanceMatches` on the holder |
| **release** | the holder | `released_at`, reason `released` |
| **handoff** | the holder | close current, insert new |
| **adoption** | a claimant | insert, reason `adopted` on the prior row |
| **expiry** | nobody | `released_at`, reason `expired` |

Expiry is not a transfer. Nothing moves and nobody receives it.

**A transfer must not disturb the agent** — it does not know, does not reset, does not
re-attach, does not lose context. If a handoff requires touching the agent, ownership is still
secretly welded to identity or placement.

### Provenance is not ownership

`spawned_by` is immutable; leases are a table. `orch events` currently scopes on `spawnedBy` —
adopt an orphaned fleet under a provenance-scoped watch and you see none of them. **Live views
group by lease; history groups by provenance.**

## 11. Lifetime

| | behaviour |
|---|---|
| `orch spawn` (default) | **owned** — fate-shares with the spawning agent |
| `orch spawn --detached` | **survives** it. **Requires a name.** Ends only by command or retention. |
| `orch detach <target>` | promote a live owned agent to detached |

**Work survives its spawner. Always.** There is no flag, no mode, and no decision at spawn
time. Spawn and walk away is not something you opt into; it is what happens.

### When a holder dies

The agent loses a **driver**, not its life.

1. **It finishes what it is doing.** The task runs to completion and writes its result.
2. **It receives no new work.** No dispatch, no steer, no queue assignment — there is nobody
   left to read a result or correct course.
3. **The lease closes** `expired`. The agent is now unheld.
4. **Unheld and idle, it stays alive and adoptable.** It costs a pane and some memory, not
   tokens.
5. **Retention ages it out**, measured from when it went idle. Nothing actively working is
   ever closed on a timer.

A five-orch fleet whose parent died finishes all five tasks and keeps all five results.

**Adoption announces itself.** Starting a session where unheld agents exist says so
unprompted; the web shows them as their own bucket, never mixed into the live fleet.

**Nesting.** A spawns B, B spawns C, B dies: C becomes unheld. It does not fall to A —
A never held it.

### The kill path

A dead holder must never make its agent immortal. The kill path **must not route through the
holder**, and **must not touch anything transient** — not the spawner's process, not its pane,
not the plexer.

### Ending is three verbs

| verb | effect |
|---|---|
| **abort** | end the current turn; the agent stays |
| **close** | end the process; `ended_at` set, row and history stay |
| **reap** | delete the row and the presence directory |

Stale presence dirs are the third verb having no owner and no trigger.

## 12. Placement

| orch owns | the environment provides |
|---|---|
| identity, ownership, addressing | starting a process somewhere |
| delivery: presence inbox → bridge → ack | a screen *(capability)* |
| reading output (captured) | focus, keystrokes *(capability)* |
| history, ownership, state, spaces | fast-path typing instead of inbox *(capability)* |

**Delivery and read are orch's mechanism. A pane is an optimisation.** The tell that the seam
is drawn wrong today is that `headless` returns false from `deliver` even though
`inbox.jsonl → bridge → ack.jsonl` works with no screen at all.

**Branch on declared capabilities, never on an environment id.** `backend === "herdr"`,
`handle === null`, and `key.startsWith("headless~")` are one mistake in three hats. Adding an
environment means declaring its capabilities and editing zero renderers, commands, or policy.
If adding one requires editing a consumer, the seam is wrong.

---

## 13. Invariants

**An invariant whose enforcement is `NONE` is not a rule — it is a wish, and it will be
broken.** Each of 1–5 was broken by code written *after* it was written down, in a repo whose
authors had all read the comment. Adding an invariant means adding its enforcement in the same
change, or recording `NONE` so the gap is visible to the next reader instead of discovered by
the next bug.

| # | Invariant | Enforced by |
|---|---|---|
| 1 | A live daemon knows every agent. No anonymous invocation. | `hello` is the only entry point |
| 2 | An id is minted by orchd, never derived from a plexer, harness, name, handle, or pid. | `checkIdentityConstructionLine` in `scripts/check-bridge.ts` |
| 3 | A reply address is not an owner token. | `checkSpawnerReplyFallbackLine` in `scripts/check-bridge.ts` |
| 4 | `spawned_by` names an id orchd issued, never a governance actor. | same rule as #3 |
| 5 | Liveness is discovered at send time, never encoded in an identity. | the identity type carries no liveness field |
| 6 | At most one live process, placement, and lease per agent. | the three partial unique indexes |
| 7 | An owner claim is honoured only while its holder is provably alive. | `NONE` — needs `processInstanceMatches` at the gate |
| 8 | An agent's name is unique in a scope that outlives a session — never per-session. | `NONE` — needs a uniqueness constraint |
| 9 | An unheld agent is actionable by anyone; a held agent only by its holder. | `NONE` — needs the lease check plus a test per command |
| 10 | No `REFERENCES` clause is decoration. | `NONE` — needs `PRAGMA foreign_keys = ON` in `openStore` |

### Why prose does not hold

- `policy/spawner.ts:68` says a reply address must never fall back to the owner token. Four
  files did it anyway: `control.ts`, `target.ts`, `spawn.ts`, `events.ts`.
- `stripWorkerHeader` correctly removes the worker preamble and can never fire, because
  `presence.ts` truncates the task to 200 characters first — shorter than the header it must
  match. Correct code, unreachable.
- An earlier design required a TCP caller to "present a previously-issued identity" without
  defining how one is obtained. The implementation faithfully built the undefined half.

None of these were carelessness. In each case the rule was known, written down, and
unenforceable.
