# Scope — everything this rebuild covers

The full inventory. Nothing discussed gets dropped because it was not written down.

**Status key:** `DECIDED` design settled, not built · `BUILD` decided elsewhere in this file,
nothing left to decide — just write it · `DESIGN` genuinely undesigned · `OPEN` needs a ruling
from Bryan · `BUILT` landed · `BROKEN` a known defect

`BUILD` exists because a rule was being written once and then re-listed as `DESIGN` in the CLI
or web section, which made settled things look open and got them asked again.

---

## A. Foundations

| # | item | status |
|---|---|---|
| A1 | Entity model: an orch is an agent; **four** facts never welded — identity, provenance, lease, environment. Lifetime is not one of them | `DECIDED` — `01-agent-model.md` |
| A2 | **5NF schema**, past it only where a split deletes a constraint. Lookups `harnesses`, `plexers`, `hosts`; `spaces`; the `agents` hub; `agent_processes`; `agent_leases`; `agent_plexers` (which layer, immutable) and its coordinate `agent_handles`; `agent_spaces`; `agent_tunings` for configuration, which is not environment; and `agent_worktrees` / `agent_endings` for facts only some agents have. Harness and `cwd` are on the hub: a running process cannot change either, and every agent has both | `BUILT` — `src/store/schema.ts` |
| A16 | Non-agent environments: `space_plexers`, `pack_plexers` (E10, E11); `host_plexers` for which plexer is installed on a machine and at what version (E17). Queue: `tasks`, `task_attempts`, `pack_intakes`, `task_states` | `BUILT` — `src/store/schema.ts` |
| A14 | **Environment is a composition, never a table.** What can change gets its own narrow table with its own `since`/`until` and partial unique index; a missing axis is a missing row, never a NULL. What cannot change is a column on the hub — a satellite whose history is always one row is a join answering a question nobody can ask | `DECIDED` |
| A15 | Adding an axis that can change (OS side, remote host, container) is one table plus one line in the composer — zero consumer changes | `DECIDED` |
| A3 | Data types chosen from purpose; instants are INTEGER epoch ms; no booleans | `BUILT` — `src/store/schema.ts` |
| A4 | `STRICT` tables + partial unique indexes for "one live X" | `BUILT` — `src/store/schema.ts` |
| A5 | `PRAGMA foreign_keys = ON` in `openStore` — absent today, so every FK is decoration | `BUILT` — `src/store/connection.ts:103-127` |
| A6 | `processInstanceMatches(pid, start_token)` as the one liveness primitive | `BUILT` — `src/process-identity.ts`, replaced two divergent copies |
| A7 | A **space** is user-created and optional — never minted from a path. With no space set the reachability boundary is the repo root | `DECIDED` — `adr/0001` |
| A8 | Vocabulary (`orch` / `slave` / `pack` / `space`) is a display map, never stored — roles are derived from the tree. User-configurable terms are later polish, but the one-map constraint holds from day one | `DECIDED` |
| A9 | Depth-2 policy enforced at the spawn command; the model itself stays recursive | `DECIDED` |
| A10 | A pack starts at **one** member — a registered session is an orch of a pack of one. Membership is the **provenance root**, so every agent is in exactly one pack at any depth | `DECIDED` |
| A11 | Roles derive from tree position: **orch = pack root, slave = any non-root member** | `DECIDED` |
| A12 | Pack size capped at **10 live members** (1 orch + 9 slaves), configurable in `settings.json`. Enforced at the spawn command, like A9 | `DECIDED` |
| A13 | A spawn past the cap is **blocked** — never queued, never advisory. The block offers the two existing scopes: bind the task to a live slave, or put it on the pack | `DECIDED` |

## B. Identity and registration

The `hello` handshake in detail. Nothing outside `TASKS/` is part of this plan.

| # | item | status |
|---|---|---|
| B1 | `hello` is the only entry point; identity is issued by orchd, never derived by the caller | `BUILT` — `src/daemon/rpc.ts` |
| B9 | `hello` is also where the **environment** is recorded in full — harness, plexer, directory, space, OS side. It is not filled in later or inferred at use, because it is what dictates everything that agent can do (E13) | `DECIDED` |
| B2 | Credential is the `0600` token file in `$ORCH_DIR`; same-uid is the whole trust boundary | `DECIDED` |
| B3 | One mechanism on both transports; TCP is a fallback, never a client class | `DECIDED` |
| B4 | Peer credentials rejected — node exposes neither `SO_PEERCRED` nor process ancestry portably | `DECIDED` |
| B5 | `selfActor()` and the four-branch `spawnerIdentity()` fallback are deleted, not adapted | `DECIDED` |
| B6 | No-daemon commands (`setup`, `doctor`, `help`, `version`, `status --offline`) need no identity because they never write | `DECIDED` |
| B7 | Every agent has an inbox; reading it promptly is the only thing that varies | `DECIDED` |
| B8 | `session_identities` table deleted — a session is an agent row | `BUILT` — `src/store/agent-rows.ts` |

## C. Leases — who may drive what

| # | item | status |
|---|---|---|
| C1 | Lease ops: renew / release / handoff / adoption / expiry. Expiry transfers nothing | `BUILT` — `src/store/lease-rows.ts` |
| C2 | **Authority is the lease:** you may act on an agent if you hold its lease, or if no lease is in force | `DECIDED` |
| C3 | An orch can never touch another orch's agents — not their panes, not their model, nothing | `DECIDED` |
| C4 | `--steal` is the deliberate override for taking from a **live** orch | `DECIDED` |
| C4a | Fencing token: `agent_leases.id` is monotonic; a woken zombie orch cannot clobber the adopter | `DECIDED` |
| C4b | Reads (`status`, `events`) are never gated | `DECIDED` |
| C4c | **Names need no uniqueness.** A name is for the human, the id is for the code. Duplicates are legal; an ambiguous target is a lookup returning more than one row, which asks for the id | `DECIDED` |
| C4e | Spawning **requires** a name. A self-registering session, which has no spawner to name it, gets `<harness>-<first 8 of its id>` | `DECIDED` |
| C4f | **An agent may rename itself** with no lease in force — acting on itself is not driving. Renaming another agent is | `DECIDED` |
| C4d | **Resolving a name to an id is a first-class operation**, not a per-command lookup — orch resolves the name of a slave, another orch, or anything else the same way, in one place at the boundary | `DECIDED` |
| C5 | A transfer must not disturb the agent — no reset, no re-attach, no context loss | `DECIDED` |
| C6 | `orch events` scope follows the lease, not `spawnedBy` — an adopted fleet must be watchable | `BUILT` — `src/commands/events.ts` |
| C7 | Live views group by lease; history groups by provenance | `DECIDED` |

## Cq. Queue

Modelled in `06-schema.md`: `tasks`, `task_attempts`, `pack_intakes`, and the `task_states` view.

| # | item | status |
|---|---|---|
| Cq1 | **Dispatch is push and is driving; claiming is pull and is not.** The gate is on enqueuing into a scope, never on claiming — a pack drains its queue whether or not its orch is alive | `DECIDED` |
| Cq2 | Three scopes chosen at enqueue: **agent**, **pack**, **space** | `DECIDED` |
| Cq3 | Space scope needs **two-sided consent** — publishing is an offer; a pack opts in to consume | `DECIDED` |
| Cq4 | Results go to the enqueuer, not the runner — cross-pack delivery is orch↔orch messaging | `DECIDED` |
| Cq5 | Agent scope requires leasing it at enqueue; the binding survives adoption | `DECIDED` |
| Cq6 | Retry re-binding follows scope — pack-scoped retries anywhere in the pack, only agent-scoped re-pins | `DECIDED` |
| Cq7 | `origin_workspace` deleted — scope replaces it | `DECIDED` |
| Cq8 | **Today's bug:** `orch work` gives a queued task to any idle agent in the workspace, including another orch's slaves | `BUILT` — `src/daemon/work-loop.ts` |
| Cq9 | Queue CRUD: cancel by the enqueuer or the orch leasing the targeted agents (human always); edit only by the enqueuer while `queued`; read open | `DECIDED` |
| Cq10 | **Unrunnable** (no live agent in scope) is reapable; **stale** (long-queued but claimable) is surfaced, never deleted on age | `DECIDED` |
| Cq11 | Reaping an unrunnable task is **always deliberate** — never a timer. Unrunnable is a fact about who is alive now, and a new orch changes that | `DECIDED` |
| Cq12 | An orphaned task has three deliberate resolutions: **take it on** (re-scope to the taker's pack), leave, reap | `DECIDED` |
| Cq13 | Adoption carries the queue — pack-scoped tasks come with the agents, nothing to re-parent | `DECIDED` |
| Cq14 | **A claim is an attempt row, and a retry is the next one.** `retries`, `last_error` and `agent_key` leave the task; the claim is an INSERT guarded by `one_open_attempt`, not a conditional UPDATE. Cq6 stops being enforceable code and becomes unrepresentable | `BUILT` — `src/store/task-rows.ts` |
| Cq15 | **State is derived** (`task_states`), never stored. A stored `state` is a second truth beside the attempts that produce it | `BUILT` — `src/store/schema.ts` |
| Cq16 | Scope is three typed nullable references with `exactly one non-null`, never `(kind, id)` — a polymorphic pair cannot carry a foreign key | `BUILT` — `src/store/task-rows.ts` |

## D. Lifecycle

| # | item | status |
|---|---|---|
| D1 | Work survives its spawner, always. No lifetime, no flag, no decision at spawn | `DECIDED` |
| D2 | Holder death costs a **driver**, not a life: finish the task, receive no new work, lease closes `expired` | `DECIDED` |
| D3 | Unleased + idle stays alive and adoptable, indefinitely. Nothing ages it out | `DECIDED` |
| D4 | Nothing actively working is ever closed on a timer | `DECIDED` |
| D5 | Nested spawn: a grandchild becomes unleased, never falls to the grandparent | `DECIDED` |
| D6 | Three verbs — `abort` the turn, `close` the process, `reap` the record | `BUILT` — `src/commands/lease.ts` |
| D7 | Kill path never routes through the leasing orch and never touches the plexer | `DECIDED` |
| D8 | Adoption announces itself when a session starts where unleased agents exist | `DECIDED` |
| D9 | `orch detach` = release the lease. One meaning: it is nobody's, anyone may adopt | `BUILT` — `src/commands/lease.ts` |
| D10 | Lock-delay cooldown after expiry — **dropped.** C4a (monotonic `agent_leases.id` as fencing token) already makes a woken zombie harmless and C1 says expiry transfers nothing; a cooldown would be a second mechanism for a solved problem | `BUILT` — nothing to build; C4a |
| D11 | **Two things close an agent: the user, or the orch that spawned it. Nothing else, ever.** No timer, no retention window, no sweep, no idle rule, whatever state it is in and however long it sits | `DECIDED` |
| D14 | **Nothing reaps an agent record on a timer either.** A record is deleted when the user says so. The only clock is a long fallback so the store cannot grow without bound, measured in months, not a cleanup policy dressed as one | `DECIDED` |
| D12 | A dead orch's queued-but-unstarted tasks **run** — scope already decides it. Only work whose *runner* died is unrunnable; nothing dies because its enqueuer did | `DECIDED` |
| D13 | **Clean exit needs no harness signal.** An `agent_endings` row exists only for an agent that ended; its `closed_by` records who asked, and NULL means nobody did, so it died. Both facts are orch's own, so the answer never depends on a harness telling the truth about its own exit | `DECIDED` |

## E. Environment and backends

| # | item | status |
|---|---|---|
| E1 | Port seam: delivery and read are orch's; a pane is an optimisation | `DECIDED` |
| E2 | `headless` must return true from `deliver` — `inbox → bridge → ack` needs no screen | `BUILD` — `07-port-seam.md` |
| E3 | Branch on what the environment provides, never on a backend id | `DECIDED` |
| E4 | `BackendCapabilities` served end-to-end to the web | `BUILT` |
| E5 | Spawning outside a pane session falls back to a **headless environment** instead of dying | `BUILT` in source, **needs `bun run build:dev`** to take effect |
| E11 | **Everything has an environment** — an agent, a pack, a space. It is not an agent-only property | `DECIDED` |
| E12 | An environment says **where a thing is and what surrounds it**: directory, harness, plexer, space. Where it can change it is an axis and changing it is a move; the directory and the harness cannot change under a running process, so they sit on `agents` | `DECIDED` |
| E8 | **An orch spawning into a plexer it is not itself inside MUST get its own new plexer workspace.** Its pack has to be visibly separate from other orchs' work and from the human's own panes — otherwise its agents read as random agents with no discoverable origin. Allowable, but never unmarked | `DECIDED` |
| E9 | That makes "can hold orch's structure" one of the things an environment provides — create / rename / close a home for a space or a pack, implemented per plexer and branched on by what it provides, never by plexer id. orch stays coupled to no plexer. Today it exposes none of it: `orch ws` is list + focus, and `orch spawn --workspace` only picks an existing one. The coordinate it returns lands in `space_plexers` / `pack_plexers` | `BUILD` — `07-port-seam.md` |
| E10 | **There is no new noun, and there must not be one.** The thing being grouped is already a **space** or a **pack**; what the plexer groups by is a coordinate orch stores and hands back, never says. The port operates on "this space's home" / "this pack's home"; `space_plexers` and `pack_plexers` hold the coordinate. Minting an orch word for a plexer coordinate is exactly how `wF` got printed as a name | `DECIDED` — `06-schema.md` |
| E6 | Rename `caps` → `capabilities` daemon-side, ~30 sites across backends/adapters/commands/control/doctor/tests. Do **not** rename the column-width `caps` locals in `src/table.ts`, `src/commands/queue.ts:15`, `src/commands/status.ts:212,427` | `BUILT` — `src/backends/backend.ts` |
| E13 | **The environment dictates what is possible — no oxygen, no fire.** `hello` records where the agent is: harness, plexer, directory, space, OS side. What it can do follows from that and is never itself recorded: no capability rows, and nothing declared to orch by a plexer. Nothing is discovered or negotiated at the moment of acting either. No method-presence check and no loose flags — Ef10's optional methods and Ef12's booleans are both deleted | `DECIDED` |
| E14 | **No fallback logic and no unsupported-operation error path inside orch.** orch never reaches for something the environment lacks, so there is nothing to catch. "Can't" is only ever said to a *human* who asked, and it is an answer, not a failure: `orch zoom` on a headless agent replies that the agent has no pane | `DECIDED` |
| E15 | What is possible changes when **what is there** changes — a move (a new environment record) or an upgrade (a new `host_plexers` row). Neither is a negotiation at the moment of acting | `DECIDED` |
| E16 | **A failure reaches whoever asked, including an agent.** `herdrBestEffort` and every other call that turns an error into a boolean are deleted. An agent that asked orch to do something gets the real failure text back through its own channel, not a quiet false. orch never converts a failure into a boolean (L12) | `DECIDED` |
| E17 | **The plexer's version is a host fact, not an agent's** — one install serves every agent in it, so it lives in `host_plexers`, not on `agent_plexers`. orch declares which versions of each integration it works with, and doctor compares that against what is installed (I4) | `BUILT` — `src/store/schema.ts:59` |
| E18 | **Version drift is reported at registration, not at the moment a command fails.** A new agent registering into herdr 0.8.2 when orch was built for 0.7.x is told so immediately, naming both versions and saying to update orch. Finding out because delivery silently stopped working is the failure this replaces | `BUILT` — `src/daemon/rpc.ts:260-280` |
| E19 | An integration below 1.0 will break compatibly-shaped things without warning. orch pins a **supported range** per integration rather than a floor, so an untested newer version is reported rather than assumed to work | `BUILT` — `src/backends/versions.ts:1-11,62-81` |

### Established by reading the code (2026-08-26)

Facts only. What they imply is still to be decided. Anything marked **superseded** was true when
recorded and is not now; the replacement is named in place.

#### herdr 0.8.2 (read 2026-08-27)

| # | fact |
|---|---|
| Eh1 | `herdr workspace create` **exists**, with `report-metadata` for display-only workspace metadata. E8 is unblocked (supersedes Ef11) |
| Eh2 | `herdr worktree list / create / open / remove` — git worktree-backed workspaces are now herdr's to make. orch records a worktree agent in `agent_worktrees` and creates them itself |
| Eh3 | **`herdr integration install / uninstall / status`** writes a per-harness state hook into that harness's own config dir — `~/.claude/hooks/herdr-agent-state.sh`, `~/.pi/agent/extensions/herdr-agent-state.ts`, and 15 more. **The same directories orch's own `extensions/<harness>/` artifacts install into.** Two systems writing hooks into one harness config dir, neither aware of the other |
| Eh4 | Right now **every integration reads `not installed`** except `opencode`, which reads `outdated (v7 < v10)`. herdr cannot classify agent state without them |
| Eh5 | `herdr api schema` prints the bundled API schema and `herdr api snapshot` the live session. A machine-readable surface exists; scraping `--help` is no longer the only option |
| Eh6 | Public ids are `w1` (workspace), `w1:t1` (tab), `w1:p1` (pane). `wF` is a **public id**, never a label — exactly what ADR-0001 and L8 are about |
| Eh7 | **A pane moved to another workspace gets a NEW workspace-qualified pane id.** The old one resolves only for the moved process's inherited context. A handle is therefore not stable across a move — which is why the coordinate is `agent_handles`, on its own timeline, while `agent_plexers` records the plexer itself and never changes |
| Eh8 | herdr agent names match `[a-z][a-z0-9_-]{0,31}`, must be unique among live agents, and are **cleared when the agent exits, is released, or is replaced**. A herdr name is herdr's and cannot carry orch identity |
| Eh9 | herdr agent states are `idle`, `working`, `blocked`, `done`, `unknown`. `idle` vs `done` differs only by whether the tab was *seen* in the focused UI, and CLI reads do not mark it seen. `unknown` does not mean finished |
| Eh10 | `herdr agent prompt` submits a prompt, distinct from `pane send-text` and `send-keys`. `herdr agent start` starts an agent in an **existing** pane and never creates layout |
| Eh11 | `HERDR_ENV=1` is the in-session gate. herdr injects `HERDR_WORKSPACE_ID`, `HERDR_TAB_ID`, `HERDR_PANE_ID` into every managed pane |
| Eh12 | **`agent start` no longer creates layout.** Signature is `agent start <NAME> --kind <KIND> --pane <ID>`, and it requires a pane already sitting at an interactive shell prompt. `--workspace`, `--cwd` and `--no-focus` are gone. Spawn is now two steps: orch makes the pane, then starts the agent in it |
| Eh13 | `--kind` is a closed list of 22 values (`pi`, `claude`, `codex`, `omp`, …) — herdr's harness names, which orch must map to rather than assume match |
| Eh14 | **herdr 0.8.0 breaking:** public workspace/tab/pane ids became short stable handles (`w1`, `w1:t1`, `w1:p1`), and closed ids no longer retarget later resources |
| Eh15 | **herdr 0.7.5 breaking:** `agent send` → `agent send-keys`; top-level `wait` → `agent wait` + `pane wait-output`; agent commands take only a live agent name or the hosting pane id |
| Eh16 | `agent prompt <TARGET> <TEXT>` submits a prompt in **one** call, with optional `--wait --until <state> --timeout`. It replaces send-text-then-Enter |

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
| Ef10 | **The port is one ~30-method interface where most methods are optional** (`src/backends/backend.ts:169-234`), *and* it carries a separate `caps: BackendCapabilities` object (`:18-28`). So capability is declared twice, two different ways: by whether a method exists, and by a flag. That is two mechanisms for one fact — the pair code Rule 9 forbids. **Resolved by E13** |
| Ef11 | ~~There is no `createWorkspace`, the one operation E8 requires.~~ **Superseded 2026-08-27 by herdr 0.8.2: `herdr workspace create` exists**, alongside `list` / `get` / `focus` / `rename` / `close` / `report-metadata`. Nothing external blocks E8 any more. orch's port still has `createGroup` / `groups` / `renameGroup` / `closeGroup` / `focusGroup` and `workspaces()` / `focusWorkspace()`, and still never calls create |
| Ef12 | `Backend` also carries `panes`, `focusable`, `canSendKeys` as bare readonly booleans alongside `caps` — a **third** way the same kind of fact is declared. **Resolved by E13** |
| Ef13 | Coverage is lopsided: herdr implements nearly everything, tmux about half (no `zoom`, `moveToGroup`, `renameGroup`, `closeGroup`, `focusWorkspace`), headless almost nothing and returns `false` from `deliver`/`focus`/`sendKeys` |
| Ef9 | `headless.deliver` returns false because the process takes only its launch prompt and then exits (`src/backends/headless/index.ts:159-164,243-246`) — not because a screen is required |

## F. CLI surface

| # | item | status |
|---|---|---|
Every verb is defined in `03-vocabulary.md` § Verbs. These rows are the command surface, not a
second place to decide what a verb means.

| # | item | status |
|---|---|---|
| F1 | `orch detach <target>` — release the lease. One meaning; there is no lifetime to change | `BUILT` — `src/commands/lease.ts` |
| F2 | `orch adopt` — take the lease on unleased agents, with the unprompted announcement | `BUILT` — `src/commands/lease.ts` |
| F3 | `orch reap` — the third verb; does not exist today | `BUILT` — `src/commands/lease.ts` |
| F4 | `orch spawn <name>` — naming is **required**; there is no `--detached` and no default name | `BUILD` — C4e, F4 |
| F5 | `orch space` — create / rename / delete, replacing `orch ws` | `BUILD` — `03-vocabulary.md`, `adr/0001-space-not-workspace.md` |
| F6 | Status output: unleased agents must read as "no orch driving it", never as yours | `BUILD` — D3 |
| F7 | Name→id resolution is one boundary operation shared by every command | `BUILD` — C4d |

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
| G8 | **Layout system** — only the content region scrolls; correct shadcn `ScrollArea` usage on every page | `BUILD` — the row is the spec: one app shell, header and sidebar fixed, `ScrollArea` wraps only the content region on every route |
| G9 | Orphan bucket — unleased agents separated from live work, never mixed | `BUILD` — D3, D8 |
| G10 | History view grouped by provenance, distinct from the live view | `BUILD` — C7 |
| G11 | Space and agent names come from orch, never a plexer id | `BUILD` — E10, `adr/0001` |

## H. Retention and reaping

| # | item | status |
|---|---|---|
| H1 | **Corrected — the machinery exists.** `src/config.ts:63` carries seven windows including `agent_dirs_days`, `src/daemon/retention.ts:62-68` consumes all seven, `src/daemon/work-loop.ts:197-207` sweeps them. The defect is the **clock**: `reapDeadPresenceDirs` (`src/presence/store.ts:194`) ages a directory by its filesystem `mtime` instead of by when the agent ended | `BUILT` — `src/presence/store.ts` |
| H2 | Thirteen stale presence dirs on disk right now — seven `headless~local~*` plus six `herdr~wF~*` whose pi processes are all dead | `BUILT` — `test/retention.test.ts` |
| H3 | Reap must walk the provenance tree — refusing to delete an agent with descendants | `DECIDED` |
| H4 | Retention settings settled: `ended_agents_days` 90 (the long fallback), `queue_days` 14, `events_days` 7, `runs_days` 30, `outbox_days` 7, `logs_days` 7. Every one deletes a record of something already ended. No new columns — every clock is already recorded | `BUILT` — `src/config.ts` |
| H9 | Agent records get the long fallback; orch's own byproducts (events, outbox, runs, logs) keep short windows. An agent is the user's, a delivered outbox row is orch's own litter, and they do not get the same treatment | `BUILT` — `src/daemon/retention.ts:40-48` |
| H7 | **Every retention window is user-configurable in `settings.json`, individually.** The numbers in H4 are defaults, never constants in the source. How long a user's own records are kept is the user's call, and a value they cannot see or change is orch deciding it for them | `BUILT` — `src/config.ts` |
| H8 | A window the user has not set falls back to its default alone — setting one never disturbs another, and there is no all-or-nothing retention block | `BUILT` — `src/config.ts` |
| H5 | `agent_dirs_days` is retired into `ended_agents_days`: one window covering the row, its satellites and its presence directory, keyed on `agent_endings.ended_at`. Two names for one age is how they drift apart | `BUILT` — `src/config.ts` |
| H6 | `identities_days` is deleted along with `session_identities` (B8) | `BUILT` — `src/config.ts` |
| H10 | **A slave never reaps or recreates the store.** Destructive store maintenance (schema-mismatch reap/recreate, `orch clean`-class sweeps of records it does not own) is reserved for the user or the pack's orch; a slave hitting a store it cannot open ERRORS, naming the skew and the fix, and mutates nothing. A schema-mismatch recreate is additionally refused for *everyone* while any live presence exists — identity of living agents is never collateral. Why: 2026-08-27, a slave running dev-tree code stamped the live store 6, and the installed schema-5 CLI silently reaped and recreated it, orphaning 12 live agents | `BUILD` — B2, D11, Rule 8 |

## I. Enforcement

Every invariant needs a mechanism. `NONE` means it will be broken.

| # | item | status |
|---|---|---|
| I1 | check-bridge rule: a lease never in `spawned_by`, provenance never in a lease | `BUILD` — C7 |
| I2 | check-bridge rule: no behaviour branches on a plexer or harness id, and none checks whether a method exists. Capabilities read from the environment, only (E3, E13) | `BUILD` — E3, E13 |
| I3 | Test per command: `abort`/`close`/`reap` are never refused because of a lease | `BUILD` — C2, D7 |
| I4 | Doctor verifies declared-vs-reality for leases, environments, and orphans | `BUILD` — `07-port-seam.md` |
| I5 | `scripts/check-bridge.ts` `extensions` scan must stay recursive or it silently passes | `BUILT` |
| I6 | Test: a pack-scoped task that fails on agent X is claimable by agent Y in the same pack. This is the Cq6 regression, and it should be impossible to write the bug back in without deleting the test | `BUILD` — Cq6, Cq14 |
| I7 | Test: two concurrent claims of one task — one wins, one raises. The guarantee is the `one_open_attempt` index, so the test must exercise it, not a code path around it | `BUILD` — Cq14 |
| I8 | Doctor: a task whose scope names a row that no longer exists is surfaced as unrunnable, never auto-deleted (Cq11) | `BUILD` — Cq11, `NOTES.md` |

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
| J7 | `queue` → `tasks` + `task_attempts`: `TaskRec` loses `workspace`, `retries`, `lastError`, `agentKey` and gains an attempt list. `src/queue.ts`, `src/store/queue-rows.ts`, `src/commands/queue.ts`, the work loop and every queue fixture. Old rows are reaped, never migrated (Rule 8) | `DECIDED` — `adr/0002` |
| J8 | `retention.identities_days` and `retention.agent_dirs_days` are deleted from `settings.json`; `ended_agents_days` replaces them | `BUILT` — `src/config.ts` |
| J9 | `TASKS/08-identity-registration.md` moves into `TASKS/` (as `08-identity-registration.md`) and is deleted from `docs/`; every reference repointed. Nothing about this refactor lives outside `TASKS/` | `BUILD` — README |

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
| M6 | Never two daemons at once — machine-wide registration refuses the second start and names the live one; doctor verifies | `BUILD` — `NOTES.md` |
| M7 | Cross-OS execution is a **backend**, not a peer daemon: start / is-alive / kill. An OS side with no executor is one nothing can run on — an answer, never a crash or a silent empty list | `BUILD` — `NOTES.md`, `03-vocabulary.md` |
| M8 | `orch status --offline` is a second reader of a second source — demote to a doctor affordance or delete | `DESIGN` |
| M9 | Default visibility scoped by plexer workspace (`src/commands/status.ts:187`) — a live fleet vanishes when you change herdr window. Reads are never gated | `BUILT` — `src/commands/status.ts` |

## L. Outstanding defects

| # | item | status |
|---|---|---|
| L1 | `src/daemon/work-loop.ts:117,223` — `string \| null` assigned to `string \| undefined` | `BUILT` — `src/daemon/work-loop.ts` |
| L2 | `test/close-always.test.ts:40` — unused `workspace` parameter | `BROKEN` |
| L3 | `src/commands/status.ts:232,439` — the zero-rows message asserts "backend down and no agent dirs" without testing either. Printed while herdr was up and 13 agent dirs existed. It must report what it found: agents seen, how many alive, whether the backend answered | `BUILT` — `src/commands/status.ts` |
| L4 | Status renders dead agents as live work — state, cost and LAST come from `status.json`, which outlives the process. No liveness check against a recorded pid | `BUILT` — `src/commands/status.ts` |
| L8 | **`workspaceNames()` returned the first TAB's label as a workspace's name.** herdr's `workspace list` carries the real `label` (`{"workspace_id":"wF","label":"t3reports"}`) and orch never read it, so `wF` was displayed where `t3reports` was one field away. `HerdrWorkspace.label` was already in the type and `workspaces()` already fetched it; the name map simply looked at tabs instead | `FIXED` — reads `workspaces()` |
| L6 | **A slave with no reachable spawner relays through a sibling and burns its turn.** Reproduced live: two of four research agents spent their whole turn on `orch_send` to each other and returned relay chatter instead of their report. `ORCH_SPAWNER` was unset, and nothing told them to park the message | `BROKEN` |
| L7 | `ack.jsonl` is written (`src/presence/inbox.ts:61-72`) and **nothing reads it** — the documented fallback is half-built | `BROKEN` |
| L9 | **`src/backends/herdr/index.ts:215` calls `agent send`, removed in herdr 0.7.5.** This is the delivery path. Replacement is `agent prompt <target> <text>`, one call, no separate Enter (Eh15, Eh16) | `BUILT` — `src/backends/herdr/index.ts` |
| L10 | **`src/backends/herdr/index.ts:343` calls top-level `wait agent-status`, removed in 0.7.5.** Replacement is `agent wait <target> --until <state> --timeout <ms>`; note `--status` became `--until` | `BUILT` — `src/backends/herdr/index.ts` |
| L11 | **`src/backends/herdr/index.ts:148` calls `agent start <name> --workspace --cwd --no-focus`.** None of those flags exist. `agent start` now needs `--kind` and `--pane`, and never creates layout — so spawn must create the pane first (Eh12) | `BUILT` — `src/backends/herdr/index.ts` |
| L12 | **`herdrBestEffort` swallows every one of these failures silently**, which is why three removed commands broke nothing visibly. It is the exact "silently no-ops" that E14 forbids | `BUILT` — `src/backends/herdr/cli.ts` |
| L5 | `orch close --all` is scoped by provenance (`spawnedBySelf`, `src/commands/lifecycle.ts:389`) and per-target close refuses on `spawnedBy` (`:402`). Ending is never gated (D7), and live scoping follows the lease, never provenance (C6) | `BUILT` — `src/commands/lifecycle.ts` |

---

## Open rulings needed

None. (`TASKS/08-identity-registration.md` moves into `TASKS/` and is deleted from `docs/` —
README: nothing about this refactor lives outside `TASKS/`. Tracked as J9 below.)

### Closed, and where the answer already lived

| was listed as open | the answer, and where it was |
|---|---|
| a session's name when two sessions share a repo | **C4e** — a self-registering session is named `<harness>-<first 8 of its id>`, and **C4c** — names need no uniqueness. Two sessions in one repo cannot collide, because ids differ; if the names ever read alike, that is legal and the id disambiguates |
| whether a harness can signal a clean exit | **D13** — it does not have to. An `agent_endings` row says it ended; its `closed_by` says whether orch asked, and NULL means it died |
| a plexer-neutral name for the grouping | **E10** — there is none, deliberately. It is a space or a pack, and the plexer's own coordinate is stored, never named |
| how long an unleased idle agent lives | **D11** — as long as you leave it. Nothing closes a live agent but the user or the orch that spawned it, so there is no number to pick |
