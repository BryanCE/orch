# The agent model — fundamentals

Nothing here is inherited from the current code. Every choice is made for its purpose and
justified. Where the existing store does something different, the existing store is wrong.

---

## 1. The axiom

**An orch is an agent. A slave is an agent. A Claude session driving orch is an agent** — it
registers, and it is then an orch of a pack of one. One entity, pointing at itself twice: once
for who spawned it, once for which orch may drive it.

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
| **Lease** — which orch may drive it now | yes | `agent_leases` |
| **Environment** — where it is | yes | its own axes |

Anything encoded into an identity can never change without breaking every reference to it.
That is precisely why identity holds nothing but the minted id.

**The bug this prevents, live on disk today:**

```
headless~local~7x5hd4h610     "local" is a missing value wearing a name
herdr~wF~0uh7scyzxh           "wF" is herdr's own id, displayed as if you chose it
```

Three facts welded into one key, two of them lies. The plexer and whatever it groups by are
**environment**, and become environment columns.

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
retention age, lease age, idle age, uptime.

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

> **The DDL lives in `06-schema.md` and nowhere else.** This section names the entities and says
> why each one exists. Columns, keys, indexes and triggers are there, and a second copy here
> would be a second answer — which is what it had become.

| table | what it holds |
|---|---|
| `harnesses`, `plexers`, `hosts` | extensible lookups. Adding one is an INSERT, never a migration |
| `host_plexers` | which plexer is installed on a machine, and at what version |
| `spaces` | a user's grouping of work. Not a path |
| `agents` | the hub: identity, provenance, pack root, harness, `cwd` — what every agent has and none can change |
| `agent_worktrees` | present only for an agent working in a worktree; no row = the repo itself |
| `agent_endings` | present only for an agent that ended; no row = alive |
| `agent_processes` | one row per process instance; a restart is a new row |
| `agent_plexers` | which interaction layer it is shown in; no row = headless |
| `agent_handles` | that plexer's own coordinate for it, which the plexer renumbers |
| `agent_spaces` | which grouping of work it belongs to |
| `agent_tunings` | model and thinking — configuration, not location |
| `agent_leases` | one row per holding; its id is the fencing token |

Every satellite obeys one temporal contract: validity is the half-open `[since, until)`, `until
IS NULL` means open, and a partial unique index allows at most one open interval per agent. The
partial index does not forbid overlapping *closed* intervals — sound only because orchd is the
single writer (M1), which makes that a constraint the architecture must keep, not an accident.

`ON DELETE CASCADE` reaches only the satellites. `agents.spawned_by` deliberately has no
cascade: reaping an agent that still has descendants is **refused**, forcing a reap to walk
the tree instead of silently destroying provenance.

### Normal form, and where it stops

Every satellite is in **5NF**. Each holds one multivalued fact about one agent over one
interval, with no partial dependency (the key is the whole key) and no transitive dependency
(nothing in a satellite determines anything else in it). `model` and `thinking` sit together
because thinking-effort is meaningless without the model it qualifies — one fact, two columns —
not because they happened to change at the same time.

**`agents.root_agent_id` is the one materialized value, and it is provably safe.** A cached
value can only drift if an input can change; `spawned_by` is immutable, so the provenance root
is immutable, so the cache has no update path that could ever make it wrong. It is computed once
at insert — the parent's root, or the agent's own id when it has no spawner — and never touched
again. That turns every pack query into `WHERE root_agent_id = ?` instead of a recursive walk on
each read. Deriving it instead with `WITH RECURSIVE` is correct and slower; storing a value whose
inputs *could* change would be the mistake, and this one's cannot.

**What is deliberately not modelled: a `subjects` supertype.** Satellites key on `agent_id`
because an agent is the only owner today. The moment a second kind of owner needs an environment
— a space, or a pack given a row of its own — the correct move is a `subjects(id, kind)`
supertype that `agents.id` and `spaces.id` both reference, with satellites keying on
`subject_id`. Building it before there is a second subject is speculative generality; the
migration path is recorded here so it is a decision rather than a discovery.

**What is deliberately not enforced: overlapping closed intervals.** The partial unique indexes
guarantee one *open* interval per agent per satellite. Nothing forbids two closed intervals from
overlapping in history, because SQLite has no exclusion constraint. That is sound only while
**orchd is the sole writer** (M1) and every close-then-open pair happens in one transaction. It
is therefore a standing architectural requirement, not a gap to be patched later.

## 5. Why each split exists

- **What can change is a table; what cannot is a column.** A pane's coordinate changes and a
  space membership changes, and they never change together — one row for both would restate an
  unchanged fact on every move and conflate two histories into one lie. The directory changes
  never: only a process can `chdir` itself and no harness does, so it sits on the hub beside the
  harness rather than in a satellite that would only ever hold one row.
- **A missing axis is a missing row, not a NULL.** A session has no plexer, so it has no
  `agent_plexers` row — not a row full of NULLs pretending to be a location.
- **Tuning is not environment.** `model` and `thinking` are how an agent is configured, not what
  surrounds it, and they churn far faster than anything that is. Filing them under "where it is"
  would make that word mean "everything else", which is the failure that produced `workspace`.
- **Harness is not environment either — it is constitutive.** No operation changes an agent's
  harness; a different harness is a different agent. An immutable fact belongs on the hub beside
  `spawned_by`, never in a satellite that invites the question "which one is it on *now*".
- **Processes** — `orch restart` yields a new pid and start token while identity is unchanged.
  A different entity's lifecycle wearing the same id.
- **Leases** — a lease is a relationship with its own attributes. **Handoff and adoption are
  inserts, not overwrites**, so *why is this mine now?* is answerable. A mutable `driven_by`
  column cannot deliver that.

`name` and `label` stay on `agents`: genuinely 1:1, and no history is needed because nothing in
the code reads a name (§6a) — an id is what logs and references carry.

**Adding an axis later — a container, a remote host beyond the process's, a display — is one
table plus one line in the composer.** Zero consumers change. That is the whole reason the seam
is per-axis and not one wide row.

**There is no `lifetime` column.** Owned-vs-detached answered one question — *does the work
survive its spawner?* — and that answer is permanently yes (D1).

**There is no `orphaned_at` column.** It was denormalized state. An expired lease is `until`
with `release_reason = 'expired'`, and that is the whole record of it. Nothing runs from there:
there is no grace window and never was one (D11).

## 6. The composed object

One object at the call site, eight tables underneath. **An agent HAS an environment; an
environment HAS a directory, a harness, a plexer, a space.** Nothing here is a table with
fifty columns — it is a composition of narrow ones.

```ts
interface Agent {
  id: string;
  name: string;
  harness: Harness;              // constitutive, immutable
  spawnedBy: string | null;      // provenance, immutable
  pack: string;                  // root_agent_id — immutable, materialized
  process: Process | null;       // until IS NULL — null when nothing is running
  environment: Environment;      // where it is and what surrounds it
  tuning: Tuning | null;         // model and thinking — configuration, not location
  lease: Lease | null;           // until IS NULL — null when unleased
}

interface Environment {
  directory: Directory;          // cwd, and a worktree when there is one
  plexer: Plexer | null;         // which plexer, and its current opaque coordinate
  space: Space | null;           // the grouping, and the reachability boundary
}
```

`Environment` is never null — everything has one — but **each axis is independently null**,
because a headless agent genuinely has no plexer and an ungrouped agent genuinely has no space.
A null axis is a missing row, and it reads as "not applicable" rather than as a value.

`agent.lease === null` means unleased. Neither that nor a null axis is a
sentinel pretending to be data.

## 6a. Names

`agents.name` is `NOT NULL` and carries **no uniqueness**. Nothing in the code ever reads a
name: it is accepted at the boundary, resolved to an id there, and never carried past it.
Duplicates are a usability problem, not a correctness one — orch refuses to hand out a name
already in use, flags a supplied one that collides, and treats an ambiguous name as a lookup
that found several agents and asks which id you meant.

- **Spawning requires a name.** No default, nothing auto-named.
- **A self-registering session** has no spawner to name it and no way to ask, so orch mints
  `<harness>-<first 8 of its id>`.
- **An agent may rename itself with no lease in force** — acting on itself is not driving. Renaming
  *another* agent is.

## 7. What stays out of the database

Telemetry — `state`, `task`, `dispatchId`, `lastText`, `currentFile`, `filesTouched`,
`tokens`, `cost`, `context`, `turns`, `asking`, `blockedMessage`, `sessionPath`.

That is the agent's claim **about itself**, it churns every few seconds, and `status.json` is
already its home and the basis of the whole bridge protocol. orchd merges the tables and the
presence files and serves one view.

**One orchd per machine, and every client reads only it** — the CLI on either OS, the web, a
harness bridge. Never herdr, never a harness, never the store or the presence files directly.
`$ORCH_DIR` is orchd's private backing, not an address, so two home directories can never mean
two daemons. Where an OS boundary makes a process unreachable, the far side gets an **executor**
behind the backend port — start, is-alive, kill — never a second daemon.

## 8. The hierarchy

Every box is an agent. Indentation is provenance, which is what makes a pack; "driven by" is
the lease.

```
space "website"                                   ← optional grouping, nothing owns it
  ├── orch 3f2a   "claude — client"               no spawner, no environment ┐ pack
  │     ├── slave  api-1      herdr %255          driven by 3f2a             │
  │     └── slave  api-2      herdr %256          driven by 3f2a             ┘
  ├── orch 9c1b   "pi — server"                   no spawner, no environment ┐ pack
  │     └── slave  parser-1   headless            driven by 9c1b             ┘
  └── orch nightly-1          headless            UNLEASED — still working, pack of one
```

A **space** groups packs. It is optional, it is not a path, and it is the reachability
boundary: `3f2a` and `9c1b` may coordinate because they share a space. With no space set, the
boundary is the repo root.

A **pack** is the set of agents sharing a **provenance root**, so every agent is in exactly one
pack at any depth. A registered session is a pack of one before it spawns anything; spawning
grows a pack, it never creates one. The root is the **orch**, every other member a **slave**.

Because provenance is immutable, an agent is in one pack for life and a pack outlives its orch.
Adoption moves the lease, never the membership.

A pack is capped at **10 live members** by default, configurable in `settings.json` and enforced
at the spawn command — the same kind of policy as the depth limit, never a fact about the model.

---

## 9. Liveness — one primitive

```
processInstanceMatches(pid, start_token)      src/process-identity.ts
```

Because the orch driving it is just another agent row, this answers **"is this agent alive?"**
and **"is the orch driving it still alive?"** with the same code and the same two columns. A recycled pid can
never pass for the agent orch recorded.

Recording `start_token` at spawn is what makes `close` real for a headless orphan. A pane
backend hides the gap because closing the pane happens to kill the process; headless has no
such accident.

## 10. Leases

### Containment is not a lease

| | what it is | lifecycle meaning |
|---|---|---|
| **Containment** — space > pack > agent | a scope | none. Static structure. |
| **A lease** — an orch may drive an agent | a lease | yes. One at a time, transferable. |

**Nobody owns a space.** Owning would mean the owner's death affects the owned, and a space
does not die when an agent does. A space carries `created_by` as provenance and nothing more.

If an orch owned its space, it would have authority over every *other* orch's agents in that
space — precisely what must never happen. Orchs in one space are peers.

Because containment is a tree, the UI gets both entry points for free: space-first (one
grouping, several packs, unleased agents listed at space level) and orch-first (your packs
across spaces). That is navigation, not modelling.

### Leased or unleased

An agent is driven by one orch, or by none. **Unleased is normal, not a leak.**

You are not an owner, because you are not in the model. You reach the system through the CLI
and the web — two doors, one daemon — and neither carries an identity. An owner value meaning
"the human" is `"local"` all over again. No accounts, ever; same-uid is the whole trust
boundary. Your standing intent lives in `settings.json`; your live intent is a command.

### One driver at a time

**Two live orchs must never drive the same agent.** Interleaved dispatches and
conflicting steers are chaos. This is **mutual exclusion, not authorization**:

| command | gated | why |
|---|---|---|
| `dispatch` `steer` `model` `reset` | **yes** | driving. Two drivers interleaving is the chaos. |
| `abort` `close` `reap` | **no — FOR THE HUMAN** | ending. Nothing to interleave with, and the human must always be able to stop a runaway agent from the CLI or the web. **This row is about the HUMAN and nothing else.** An agent is gated: see *Who may end an agent* below. |

### Who may end an agent

**"Not gated" applies to the HUMAN. It has never applied to an agent.** The human at a CLI or
in the web may end anything, always — that is the whole point of the row above, and the reason
it exists is that a human must be able to stop a runaway. An agent is not a human and inherits
none of it.

**An agent may end only what it OWNS.** Ownership is a chain — **user → orch → the slaves that
orch owns** — and an agent's reach is its own provenance subtree, at any depth. An orch closing
its own slave is ordinary work. An agent closing another orch's slave is refused, and the
refusal names the owner so the caller knows who to ask. An agent may always end itself: acting
on yourself is not driving somebody else's fleet.

**Ownership here is the PROVENANCE CHAIN, never the lease.** The lease answers "who is driving
this right now" and gates the driving verbs. This answers "whose is this" and gates ending it.
They are different questions and must not be merged:

- An orch must be able to close its own slave *even while another orch holds the lease* —
  otherwise a foreign holder can keep a runaway alive.
- Holding the lease must confer no right to end an agent you do not own.
- Clearing a dead holder's lease must never be a prerequisite for killing a runaway.

The caller is told apart the way `orch clean` already does it (`src/commands/clean.ts:118`): no
`ORCH_AGENT_KEY` in the environment is the human at a terminal; a key present is an agent.
There is still no account and no login — same-uid remains the whole trust boundary.

Implemented in `src/policy/close-authority.ts`; proven by `test/close-authority.test.ts`.

**Today's defect is that the gate has no liveness.** `ownership.owner` is a bare string with
no pid and no token, so a *dead* orch's claim is indistinguishable from a live one and blocks
writes forever behind `--steal`. A dead orch is not a collision. The lease supplies the
liveness the gate is missing; `--steal` keeps its real job — taking an agent from a **live**
orch.

### The lease

| operation | who asserts | row effect |
|---|---|---|
| **renew** | the leasing orch, implicitly | none — `processInstanceMatches` on that orch |
| **release** | the leasing orch | `released_at`, reason `released` |
| **handoff** | the leasing orch | close current, insert new |
| **adoption** | another orch | insert, reason `adopted` on the prior row |
| **expiry** | nobody | `released_at`, reason `expired` |

Expiry is not a transfer. Nothing moves and nobody receives it.

**A transfer must not disturb the agent** — it does not know, does not reset, does not
re-attach, does not lose context. If a handoff requires touching the agent, the lease is still
secretly welded to identity or environment.

### Provenance is not a lease

`spawned_by` is immutable; leases are a table. `orch events` currently scopes on `spawnedBy` —
adopt an orphaned fleet under a provenance-scoped watch and you see none of them. **Live views
group by lease; history groups by provenance.**

## 11. Lifetime

**Work survives its spawner. Always.** There is no flag, no mode, and no decision at spawn
time. Spawn and walk away is not something you opt into; it is what happens.

There is no `--detached`, because there is nothing to detach *from*. `orch detach <target>`
means exactly one thing: **release the lease** — this is nobody's now, anyone may adopt it.

### When the orch driving it dies

The agent loses a **driver**, not its life.

1. **It finishes what it is doing.** The task runs to completion and writes its result.
2. **It receives no new work.** No dispatch, no steer, no queue assignment — there is nobody
   left to read a result or correct course.
3. **The lease closes** `expired`. The agent is now unleased.
4. **Unleased and idle, it stays alive and adoptable.** It costs a pane and some memory, not
   tokens.
5. **Nothing closes it.** Not a timer, not retention, not a sweep, not an idle rule. Two things
   close an agent: the user, or the orch that spawned it. It sits there unleased and adoptable
   for as long as that takes.

A five-orch fleet whose parent died finishes all five tasks and keeps all five results.

**Adoption moves a lease, never a pack.** A pack is an orch and everything it spawned, and
adopting is not spawning — the adopted slaves keep the provenance they were born with, and the
adopting orch drives them from outside their pack.

**Adoption announces itself.** Starting a session where unleased agents exist says so
unprompted; the web shows them as their own bucket, never mixed into the live fleet.

**Nesting.** A spawns B, B spawns C, B dies: C becomes unleased. It does not fall to A —
A never leased it.

### The kill path

A dead orch must never make its agent immortal. The kill path **must not route through the
orch that was driving it**, and **must not touch anything transient** — not the spawner's
process, not its pane, not the plexer.

### Ending is three verbs

| verb | effect |
|---|---|
| **abort** | end the current turn; the agent stays |
| **close** | end the process; an `agent_endings` row is written, row and history stay |
| **reap** | delete the row and the presence directory |

Stale presence dirs are the third verb having no owner and no trigger.

## 12. Environment

**Where a thing is and what surrounds it** — its directory, repo, worktree and branch, the
harness it runs inside, the plexer it sits in, the space it belongs to, and which OS side it is
on.

**Everything has an environment**, not only an agent: a pack has one, a space has one. Reaching
for a new noun to say "this pack lives over there" means the environment was being treated as an
agent-only property.

**Space membership is part of the environment**, not a column beside it — it is one of the
things that surrounds an agent. Moving between spaces is a move, and a move is a new row.

| orch owns | the environment provides |
|---|---|
| identity, leases, addressing | starting a process somewhere |
| delivery: presence inbox → bridge → ack | a screen *(capability)* |
| reading output (captured) | focus, keystrokes *(capability)* |
| history, leases, state, spaces | fast-path typing instead of inbox *(capability)* |

**Delivery and read are orch's mechanism. A pane is an optimisation.** Confirmed against the
code: the dispatch path is RPC → outbox → inbox → the agent's own poll, and `status.json` /
`result.json` come back with no plexer involved at all. `headless` returns false from `deliver`
because that process only ever takes its launch prompt and then exits — not because a screen is
required.

**A plexer's own grouping is environment and nothing more.** herdr calls it a workspace, tmux
calls it a session; orch neither names it nor displays it as a name anyone chose. orch's own
grouping is a **space**.

**Branch on what the environment provides, never on an environment id.** `backend === "herdr"`,
`handle === null`, and `key.startsWith("headless~")` are one mistake in three hats. Adding an
environment means saying what it provides, in one place, and editing zero renderers, commands,
or policy. If adding one requires editing a consumer, the seam is wrong.

**The environment is recorded at registration; what is possible follows from it.**

Registering is the moment orch learns everything about where an agent is: its harness, its
plexer, its directory, its space, which OS side. Nothing about that is discovered later or
guessed at the moment of acting. It is written down once, at `hello`, and it is the answer to
"what can this agent do" for the rest of its life.

So orch never attempts something its environment cannot do. Not because it checks first, but
because there was never a path to it. That means **no fallback logic and no
unsupported-operation error path anywhere inside orch.**

"Can't" is said in exactly one situation: a human asks for something the agent's environment
does not have. `orch zoom` on a headless agent is answered, not failed — that agent has no pane.

The answer changes when what is there changes: a move writes a new environment row, an upgrade
writes a new `host_plexers` row. Neither is a negotiation at the moment of acting.

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
| 6 | At most one live process, environment, and lease per agent. | the three partial unique indexes |
| 7 | A lease is honoured only while the orch holding it is provably alive. | `NONE` — needs `processInstanceMatches` at the gate |
| 8 | *Retired.* A name is for the human, an id is for the code. Duplicates are legal; ambiguity is a lookup that asks for the id. | n/a — nothing to enforce |
| 9 | An unleased agent is actionable by anyone; a leased agent only by the orch leasing it. | `NONE` — needs the lease check plus a test per command |
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
