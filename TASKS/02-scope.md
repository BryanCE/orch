# Scope — everything this rebuild covers

The full inventory. Nothing discussed gets dropped because it was not written down.

**Status key:** `DECIDED` design settled, not built · `DESIGN` needs designing ·
`OPEN` needs a ruling from Bryan · `BUILT` landed · `BROKEN` a known defect

---

## A. Foundations

| # | item | status |
|---|---|---|
| A1 | Entity model: an orchestrator is an agent; **four** facts never welded — identity, provenance, ownership, environment. Lifetime is not one of them | `DECIDED` — `01-agent-model.md` |
| A2 | Normalized schema: `spaces`, `harnesses`, `plexers`, `agents`, `agent_processes`, `agent_leases`, and **four independent environment axes** — `agent_directories`, `agent_harnesses`, `agent_plexers`, `agent_spaces` | `DECIDED` |
| A14 | **Environment is a composition, never a table.** Its axes do not move together, so each is its own narrow table with its own `since`/`until` and its own partial unique index. A missing axis is a missing row, never a NULL | `DECIDED` |
| A15 | Adding a fifth axis (OS side, remote host, container) is one table plus one line in the composer — zero consumer changes | `DECIDED` |
| A3 | Data types chosen from purpose; instants are INTEGER epoch ms; no booleans | `DECIDED` |
| A4 | `STRICT` tables + partial unique indexes for "one live X" | `DECIDED` |
| A5 | `PRAGMA foreign_keys = ON` in `openStore` — absent today, so every FK is decoration | `BROKEN` |
| A6 | `processInstanceMatches(pid, start_token)` as the one liveness primitive | `BUILT` — `src/process-identity.ts`, replaced two divergent copies |
| A7 | A **space** is user-created and optional — never minted from a path. With no space set the reachability boundary is the repo root | `DECIDED` — `adr/0001` |
| A8 | Vocabulary (`orch` / `slave` / `pack` / `space`) is a display map, never stored — roles are derived from the tree. User-configurable terms are later polish, but the one-map constraint holds from day one | `DECIDED` |
| A9 | Depth-2 policy enforced at the spawn command; the model itself stays recursive | `DECIDED` |
| A10 | A pack starts at **one** member — a registered session is an orch of a pack of one. Membership is the **provenance root**, so every agent is in exactly one pack at any depth | `DECIDED` |
| A11 | Roles derive from tree position: **orch = pack root, slave = any non-root member** | `DECIDED` |
| A12 | Pack size capped at **10 live members** (1 orch + 9 slaves), configurable in `settings.json`. Enforced at the spawn command, like A9 | `DECIDED` |
| A13 | A spawn past the cap is **blocked** — never queued, never advisory. The block offers the two existing scopes: bind the task to a live slave, or put it on the pack | `DECIDED` |

## B. Identity and registration

Designed in detail, currently only in `docs/reference/identity-registration.md`, which is
outside `TASKS/`. **Needs restoring into this directory** — it is part of this plan.

| # | item | status |
|---|---|---|
| B1 | `hello` is the only entry point; identity is issued by orchd, never derived by the caller | `DECIDED` |
| B2 | Credential is the `0600` token file in `$ORCH_DIR`; same-uid is the whole trust boundary | `DECIDED` |
| B3 | One mechanism on both transports; TCP is a fallback, never a client class | `DECIDED` |
| B4 | Peer credentials rejected — node exposes neither `SO_PEERCRED` nor process ancestry portably | `DECIDED` |
| B5 | `selfActor()` and the four-branch `spawnerIdentity()` fallback are deleted, not adapted | `DECIDED` |
| B6 | No-daemon commands (`setup`, `doctor`, `help`, `version`, `status --offline`) need no identity because they never write | `DECIDED` |
| B7 | Every agent has an inbox; reading it promptly is the only thing that varies | `DECIDED` |
| B8 | `session_identities` table deleted — a session is an agent row | `DECIDED` |

## C. Ownership and leases

| # | item | status |
|---|---|---|
| C1 | Lease ops: renew / release / handoff / adoption / expiry. Expiry transfers nothing | `DECIDED` |
| C2 | **Authority is capability-based:** you may act on an agent if you hold its lease, or if it has no holder | `DECIDED` |
| C3 | An orchestrator can never touch another orchestrator's agents — not their panes, not their model, nothing | `DECIDED` |
| C4 | `--steal` is the deliberate override for taking from a **live** orchestrator | `DECIDED` |
| C4a | Fencing token: `agent_leases.id` is monotonic; a woken zombie holder cannot clobber the adopter | `DECIDED` |
| C4b | Reads (`status`, `events`) are never gated | `DECIDED` |
| C4c | **Names need no uniqueness.** A name is for the human, the id is for the code. Duplicates are legal; an ambiguous target is a lookup returning more than one row, which asks for the id | `DECIDED` |
| C4e | Spawning **requires** a name. A self-registering session, which has no spawner to name it, gets `<harness>-<first 8 of its id>` | `DECIDED` |
| C4f | **An agent may rename itself** with no holder — acting on itself is not driving. Renaming another agent is | `DECIDED` |
| C4d | **Resolving a name to an id is a first-class operation**, not a per-command lookup — orch resolves the name of a slave, another orch, or anything else the same way, in one place at the boundary | `DECIDED` |
| C5 | A transfer must not disturb the agent — no reset, no re-attach, no context loss | `DECIDED` |
| C6 | `orch events` scope follows ownership, not `spawnedBy` — an adopted fleet must be watchable | `DECIDED` |
| C7 | Live views group by lease; history groups by provenance | `DECIDED` |

## Cq. Queue

| # | item | status |
|---|---|---|
| Cq1 | **Dispatch is push and is driving; claiming is pull and is not.** The gate is on enqueuing into a scope, never on claiming — a pack drains its queue whether or not its orch is alive | `DECIDED` |
| Cq2 | Three scopes chosen at enqueue: **agent**, **pack**, **space** | `DECIDED` |
| Cq3 | Space scope needs **two-sided consent** — publishing is an offer; a pack opts in to consume | `DECIDED` |
| Cq4 | Results go to the enqueuer, not the runner — cross-pack delivery is orch↔orch messaging | `DECIDED` |
| Cq5 | Agent scope requires holding at enqueue; the binding survives adoption | `DECIDED` |
| Cq6 | Retry re-binding follows scope — pack-scoped retries anywhere in the pack, only agent-scoped re-pins | `DECIDED` |
| Cq7 | `origin_workspace` deleted — scope replaces it | `DECIDED` |
| Cq8 | **Today's bug:** `orch work` gives a queued task to any idle agent in the workspace, including another orch's slaves | `BROKEN` |
| Cq9 | Queue CRUD: cancel by the enqueuer or the holder of the targeted agents (human always); edit only by the enqueuer while `queued`; read open | `DECIDED` |
| Cq10 | **Unrunnable** (no live agent in scope) is reapable; **stale** (long-queued but claimable) is surfaced, never deleted on age | `DECIDED` |
| Cq11 | Reaping an unrunnable task is **always deliberate** — never a timer. Unrunnable is a fact about who is alive now, and a new orch changes that | `DECIDED` |
| Cq12 | An orphaned task has three deliberate resolutions: **take it on** (re-scope to the taker's pack), leave, reap | `DECIDED` |
| Cq13 | Adoption carries the queue — pack-scoped tasks come with the agents, nothing to re-parent | `DECIDED` |

## D. Lifecycle

| # | item | status |
|---|---|---|
| D1 | Work survives its spawner, always. No lifetime, no flag, no decision at spawn | `DECIDED` |
| D2 | Holder death costs a **driver**, not a life: finish the task, receive no new work, lease closes `expired` | `DECIDED` |
| D3 | Unheld + idle stays alive and adoptable; retention ages it out from when it went idle | `DECIDED` |
| D4 | Nothing actively working is ever closed on a timer | `DECIDED` |
| D5 | Nested spawn: a grandchild becomes unheld, never falls to the grandparent | `DECIDED` |
| D6 | Three verbs — `abort` the turn, `close` the process, `reap` the record | `DECIDED` |
| D7 | Kill path never routes through the holder and never touches the plexer | `DECIDED` |
| D8 | Adoption announces itself when a session starts where unheld agents exist | `DECIDED` |
| D9 | `orch detach` = release the lease. One meaning: it is nobody's, anyone may adopt | `DECIDED` |
| D10 | Lock-delay cooldown after expiry so a flapping holder cannot thrash ownership | `DESIGN` |
| D11 | Retention: how long an unheld idle agent lives before closing | `OPEN` |
| D12 | A dead orch's queued-but-unstarted tasks **run** — scope already decides it. Only work whose *runner* died is unrunnable; nothing dies because its enqueuer did | `DECIDED` |

## E. Environment and backends

| # | item | status |
|---|---|---|
| E1 | Port seam: delivery and read are orch's; a pane is an optimisation | `DECIDED` |
| E2 | `headless` must return true from `deliver` — `inbox → bridge → ack` needs no screen | `DESIGN` |
| E3 | Branch on declared capabilities, never on a backend id | `DECIDED` |
| E4 | `BackendCapabilities` served end-to-end to the web | `BUILT` |
| E5 | Spawning outside a pane session falls back to a **headless environment** instead of dying | `BUILT` in source, **needs `bun run build:dev`** to take effect |
| E11 | **Everything has an environment** — an agent, a pack, a space. It is not an agent-only property | `DECIDED` |
| E12 | An environment says **where a thing is and what surrounds it**: directory, harness, plexer, space. So none of those live on `agents` — each is its own axis, and changing one is a move | `DECIDED` |
| E8 | **An orch spawning into a plexer it is not itself inside MUST get its own new plexer workspace.** Its pack has to be visibly separate from other orchs' work and from the human's own panes — otherwise its agents read as random agents with no discoverable origin. Allowable, but never unmarked | `DECIDED` |
| E9 | That makes "can hold a grouping of orch's" a **declared capability on the port** — create / rename / close, implemented per plexer and branched on by capability, never by plexer id. orch stays coupled to no plexer. Today it exposes none of it: `orch ws` is list + focus, and `orch spawn --workspace` only picks an existing one | `DESIGN` |
| E10 | The grouping needs a plexer-neutral **name** in the port. herdr calls it a workspace, tmux would call it a session — orch must call it one thing that is neither | `OPEN` |
| E6 | Rename `caps` → `capabilities` daemon-side, ~30 sites across backends/adapters/commands/control/doctor/tests. Do **not** rename the column-width `caps` locals in `src/table.ts`, `src/commands/queue.ts:15`, `src/commands/status.ts:212,427` | `DECIDED` |

### Established by reading the code (2026-08-26)

Facts only. What they imply is still to be decided.

| # | fact |
|---|---|
| Ef1 | **herdr's CLI has `workspace create` / `rename` / `close`; orch never calls any of them.** `HerdrBackend` only lists and focuses (`src/backends/herdr/index.ts:383-393`). Spawn takes an existing workspace or scrapes the caller's own pane (`:33-37`) — which is why a spawn from a plain shell dies with "Could not determine workspace id" |
| Ef2 | The identity key already carries a **minted** id: `<backend>~<workspace>~<mintAgentId()>` (`src/commands/spawn.ts:350,430,478`). The pane id is stored separately as `handle`. J1 is dropping two prefix segments, not re-minting |
| Ef3 | Parsing of that key happens in ~9 consumers, all through `parseIdentity` (`src/backends/identity.ts:113-132`) |
| Ef4 | herdr's surface is a **view API**: tab create/label/rename/close/focus, pane move/zoom/layout/read/send-keys, `agent focus`, `agent rename`, `notification show`, `wait agent-status` |
| Ef5 | **Delivery is orch's**, confirmed: RPC → SQLite outbox → inbox append → agent poll/`fs.watch` → ack. No plexer in it (`src/daemon/outbox.ts:25-50`, `src/presence/inbox.ts:42-59`) |
| Ef6 | **A pane is genuinely required for**: Claude steering (`src/control/dispatch.ts:122-127`), bare-pane targets (`src/daemon/orchd.ts:115-117`), and `orch peek` / pane lifecycle (`src/commands/panes.ts:70-95`) |
| Ef7 | The reverse path — `status.json` / `result.json` → daemon — involves **no plexer at all** (`src/daemon/events.ts:214-290`) |
| Ef8 | Liveness is `process.kill(pid, 0)` (`src/util.ts:149-156`), consumed in ~12 places. herdr additionally reports its own `agent_status`, which orch reads but does not use for policy |
| Ef10 | **The port is one ~30-method interface where most methods are optional** (`src/backends/backend.ts:169-234`), *and* it carries a separate `caps: BackendCapabilities` object (`:18-28`). So capability is declared twice, two different ways: by whether a method exists, and by a flag. That is two mechanisms for one fact — the pair code Rule 9 forbids |
| Ef11 | The port already has a grouping concept: `createGroup` / `groups` / `renameGroup` / `closeGroup` / `focusGroup`, plus `workspaces()` / `focusWorkspace()`. There is **no `createWorkspace`** — the one operation E8 requires is the only one missing |
| Ef12 | `Backend` also carries `panes`, `focusable`, `canSendKeys` as bare readonly booleans alongside `caps` — a **third** way the same kind of fact is declared |
| Ef13 | Coverage is lopsided: herdr implements nearly everything, tmux about half (no `zoom`, `moveToGroup`, `renameGroup`, `closeGroup`, `focusWorkspace`), headless almost nothing and returns `false` from `deliver`/`focus`/`sendKeys` |
| Ef9 | `headless.deliver` returns false because the process takes only its launch prompt and then exits (`src/backends/headless/index.ts:159-164,243-246`) — not because a screen is required |

## F. CLI surface

| # | item | status |
|---|---|---|
| F1 | `orch detach <target>` — release the lease. One meaning; there is no lifetime to change | `DESIGN` |
| F2 | `orch adopt` — claim unheld agents, with the unprompted announcement | `DESIGN` |
| F3 | `orch reap` — the third verb; does not exist today | `DESIGN` |
| F4 | `orch spawn <name>` — naming is **required**; there is no `--detached` and no default name | `DESIGN` |
| F5 | `orch space` — create / rename / delete, replacing `orch ws` | `DESIGN` |
| F6 | Status output: unheld agents must read as "no holder", never as yours | `DESIGN` |
| F7 | Name→id resolution is one boundary operation shared by every command (C4d) | `DESIGN` |

## G. Web

| # | item | status |
|---|---|---|
| G1 | Hydration fix — `node:net` confined to `src/server/daemon.ts` so the client bundle can strip it | `BUILT` |
| G2 | `/api/events` SSE route; real daemon-link state, no fake heartbeat | `BUILT` |
| G3 | One source of truth: orchd + SQLite only, never herdr or a harness | `BUILT` |
| G4 | Daemon location badge — same host / WSL / remote | `BUILT` |
| G5 | Send / Steer wired to real RPCs | `BUILT` |
| G6 | State-change pulse: bright card shadow that decays | `BUILT` |
| G7 | Headless vs paned shown from capabilities, not a backend id | `BUILT` |
| G8 | **Layout system** — only the content region scrolls; correct shadcn `ScrollArea` usage on every page | `DESIGN` — asked for, never designed |
| G9 | Orphan bucket — unheld agents separated from live work, never mixed | `DESIGN` |
| G10 | History view grouped by provenance, distinct from the live view | `DESIGN` |
| G11 | Space and agent names come from orch, never a plexer id | `DESIGN` |

## H. Retention and reaping

| # | item | status |
|---|---|---|
| H1 | Nothing reaps `$ORCH_DIR/agents/` — no `agent_dirs_days` setting exists | `BROKEN` |
| H2 | Thirteen stale presence dirs on disk right now — seven `headless~local~*` plus six `herdr~wF~*` whose pi processes are all dead | `BROKEN` |
| H3 | Reap must walk the provenance tree — refusing to delete an agent with descendants | `DECIDED` |
| H4 | Retention settings: grace window, agent-dir age, history age | `DESIGN` |

## I. Enforcement

Every invariant needs a mechanism. `NONE` means it will be broken.

| # | item | status |
|---|---|---|
| I1 | check-bridge rule: ownership never in `spawned_by`, provenance never in a lease | `DESIGN` |
| I2 | check-bridge rule: no behaviour branches on a plexer or harness id — capabilities only (E3) | `DESIGN` |
| I3 | Test per command: `abort`/`close`/`reap` are never refused for ownership | `DESIGN` |
| I4 | Doctor verifies declared-vs-reality for leases, environments, and orphans | `DESIGN` |
| I5 | `scripts/check-bridge.ts` `extensions` scan must stay recursive or it silently passes | `BUILT` |

## J. Migration

Rule 8: bump the schema, reap, never accept two shapes.

| # | item | status |
|---|---|---|
| J1 | Key change `herdr~wF~x` → bare minted id: ~42 call sites, 12 files | `DECIDED` |
| J2 | Every test fixture carrying a `herdr~w~x` or `wD-p1A` key | `DECIDED` |
| J3 | `spawned.pane` is the current primary key and becomes `agents.id` | `DECIDED` |
| J4 | Presence directory names change; existing dirs are reaped, not migrated | `DECIDED` |
| J5 | `STORE_SCHEMA` and `PRESENCE_SCHEMA` both bump; old stores reaped | `DECIDED` |
| J6 | Sequencing: port seam and columns first, key change second, as its own change | `DECIDED` |

## K. Tooling and environment

| # | item | status |
|---|---|---|
| K1 | Windows and WSL both working at once — Windows owns the install; WSL needs the linux oxlint binding extracted (`npm pack @oxlint/binding-linux-x64-gnu@1.73.0`) | `BROKEN` |
| K2 | Installed `orch` runs packaged `dist/bin/orch.js`; source edits need `bun run build:dev` | — |
| K3 | Two leaked test daemons still alive: pids 366374, 366462 | `BROKEN` |
| K4 | Leaking dispatch tests removed from `test/broker-routing.test.ts` | `BUILT` |

## M. The daemon as the integration layer

| # | item | status |
|---|---|---|
| M1 | **One orchd per machine.** Every client — CLI on either OS, web, harness bridge — dials it and reads nothing else | `DECIDED` |
| M2 | `$ORCH_DIR` is orchd's private backing store, never an address. Discovery is a socket path plus the token file | `DECIDED` |
| M3 | **Today's bug:** `$ORCH_DIR` follows the shell's home (`src/agent/presence.ts:32`) and the CLI renders straight from `$ORCH_DIR/agents/`, so two homes are two universes | `BROKEN` |
| M4 | No OS is privileged. Windows-only and Linux-only machines host locally with no boundary and no executor | `DECIDED` |
| M5 | On a machine running both, one side hosts; the store must be on a native filesystem (`src/doctor/config.ts:71` already refuses DrvFs) | `DECIDED` |
| M6 | Never two daemons at once — machine-wide registration refuses the second start and names the live one; doctor verifies | `DESIGN` |
| M7 | Cross-OS execution is a **backend**, not a peer daemon: start / is-alive / kill. An OS side with no executor is a declared missing capability, never a crash or a silent empty list | `DESIGN` |
| M8 | `orch status --offline` is a second reader of a second source — demote to a doctor affordance or delete | `DESIGN` |
| M9 | Default visibility scoped by plexer workspace (`src/commands/status.ts:187`) — a live fleet vanishes when you change herdr window. Reads are never gated | `BROKEN` |

## L. Outstanding defects

| # | item | status |
|---|---|---|
| L1 | `src/daemon/work-loop.ts:117,223` — `string \| null` assigned to `string \| undefined` | `BROKEN` |
| L2 | `test/close-always.test.ts:40` — unused `workspace` parameter | `BROKEN` |
| L3 | `src/commands/status.ts:232,439` — the zero-rows message asserts "backend down and no agent dirs" without testing either. Printed while herdr was up and 13 agent dirs existed. It must report what it found: agents seen, how many alive, whether the backend answered | `BROKEN` |
| L4 | Status renders dead agents as live work — state, cost and LAST come from `status.json`, which outlives the process. No liveness check against a recorded pid | `BROKEN` |
| L8 | **`workspaceNames()` returns the first TAB's label as a workspace's name** (`src/backends/herdr/index.ts:229-246`). herdr's `workspace list` carries a real `label` and orch never reads it. When the map is empty the code's own comment says *"ids then stand in for names"* — so `wF` is displayed by design where the true label `t3reports` was always available. This is the exact defect ADR-0001 was written about, still live | `BROKEN` |
| L6 | **A worker with no reachable spawner relays through a sibling and burns its turn.** Reproduced live: two of four research agents spent their whole turn on `orch_send` to each other and returned relay chatter instead of their report. `ORCH_SPAWNER` was unset, and nothing told them to park the message | `BROKEN` |
| L7 | `ack.jsonl` is written (`src/presence/inbox.ts:61-72`) and **nothing reads it** — the documented fallback is half-built | `BROKEN` |
| L5 | `orch close --all` is scoped by provenance (`spawnedBySelf`, `src/commands/lifecycle.ts:389`) and per-target close refuses on `spawnedBy` (`:402`). Ending is never gated (D7), and live scoping follows the lease, never provenance (C6) | `BROKEN` |

---

## Open rulings needed

1. **A8** — where a session's name comes from when two sessions share a repo.
2. **D12** — whether any harness can reliably signal a clean exit, or every ending is a crash.
3. **Does `docs/reference/identity-registration.md` move into `TASKS/`** and get deleted from
   `docs/`, or stay where it is? Its content is part of this plan.
