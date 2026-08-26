# Scope — everything this rebuild covers

The full inventory. Nothing discussed gets dropped because it was not written down.

**Status key:** `DECIDED` design settled, not built · `DESIGN` needs designing ·
`OPEN` needs a ruling from Bryan · `BUILT` landed · `BROKEN` a known defect

---

## A. Foundations

| # | item | status |
|---|---|---|
| A1 | Entity model: an orchestrator is an agent; five facts never welded | `DECIDED` — `01-agent-model.md` |
| A2 | Normalized schema: `workspaces`, `agents`, `agent_processes`, `agent_placements`, `agent_leases` | `DECIDED` |
| A3 | Data types chosen from purpose; instants are INTEGER epoch ms; no booleans | `DECIDED` |
| A4 | `STRICT` tables + partial unique indexes for "one live X" | `DECIDED` |
| A5 | `PRAGMA foreign_keys = ON` in `openStore` — absent today, so every FK is decoration | `BROKEN` |
| A6 | `processInstanceMatches(pid, start_token)` as the one liveness primitive | `BUILT` — `src/process-identity.ts`, replaced two divergent copies |
| A7 | Workspace minted from repo root on first spawn; name defaults to the directory name | `DECIDED` |
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
| C4c | An agent's name is unique in a scope that outlives a session — never per-session | `DECIDED` |
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

## E. Placement and backends

| # | item | status |
|---|---|---|
| E1 | Port seam: delivery and read are orch's; a pane is an optimisation | `DECIDED` |
| E2 | `headless` must return true from `deliver` — `inbox → bridge → ack` needs no screen | `DESIGN` |
| E3 | Branch on declared capabilities, never on a backend id | `DECIDED` |
| E4 | `BackendCapabilities` served end-to-end to the web | `BUILT` |
| E5 | Spawning outside a pane session falls back to detached placement instead of dying | `BUILT` in source, **needs `bun run build:dev`** to take effect |
| E6 | Rename `caps` → `capabilities` daemon-side, ~30 sites across backends/adapters/commands/control/doctor/tests. Do **not** rename the column-width `caps` locals in `src/table.ts`, `src/commands/queue.ts:15`, `src/commands/status.ts:212,427` | `DECIDED` |

## F. CLI surface

| # | item | status |
|---|---|---|
| F1 | `orch detach <target>` — promote a live owned agent to detached | `DESIGN` |
| F2 | `orch adopt` — claim unheld agents, with the unprompted announcement | `DESIGN` |
| F3 | `orch reap` — the third verb; does not exist today | `DESIGN` |
| F4 | `orch spawn --detached` | `DESIGN` |
| F5 | `orch ws` / workspace naming and rename against the new model | `DESIGN` |
| F6 | Status output: unheld agents must read as "no holder", never as yours | `DESIGN` |

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
| G11 | Workspace and session names from orch, never a plexer id | `DESIGN` |

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
| I2 | check-bridge rule: lifetime never inferred from a backend id | `DESIGN` |
| I3 | Test per command: `abort`/`close`/`reap` are never refused for ownership | `DESIGN` |
| I4 | Doctor verifies declared-vs-reality for leases, placements, and orphans | `DESIGN` |
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
| L5 | `orch close --all` is scoped by provenance (`spawnedBySelf`, `src/commands/lifecycle.ts:389`) and per-target close refuses on `spawnedBy` (`:402`). Ending is never gated (D7), and live scoping follows the lease, never provenance (C6) | `BROKEN` |

---

## Open rulings needed

1. **A8** — where a session's name comes from when two sessions share a repo.
2. **D12** — whether any harness can reliably signal a clean exit, or every ending is a crash.
3. **Does `docs/reference/identity-registration.md` move into `TASKS/`** and get deleted from
   `docs/`, or stay where it is? Its content is part of this plan.
