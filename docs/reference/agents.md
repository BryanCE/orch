# Agents — the one entity

Binding architectural direction, at the same level as
`learnings/2026-07-16-harness-plexer-architecture.md`. Read this before touching identity,
keys, registration, spawn, ownership, placement, reaping, retention, or the backend port.

This replaces `identity-registration.md`, `agent-ownership.md`, and `agent-lifecycle.md`.
Identity, provenance, ownership, placement and lifetime are five faces of one entity, and
splitting them across documents is how they drifted.

---

## The axiom

**An orchestrator is an agent. A worker is an agent. A Claude session driving orch is an
agent.** One table, one shape, pointing at itself twice — once for who spawned it, once for
who holds it.

There is no other way to track identity. The moment a spawner is a different kind of thing
from a spawnee, you need a second id space, a second liveness mechanism, a second naming
scheme, and a join to ask the only question that matters: *who is responsible for this?*

**orch owns every agent.** An environment — herdr, tmux, headless, and whatever comes next —
is **where an agent is currently running**. It is recorded, queryable, and displayed. It is
never identity.

## Five facts, never welded together

| fact | mutable | column |
|---|---|---|
| **Identity** — the minted id, and nothing else in it | never | `id` |
| **Provenance** — who spawned it | never | `spawned_by` |
| **Ownership** — who holds it now | yes | `held_by` |
| **Placement** — where it runs | yes | `backend`, `handle`, `cwd`, … |
| **Lifetime** — whether it survives its spawner | yes | `lifetime` |

Anything encoded into an identity can never change without breaking every reference to it,
which is precisely why identity holds nothing but the minted id.

---

# The shape

**One object at the call site, five tables underneath.** A wide agent row is a dead end:
placement changes when an agent moves, the process changes on restart, and ownership is a
relationship with its own history. Each table below earns its split from a real property, not
from tidiness.

```sql
CREATE TABLE workspaces (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,               -- orch owns naming
  root        TEXT    NOT NULL UNIQUE,        -- repo root
  created_at  INTEGER NOT NULL
) STRICT;

CREATE TABLE agents (                          -- identity, and what is genuinely 1:1 with it
  id           TEXT    PRIMARY KEY,
  workspace_id TEXT    NOT NULL REFERENCES workspaces(id),
  spawned_by   TEXT             REFERENCES agents(id),   -- IMMUTABLE. NULL = nothing spawned it
  adapter      TEXT    NOT NULL,                          -- pi | claude | codex | omp
  lifetime     TEXT             CHECK (lifetime IN ('owned','detached')),
  name         TEXT    NOT NULL,
  label        TEXT,
  model        TEXT,
  thinking     TEXT,
  created_at   INTEGER NOT NULL,
  ended_at     INTEGER                                    -- set on close; row survives for history
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
  backend   TEXT    NOT NULL,
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
```

## Types are decided, not inherited

- **Every instant is `INTEGER` epoch milliseconds.** The lease logic is arithmetic —
  `now - released_at > graceMs` — and TEXT forces a parse per row or a string comparison that
  orders but cannot subtract. 8 bytes instead of 24, no timezone can be ambiguous, native
  sort. Format at the edge. The existing store mixes `TEXT` and `INTEGER` instants across
  seven tables; that is the same disease as four documents for one entity, and it ends here.
- **`start_token` is `TEXT`** — an opaque platform string (Linux clock ticks, Windows
  `.NET` ticks, a `ps lstart` date). Compared for equality, never parsed.
- **Enums are `TEXT` with `CHECK`** — readable in a dump, domain enforced, no lookup table.
  Integer codes would be premature and unreadable.
- **`STRICT` on every table.** Rule 8 says there is exactly one live shape; `STRICT` is the
  database enforcing that rather than trusting every writer to.

**`PRAGMA foreign_keys = ON` must be set in `openStore`.** SQLite ignores foreign keys by
default, so without it every `REFERENCES` clause above is decoration. It is currently absent
from `src/store/connection.ts`.

`ON DELETE CASCADE` reaches only the child tables. `agents.spawned_by` deliberately has no
cascade: reaping an agent that still has descendants is refused, which forces a reap to walk
the tree instead of silently orphaning provenance.

## Why each split exists

- **Placement** — the columns go NULL *as a group*: a session has no placement at all, and it
  gets no row rather than seven NULLs. Agents also move, and a move is a new row.
- **Processes** — `orch restart` yields a new pid and start token while identity is unchanged.
  That is a different entity's lifecycle wearing the same id.
- **Leases** — ownership is a relationship with its own attributes. **Handoff and adoption are
  inserts, not overwrites**, so *why is this mine now?* is answerable. A mutable `held_by`
  column silently cannot deliver that.

`name`, `label`, `model`, `adapter`, `lifetime` stay on `agents`: genuinely 1:1, no repeating
group, no transitive dependency. Splitting those is over-normalizing.

## Two things this buys immediately

**Denormalized lifecycle state disappears.** There is no `orphaned_at` column; an expired
lease is `released_at` with `release_reason = 'expired'`, and the grace window runs from
there.

**The one-driver rule becomes a database constraint, not application logic:**

```sql
CREATE UNIQUE INDEX one_live_process ON agent_processes(agent_id)  WHERE ended_at IS NULL;
CREATE UNIQUE INDEX one_placement    ON agent_placements(agent_id) WHERE until IS NULL;
CREATE UNIQUE INDEX one_lease        ON agent_leases(agent_id)     WHERE released_at IS NULL;
```

Two live orchestrators holding one agent is now *structurally impossible* rather than
prevented by a function a future caller might forget.

## The composed object

```ts
interface Agent {
  id: string;
  workspace: Workspace;
  spawnedBy: string | null;
  name: string;
  lifetime: "owned" | "detached" | null;
  process: AgentProcess | null;      // ended_at IS NULL
  placement: AgentPlacement | null;  // until IS NULL — null for a session
  lease: AgentLease | null;          // released_at IS NULL — null when unheld
}
```

`agent.placement === null` is honest. `agent.lease === null` means unheld. Neither is a
sentinel value pretending to be data.

## `workspaces`

A workspace is a repo-level context holding many orchestrators, each with their own agents.
It is **orch's**, never a plexer's. **Minted on first spawn in a repo root, never created by
hand** — `orch spawn` already requires `--cwd`, so it needs no new flag and no ceremony. Its
name defaults to the repo directory name and is yours to change.

**Minted on first spawn in a repo root, never created by hand.** `orch spawn` already
requires `--cwd`, so the workspace needs no new flag and no ceremony. Two orchestrators in one
repo share one workspace; that is the entire point of the concept.

```
workspace  /mnt/c/dev/personal/orch          name "orch"
  ├── agent 3f2a  "claude — web work"        spawned_by NULL, held_by NULL
  │     ├── agent  api-1      held_by 3f2a   herdr %255    owned
  │     └── agent  api-2      held_by 3f2a   herdr %256    owned
  ├── agent 9c1b  "pi — refactor"            spawned_by NULL, held_by NULL
  │     └── agent  parser-1   held_by 9c1b   headless      owned
  └── agent nightly-1                        held_by NULL  headless      detached
```

A session fills identity and naming and leaves placement empty. Those empty fields are
honest: a session is not in a plexer.

## What deliberately stays out

Telemetry — `state`, `task`, `dispatchId`, `lastText`, `currentFile`, `filesTouched`,
`tokens`, `cost`, `context`, `turns`, `asking`, `blockedMessage`, `sessionPath`, `startedAt`
/`finishedAt`/`updatedAt`. That is the agent's claim **about itself**, it churns every few
seconds, and `status.json` is already its home and the basis of the whole bridge protocol.

orchd merges the table and the presence files and serves one view, so the web still reads
exactly one source: **orchd**. Never herdr, never a harness, never the filesystem directly.

---

# Identity

## The key is the id

```
herdr~wF~iudj4mkriu   →   iudj4mkriu
headless~local~7x5hd4h610   →   7x5hd4h610
```

Three facts were welded into one key, and both of the leading segments were lies:

- **`local` is a missing value with a name.** headless agents were bucketed into a workspace
  that does not exist.
- **`wF` is herdr's own generated id**, displayed as though it were a name you chose.

`backend` and `workspace_id` come out of the key entirely and become columns. Nothing is
lost — a presence dir stays self-describing because `status.json` already carries backend,
workspace and handle; the agent writes its own placement.

## Registration

Identity is **issued by orchd, never derived by the caller.** A CLI process does not compute
who it is; it asks.

1. The process connects and calls `hello` before any other method, presenting the daemon
   token it read from `$ORCH_DIR`, its session pid, and a display label.
2. orchd verifies the token, which is the whole credential.
3. orchd returns the id recorded for that session pid, minting a row on first sight.

The session pid is the caller's parent process — the shell or harness that outlives any one
`orch` invocation — so continuity is the daemon's to keep rather than something each process
re-derives.

`hello` is the only place an agent enters the system. `selfActor()` and the four-branch
fallback in `spawnerIdentity()` are deleted, not adapted.

### Transports and how each one vouches

Both listeners are local. orchd prefers the unix socket and binds loopback TCP alongside it
as a fallback for machines where the socket cannot bind. **TCP is a transport fallback, never
a client class** — nothing is a second-class caller for arriving on it, and no client chooses
TCP while the socket is available. Every local client, the web server included, dials the
socket.

The trust rule is one sentence: **a caller is trusted when it is the same uid as the daemon.**
**One mechanism proves it on both transports**: a `0600` token file that orchd writes into
`$ORCH_DIR` at startup. A caller that can read it is necessarily the same uid, which is
exactly what kernel peer credentials establish — so nothing is weaker for arriving on TCP,
and there is no enrollment step, because reading a file you already have permission to read is
the whole handshake.

Peer credentials are not used, and this is a portability fact rather than a preference: node
exposes neither `SO_PEERCRED` nor a peer's process ancestry, so obtaining them means scraping
`/proc` and `ss`, which works on Linux alone. orch ships to node on every platform (Rule 6),
and an attribution path that exists on one OS is not an attribution path.

The pid and label in `hello` are the caller's own report. They serve continuity and display,
**never authorization** — a same-uid caller that misreports its session gains nothing it could
not already do by dialing again. A caller that presents no token, or no session pid, is
refused; it is never assigned a synthetic identity, and it is never asked to supply an id it
has no defined way to obtain.

### Commands that run without a daemon

`setup`, `doctor`, `help`, `version`, and `status --offline` are defined to work with no
daemon and therefore need no identity — none of them writes. Every command that writes already
requires orchd, so the split needs no new state: **no daemon means no writes, and no writes
means no identity is required.** A command must never invent a local identity because the
daemon is down.

## Inbox, and what registration does not promise

Every agent gets an inbox. Not every agent reads one promptly: a session acts when its human
prompts it, so a message to it is parked rather than delivered into a running turn. orchd
drains and holds; `orch status` surfaces the unread count.

Three separate facts, and only the last one varies:

- has an identity — always true of a registered agent
- has an inbox — always true
- reads it promptly — true of a live worker, not of a session between turns

Today the absence of the first is modeled as the absence of all three, which is why a worker
with no reachable spawner improvised a relay through a sibling instead of parking a message.

---

# Liveness

One primitive, `src/process-identity.ts`:

```
processInstanceMatches(pid, start_token)
```

Because a holder is just another agent row, this answers **"is this agent alive?"** and **"is
this holder still alive?"** with the same code and the same two columns. A pid the OS has
recycled can never pass for the agent orch recorded.

`start_token` is field 22 of `/proc/<pid>/stat` on Linux, `StartTime.Ticks` on Windows, and
`ps -o lstart` elsewhere. Undefined only when the OS refuses, and callers treat that as
*unproven*, never as *matches*.

**Recording `start_token` at spawn is what makes `close` real for a headless orphan.** A pane
backend hides the gap because closing the pane happens to kill the process; headless has no
such accident, so without this orch knows an agent exists, knows it is unheld, and has no
proven handle to end it.

---

# Ownership

## Held by an agent, or held by nobody

`held_by` names another agent row, or is `NULL`. Unheld is a normal state, not a leak.

**You are not an owner, because you are not in the model.** You interact only through the CLI
and the web — two doors into one daemon — and neither carries an identity. Writing an owner
value that means "the human" is the same bug as writing `"local"` for a workspace. There are
no accounts, and there never will be; same-uid is the entire trust boundary.

Your intent reaches the system in exactly two forms:

- **Standing intent** — `settings.json`. Grace window, retention, defaults. The only thing
  that acts on an unheld agent.
- **Live intent** — a command. CLI or web, the same daemon method, never two code paths.

## One driver at a time

**Two live orchestrators must never drive the same agent.** Interleaved dispatches and
conflicting steers are chaos. `checkOwnerWrite` in `src/store/ownership-rows.ts` exists to
prevent exactly that; it is correct and it stays. `--steal` is the deliberate override for
taking an agent from another orchestrator.

This is **mutual exclusion, not authorization**, and the distinction names precisely what the
gate may do:

| command | gated | why |
|---|---|---|
| `dispatch`, `steer`, `model`, `reset` | **yes** | driving. Two drivers interleaving is the chaos. |
| `abort`, `close`, `reap` | **no** | ending. There is nothing to interleave with, and the human must always be able to stop a runaway agent from the CLI or the web. |

**The defect today is that the gate has no liveness.** `ownership.owner` is a bare string
with no pid and no start token, so a claim left by a *dead* orchestrator is indistinguishable
from a live one and blocks writes forever behind `--steal`. A dead holder is not a collision.
The lease supplies the liveness the gate is missing.

## Ownership is a lease, never a parent pointer

A parent pointer describes the past. Ownership is a question about the present.

| operation | who asserts | meaning |
|---|---|---|
| **renew** | the holder, implicitly | `processInstanceMatches(holder.pid, holder.start_token)` |
| **release** | the holder | clean exit — done with these |
| **handoff** | the holder | names another holder |
| **adoption** | a claimant | claims an unheld agent |
| **expiry** | nobody | the holder is gone; the agent becomes unheld |

Expiry is not a transfer. Nothing moves and nobody receives it.

Evidence and intent stay separate: `processInstanceMatches` is *evidence* for renewal, the
lease is the *statement*. Every future liveness mechanism plugs into the evidence side and
changes nothing else.

**A transfer must not disturb the agent.** It does not know, does not reset, does not
re-attach, does not lose context. If a handoff requires touching the agent, ownership is
still secretly welded to identity or placement.

## `spawned_by` is provenance and never the owner

Two columns, one immutable, one mutable, never merged. `spawned_by` is the obvious place to
put ownership because it is already on every agent; doing that destroys the only field that
answers *where did this come from*.

**Consequence with teeth:** `orch events` currently scopes on `spawnedBy`. Adopt an orphaned
fleet under a provenance-scoped watch and you see none of them. **The watch scope follows
ownership.** Live views group by `held_by`; history groups by `spawned_by`.

---

# Lifetime

## Two lifetimes, chosen at spawn. Default is fate-share.

| | behaviour |
|---|---|
| `orch spawn` (default) | **owned** — fate-shares with the spawning agent |
| `orch spawn --detached` | **survives** it. **Requires a name.** Ends only by command or retention. |
| `orch detach <target>` | promote a live owned agent to detached — "I'm leaving, keep going" |

**Detached requires a name, always.** A nameless thing with no holder is unreclaimable
garbage by construction.

**Lifetime is not placement.** `--backend headless` says *where*; `--detached` says *whether
it survives its spawner*. A paned agent may be detached and a headless agent may be owned.
Fusing the two flags is the same mistake as fusing backend into the key.

This makes clean-exit signalling an optimisation rather than a correctness requirement: **if
you meant to walk away, you said so; if you said nothing, you meant them to die.** A harness
that can announce its exit merely cleans up in seconds instead of waiting out the window.

## When a holder dies

Only `owned` agents are affected. `detached` agents were never at risk.

1. **Quiet, immediately.** No dispatch, no queue assignment, no steer reaches them. The fleet
   stops when you leave, which is what a user expects to have happened.
2. **The in-flight turn finishes and writes its result.** It is already paid for, and this
   caps orphan spend at exactly one turn.
3. **`orphaned_at` is stamped.** Processes hold for the grace window — **10 minutes**,
   `settings.json` — then close. `ended_at` is set; the row and history stay.
4. **Adoption is available for the whole window, and announces itself.** Starting a session
   where orphans exist says so unprompted; the web shows them as their own bucket, never
   mixed into the live fleet.

Strictness is not the risk — irreversibility is. Strict plus reversible is predictable;
strict plus irreversible makes people afraid to spawn.

**Nesting follows the same rule once more.** A spawns B, B spawns C, B dies: C becomes
unheld and walks the same path. It does not fall to A. A never held it.

## The kill path

A dead holder must never make its agent immortal. Two consequences:

- **The kill path must not route through the holder.** "Ask the owner to shut it down" fails
  in precisely the case the feature exists for.
- **The kill path must not touch anything transient** — not the spawner's process, not its
  pane, not the plexer.

## Ending is three verbs, not one

| verb | effect |
|---|---|
| **abort** | end the current turn; the agent stays |
| **close** | end the process; `ended_at` set, row and history stay |
| **reap** | drop the row and the presence dir |

Stale presence dirs are the third verb having no owner and no trigger.

---

# Placement

## Where the port seam belongs

| orch owns | the environment provides |
|---|---|
| identity, lifetime, addressing | starting a process somewhere |
| delivery: presence inbox → bridge → ack | a screen *(capability)* |
| reading output (captured) | focus, keystrokes *(capability)* |
| history, ownership, state, workspaces | fast-path typing instead of inbox *(capability)* |

**Delivery and read are orch's mechanism. A pane is an optimisation.**

That seam was drawn wrong, and the tell is that `headless` returns false from `deliver` even
though `inbox.jsonl → bridge → ack.jsonl` already works with no screen at all. A capless
environment is not one orch cannot talk to; it is one with no *shortcut* for talking to it.

## Capabilities, never environment ids

Renderers, commands, and policy branch on declared capabilities and never on an environment's
id. `backend === "herdr"`, `handle === null`, and `key.startsWith("headless~")` are the same
mistake wearing three hats: each infers an environment's identity and hard-codes behaviour
against it.

Adding an environment means declaring its capabilities. It must change no renderer, no
command, and no policy. If adding one requires editing a consumer, the seam is wrong.

## Spawning outside a pane session

A pane backend answers `isInsideSession` whenever its socket is up, which says nothing about
whether *this* process sits in one of its panes. When it cannot place the caller there is no
tab to open, so the launch goes detached-in-placement rather than refusing: orch owns the
agent either way, and where it runs is placement. An explicit `--workspace` always wins.

---

# Invariants

Every invariant here names the mechanism that enforces it. **An invariant whose enforcement is
`NONE` is not a rule — it is a wish, and it will be broken.** Each of 1–5 below was broken by
code written after it was written down, in a repo whose authors had all read the comment.

Adding an invariant means adding its enforcement in the same change, or recording `NONE` so
the gap is visible to the next reader instead of discovered by the next bug.

| # | Invariant | Enforced by |
| --- | --- | --- |
| 1 | A live daemon knows every agent. No anonymous invocation. | `hello` is the only entry point; there is no other way to obtain an identity |
| 2 | An id is minted by orchd, never derived from a plexer, harness, name, pane id, or pid. | `checkIdentityConstructionLine` in `scripts/check-bridge.ts` confines construction to the issuer (with fresh `mintAgentId()` spawn keys allowed); `src/entities.ts`'s `selfActor()` line is a registered exemption until that caller is removed |
| 3 | A reply address is not an owner token. | `checkSpawnerReplyFallbackLine` in `scripts/check-bridge.ts` catches the fallback shape; branded types would make it a compile error |
| 4 | `spawned_by` names an id orchd issued, or the write is refused — never a governance actor. | same rule as #3 |
| 5 | Liveness is discovered at send time, never encoded in an identity. | the identity type carries no liveness field, so there is nothing to go stale |
| 6 | Ownership never appears in `spawned_by`; provenance never appears in `held_by`. | `NONE` — needs a check-bridge rule |
| 7 | An owner claim is honoured only while its holder is provably alive. | `NONE` — needs the lease columns and `processInstanceMatches` at the gate |
| 8 | Lifetime is never inferred from a backend id. | `NONE` — needs a check-bridge rule shaped like the capability check |
| 9 | `abort`, `close` and `reap` are never refused for ownership. | `NONE` — needs a test per command |

## Why prose does not hold

Three separate incidents, one shape:

- `policy/spawner.ts:68` explains that a reply address must never fall back to the owner
  token. Four files did it anyway: `control.ts`, `target.ts`, `spawn.ts`, `events.ts`.
- `stripWorkerHeader` correctly removes the worker preamble, and can never fire, because
  `presence.ts` truncates the task to 200 characters first — shorter than the header it must
  match. Correct code, unreachable.
- An earlier draft of this document required a TCP caller to "present a previously-issued
  identity" without defining how one is obtained. The implementation faithfully built the
  undefined half.

None of these were carelessness about the rule. In each case the rule was known, written
down, and unenforceable.

---

# Cost of getting here

Rule 8 applies: bump the schema, reap, and never accept two shapes at once.

- **~42 call sites across 12 files** parse or build `<backend>~<workspace>~<id>` keys.
- **Every test fixture** carrying a `herdr~w~x` or `wD-p1A` key.
- **`spawned.pane` is the primary key** and becomes `agents.id`.
- **Presence dir names** change; the existing ones are reaped, not migrated.
- `session_identities` is **deleted** — a session is an agent row.

Land the port seam and the columns first; land the key change second, as its own change.

## Prior art

- **Erlang/OTP** — `spawn` / `spawn_link` / `spawn_monitor`. Fate-sharing is deliberate: "if
  the top-level processes of our system end, we don't want their child processes carrying on
  without them." `monitor` is the third relationship — watch without owning.
- **Ray** — actors fate-share with their creator by default; `lifetime="detached"` opts out
  and **must be named**.
- **Kubernetes** — `ownerReferences` plus a propagation policy chosen at delete time:
  Background, Foreground, **Orphan**. Deliberate orphaning is first-class, which is what
  `orch detach` is.
- **Consul sessions** — TTL, renew, release-vs-delete, and a **lock-delay** cooldown after
  expiry so a flapping holder cannot thrash ownership. Worth stealing.
- **systemd** — on letting processes escape lifecycle management: it "allows processes to
  escape the service manager's lifecycle and resource management, and to remain running even
  while their service is considered stopped and is assumed to not consume any resources."
  A verbatim description of the stale presence dirs in `$ORCH_DIR`.
- **Windows job objects / cgroups** — `KILL_ON_JOB_CLOSE` terminates a process tree
  atomically, kernel-enforced, no polling and no races. Free for headless, where orch owns
  the tree; unavailable for panes, which the plexer owns.
- **Temporal** — the far end: the *work* is durable state and workers are disposable, so
  nothing fate-shares because the process was never the thing that mattered. That is a
  rewrite, not a feature. `runs` / `events` / history point that way; nothing here closes
  that door.
