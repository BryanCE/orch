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
| A1 | Entity model: an orch is an agent; **four** facts never welded — identity, provenance, lease, environment. Lifetime is not one of them | `BUILT` — the composer `src/store/agent-view.ts:163` reads the four apart (`AgentView` at `:57`); identity is the minted id alone, `src/backends/identity.ts:9-30`; the welded `spawned` and `ownership` tables and `src/store/spawned-rows.ts` / `src/store/ownership-rows.ts` are DELETED, and no file imports them. Tests: `test/agent-model-unwelded.test.ts` (4), `test/identity-is-not-environment.test.ts` (4), `test/agent-view.test.ts` (9) |
| A2 | **5NF schema**, past it only where a split deletes a constraint. Lookups `harnesses`, `plexers`, `hosts`; `spaces`; the `agents` hub; `agent_processes`; `agent_leases`; `agent_plexers` (which layer, immutable) and its coordinate `agent_handles`; `agent_spaces`; `agent_tunings` for configuration, which is not environment; and `agent_worktrees` / `agent_endings` for facts only some agents have. Harness and `cwd` are on the hub: a running process cannot change either, and every agent has both | `BUILT` — `src/db/schema.ts` |
| A16 | Non-agent environments: `space_plexers`, `pack_plexers` (E10, E11); `host_plexers` for which plexer is installed on a machine and at what version (E17). Queue: `tasks`, `task_attempts`, `pack_intakes`, `task_states` | `BUILT` — `src/db/schema.ts` |
| A14 | **Environment is a composition, never a table.** What can change gets its own narrow table with its own `since`/`until` and partial unique index; a missing axis is a missing row, never a NULL. What cannot change is a column on the hub — a satellite whose history is always one row is a join answering a question nobody can ask | `BUILT` — each axis is its own narrow satellite in `src/db/schema.ts`, composed (never stored flat) by `environmentOf` at `src/store/agent-view.ts:141`; the welded `spawned` row is deleted. Tests: `test/agent-view.test.ts` — "an agent with no environment rows has every axis absent, not defaulted", "each axis composes independently, and moving one leaves identity untouched", "tuning is not environment: it survives a move" |
| A15 | Adding an axis that can change (OS side, remote host, container) is one table plus one line in the composer — zero consumer changes | `BUILT` — `ENVIRONMENT_AXES` (`src/store/agent-view.ts:129`) is the only place the axis set is written; `AgentEnvironment` is a mapped type derived from it (`:35`) and `environmentOf` folds over it (`:141`), so an added axis is one entry and nothing else. Tests: `test/agent-view.test.ts` — "the axis list is the only place every axis is enumerated", "the composed shape is exactly the axis list, with nothing extra and nothing missing" |
| A3 | Data types chosen from purpose; instants are INTEGER epoch ms; no booleans | `BUILT` — `src/db/schema.ts` |
| A4 | Partial unique indexes for "one live X" — 10 of them, emitted by drizzle-kit (`drizzle/*/migration.sql`). **`STRICT` was removed on Bryan's ruling 2026-08-29**: it needed a hand-written post-pass over the generated migration, and one schema file with nothing on top outranks it | `BUILT` — `src/db/schema.ts` |
| A5 | `PRAGMA foreign_keys = ON` in `openStore` — absent today, so every FK is decoration | `BUILT` — `src/store/connection.ts:103-127` |
| A6 | `processInstanceMatches(pid, start_token)` as the one liveness primitive | `BUILT` — `src/process-identity.ts`, replaced two divergent copies |
| A7 | A **space** is user-created and optional — never minted from a path. With no space set the reachability boundary is the repo root | `BUILT` — `orch space create` (`src/commands/space.ts:107`) is the ONLY writer of a `spaces` row; `recordSpawned`'s silent `INSERT OR IGNORE` is deleted for `requireSpace` (`src/presence/store.ts:205`), which refuses before any write. `checkWall` falls back to the repo root when no space is set (`src/policy/space.ts:76-90`), and `entities.ts:203` no longer reads the plexer's workspace as orch's space. Tests: `test/space-policy.test.ts` — "placing an agent in a space nobody created is refused, not minted", "recording a spawn never conjures the space it names", "two unspaced agents in the SAME repo root can reach each other", "two unspaced agents in DIFFERENT repo roots cannot", "a space still walls, and it outranks the repo root", "an agent placed in no space reports none, even inside a plexer workspace" |
| A8 | Vocabulary (`orch` / `slave` / `pack` / `space`) is a display map, never stored — roles are derived from the tree. User-configurable terms are later polish, but the one-map constraint holds from day one | `BUILT` — `src/policy/vocabulary.ts`: `VOCABULARY` (`:15`) is the one map, `term()` (`:31`) the only way to render a word, `roleOf()` (`:44`) reads role off `rootAgentId === id` (A11's tree position). No table carries a role column and no module spells a role term itself — 17 hard-coded strings across 7 files now build from `term()`. Tests: `test/vocabulary.test.ts` (5) |
| A9 | Depth-2 policy enforced at the spawn command; the model itself stays recursive | `BUILT` — `src/commands/spawn.ts:398-412` walks the `spawnedBy` chain and refuses at depth ≥ 2; the schema stays recursive |
| A10 | A pack starts at **one** member — a registered session is an orch of a pack of one. Membership is the **provenance root**, so every agent is in exactly one pack at any depth | `BUILT` — `insertAgent` (`src/store/agent-rows.ts:98`) roots an unspawned agent at ITSELF and inherits the spawner's root at any depth, enforced by the `agents_root_is_self` check (`src/db/schema.ts:128`); `packMembers` (`:150`) reads membership off `rootAgentId`, and `queue.ts` scopes through the same column — there is no second path. Tests: `test/pack-membership.test.ts` (6) |
| A11 | Roles derive from tree position: **orch = pack root, slave = any non-root member** | `BUILT` — `roleOf()` (`src/policy/vocabulary.ts:44`) is `rootAgentId === id ? "orch" : "slave"`, read never stored; no table carries a role column. Tests: `test/vocabulary.test.ts` — "a role is derived from the tree, never stored", "no table carries a role column", "renaming an agent or moving its lease never changes its role"; `test/pack-membership.test.ts` — "membership is inherited from the spawner at any depth, never re-rooted" |
| A12 | Pack size capped at **10 live members** (1 orch + 9 slaves), configurable in `settings.json`. Enforced at the spawn command, like A9 | `BUILT` — `src/commands/spawn.ts:414-443`, `fleet.pack_cap` (`src/config.ts:72`); counts only live presence |
| A13 | A spawn past the cap is **blocked** — never queued, never advisory. The block offers the two existing scopes: bind the task to a live slave, or put it on the pack | `BUILT` — `SPAWN_POLICY_OFFERS` (`src/commands/spawn.ts:389`) names both; `:445` refuses before any pane, tab, worktree or queue entry is allocated. `test/spawn-policy.test.ts` + `test/spawn-limits.test.ts` (19 pass) |

## B. Identity and registration

The `hello` handshake in detail. Nothing outside `TASKS/` is part of this plan.

| # | item | status |
|---|---|---|
| B1 | `hello` is the only entry point; identity is issued by orchd, never derived by the caller | `BUILT` — `src/daemon/rpc.ts` |
| B9 | `hello` is also where the **environment** is recorded in full — harness, plexer, directory, space, OS side. It is not filled in later or inferred at use, because it is what dictates everything that agent can do (E13) | `BUILT` — `helloClaim` (`src/daemon/rpc.ts:790`) now carries `space`, `hostName` and `hostOs` alongside harness/cwd/plexer, and `helloIdentity` records what the CALLER stated instead of observing daemon-side (`claimedHostOs`, `:283`). `placeSession` (`src/store/agent-rows.ts:201`) writes the session's own `agent_plexers` and `agent_spaces` at registration — `host_plexers` says what is installed on a machine, not where this agent is. Tests: `test/hello-environment.test.ts` (5) |
| B2 | Credential is the `0600` token file in `$ORCH_DIR`; same-uid is the whole trust boundary | `BUILT` — the token is minted `0600` with the mode reapplied (`src/daemon/rpc.ts:623`), and `$ORCH_DIR` is now `0700`: `ensurePrivateDir` (`src/util.ts`) replaced seven bare `mkdirSync(orchDir, { recursive: true })` calls that took the umask, leaving everything beside the token world-readable. Refusal path covered by `test/daemon-rpc.test.ts:260,267`. Tests: `test/daemon-credential.test.ts` (5) |
| B3 | One mechanism on both transports; TCP is a fallback, never a client class | `BUILT` — `attachFor(transport)` (`src/daemon/rpc.ts:651`) builds one handler for both and `handleLine` carries the transport as data only; no handler branches on it (the sole consumer is `orchd.ts:481`, which reports it). Loopback TCP is bound BESIDE the unix socket and only where a client cannot dial one (`companionTcpPort`, `:723`). Tests: `test/daemon-transport-parity.test.ts` (4) — identical refusal, identical code, identical identity across both |
| B4 | Peer credentials rejected — node exposes neither `SO_PEERCRED` nor process ancestry portably | `BUILT` — no `SO_PEERCRED`, `getsockopt`, `getpeereid` or `process.ppid` appears anywhere in `src/daemon/`, and a caller the daemon has no relationship to is accepted on the token alone. Tests: `test/daemon-no-peer-credentials.test.ts` (3) |
| B5 | `selfActor()` and the four-branch `spawnerIdentity()` fallback are deleted, not adapted | `BUILT` — `src/identity/self.ts`; `spawnerIdentity()` is one lookup |
| B6 | No-daemon commands (`setup`, `doctor`, `help`, `version`, `status --offline`) need no identity because they never write | `BUILT` — they now genuinely never write: `storeExists`/`ormForRead` (`src/store/connection.ts:215`) give reads a handle that does not conjure a store, and the three paths that were creating one on a read are guarded — `agentIdBySessionToken` (`src/store/agent-rows.ts:187`), `allTasks` (`src/store/task-rows.ts:280`) and the composer (`src/store/agent-view.ts`). Tests: `test/no-daemon-commands.test.ts` (5) |
| B7 | Every agent has an inbox; reading it promptly is the only thing that varies | `BUILT` — `createAgentChannelRole` (`src/presence/roles.ts:28`) consults presence and nothing else: no plexer, no handle. The inbox path is derived from the agent id alone (`inboxPath`, `src/presence/inbox.ts:15`), so a capless agent is delivered to identically and only a disconnected BRIDGE refuses. Tests: `test/every-agent-has-an-inbox.test.ts` (4) |
| B8 | `session_identities` table deleted — a session is an agent row | `BUILT` — `src/store/agent-rows.ts` |

## C. Leases — who may drive what

| # | item | status |
|---|---|---|
| C1 | Lease ops: renew / release / handoff / adoption / expiry. Expiry transfers nothing | `BUILT` — `src/store/lease-rows.ts` |
| C2 | **Authority is the lease:** you may act on an agent if you hold its lease, or if no lease is in force | `BUILT` — `src/daemon/orchd.ts` `leaseHolderIsAlive`; a dead holder is not a collision |
| C3 | An orch can never touch another orch's agents — not their panes, not their model, nothing | `BUILT` — `governWrite` (`src/daemon/orchd.ts:247`) gates dispatch/steer/model/reset on a LIVE foreign holder, and the lease commands answer with the same rule without a daemon. Tests: `test/lease-authority.test.ts` "C3 foreign agents are untouchable" (3); pane mutations in `test/owner-scoping.test.ts` "pane mutations refuse a foreign-owned agent and name its owner" |
| C4 | `--steal` is the deliberate override for taking from a **live** orch | `BUILT` — a driving verb never transfers a holding as a side effect; the refusal names `orch adopt <target> --steal` instead (`src/daemon/orchd.ts:286`). Tests: `test/lease-authority.test.ts` "C4 steal" (2), `test/broker-governance.test.ts` "--steal on a driving verb does not take a live holder's lease" |
| C4a | Fencing token: `agent_leases.id` is monotonic; a woken zombie orch cannot clobber the adopter | `BUILT` — `agent_leases.id` is `INTEGER PRIMARY KEY AUTOINCREMENT` (`src/db/schema.ts`). Tests: `test/lease-authority.test.ts` "C4a fencing token" (3) — ids monotonic across handoff and adoption, a stale fence cannot release the current holder, `openLeaseId` is null when nothing is leased |
| C4b | Reads (`status`, `events`) are never gated | `BUILT` — the gate lives only in `governWrite`; no read path consults a lease. Tests: `test/lease-authority.test.ts` "C4b reads are never gated" — status and events read straight through a live foreign lease |
| C4c | **Names need no uniqueness.** A name is for the human, the id is for the code. Duplicates are legal; an ambiguous target is a lookup returning more than one row, which asks for the id | `BUILT` — `resolveTarget` (`src/commands/target.ts`) returns every match and the refusal names each id and asks which. Tests: `test/lease-authority.test.ts` "C4c/C4d name resolution" — "duplicate names are legal and an ambiguous target asks for the id" |
| C4e | Spawning **requires** a name. A self-registering session, which has no spawner to name it, gets `<harness>-<first 8 of its id>` | `BUILT` — `resolveSpawnNames([])` refuses; `getOrCreateSessionAgent` mints `<harness>-<id.slice(0,8)>` (`src/store/agent-rows.ts`). Tests: `test/lease-authority.test.ts` "C4e naming at creation" (2) |
| C4f | **An agent may rename itself** with no lease in force — acting on itself is not driving. Renaming another agent is | `BUILT` — `renameTarget` exempts an actor renaming itself and gates every other rename on the lease. Tests: `test/lease-authority.test.ts` "C4f self-rename" (2) — self-rename works with a live lease in force, renaming another is refused and names the holder |
| C4d | **Resolving a name to an id is a first-class operation**, not a per-command lookup — orch resolves the name of a slave, another orch, or anything else the same way, in one place at the boundary | `BUILT` — `resolveTarget` is that one place: every command resolves through it, and an unknown target is a lookup miss rather than a per-command error. Tests: `test/lease-authority.test.ts` "C4c/C4d name resolution" — "a unique name resolves, and an unknown target is a lookup miss" |
| C5 | A transfer must not disturb the agent — no reset, no re-attach, no context loss | `BUILT` — `handoffLease`/`adoptLease` (`src/store/lease-rows.ts:82,89`) write `agent_leases` and nothing else. Tests: `test/transfer-does-not-disturb.test.ts` (5) — after a handoff the environment, tuning, provenance and identity are identical, the open `agent_processes` interval is byte-for-byte the same (a new or closed one would mean a relaunch), no message reaches the inbox and `status.json` is unchanged, and the ended holding is kept as history — without which the C4a fence would mean nothing |
| C6 | `orch events` scope follows the lease, not `spawnedBy` — an adopted fleet must be watchable | `BUILT` — `src/commands/events.ts` |
| C7 | Live views group by lease; history groups by provenance | `BUILT` — a space encompasses its orchs, each orch the agents it holds: `packages/web/src/lib/fleet.ts:170` (`leaseGroup`), `:206` (`projectFleet` nests `orchs`), rendered `packages/web/src/routes/spaces/$slug.tsx:86`. History still groups on the provenance root, `fleet.ts:180`. Proven by `test/web-projection.test.ts:96` "live views group by lease (C7)" — 5 tests incl. an ADOPTED agent filing under its current holder, never its spawner. |

## Cq. Queue

Modelled in `06-schema.md`: `tasks`, `task_attempts`, `pack_intakes`, and the `task_states` view.

| # | item | status |
|---|---|---|
| Cq1 | **Dispatch is push and is driving; claiming is pull and is not.** The gate is on enqueuing into a scope, never on claiming — a pack drains its queue whether or not its orch is alive | `BUILT` — the gate is at enqueue only: pack scope `src/queue.ts:129` (a live held member of the pack earns it; provenance never does), agent scope `src/queue.ts:149` (the lease), space scope by membership. Claiming is ungated — `claimTask` consults no lease. Proven by `test/queue.test.ts:69` "Cq1: the gate is on enqueuing into a scope, and adoption earns it" and `test/queue.test.ts:81` "Cq1: a pack drains its queue with its orch dead and no lease in force". |
| Cq2 | Three scopes chosen at enqueue: **agent**, **pack**, **space** | `BUILT` — `src/commands/queue.ts:59` (`scopeFromFlags`: `--agent`/`--pack`/`--space`, exactly one, a pack named by any member resolves to its root) over the typed union `src/store/task-rows.ts:316`. Proven by `test/queue-cli-scope.test.ts:31` "Cq2: all three scopes are choosable at enqueue" — 3 tests incl. two flags at once refused. |
| Cq3 | Space scope needs **two-sided consent** — publishing is an offer; a pack opts in to consume | `BUILT` — `src/queue.ts:193` `openPackIntake` / `:206` `closePackIntake` (gated by `requirePackRight` `:178`); the space branch of `openTasksInScope` (`src/store/task-rows.ts:329`) matches only through an open `pack_intakes` row, and `src/db/schema.ts:365` makes an unconsumed offer `unrunnable`. CLI `src/commands/queue.ts:214`. Proven by `test/queue.test.ts:106` — offer invisible before consent, only the pack's own holder may consent, withdrawal re-hides it. |
| Cq4 | Results go to the enqueuer, not the runner — cross-pack delivery is orch↔orch messaging | `DECIDED` |
| Cq5 | Agent scope requires leasing it at enqueue; the binding survives adoption | `BUILT` — `src/queue.ts:147` (agent scope requires the enqueuer to hold the target's current lease); the binding is the immutable `tasks.scope_agent_id` (`src/db/schema.ts:259`), never a lease reference, so adoption cannot move it. Claim gate `src/queue.ts:313`. Proven by `test/queue.test.ts:158` (survives `adoptLease`) and `:62` (lease required at enqueue). |
| Cq6 | Retry re-binding follows scope — pack-scoped retries anywhere in the pack, only agent-scoped re-pins | `BUILT` — `src/queue.ts:310` `scopeIncludesAgent` re-binds a retry by the SCOPE columns, not by the prior attempt; `:294` readmits a failed task. No `agent_key`/`retries` column exists for a retry to pin to (Cq14 makes the wrong re-bind unrepresentable). Proven by `test/queue-scope.test.ts:45` — a failed pack task retries on another member while an agent-scoped one stays pinned. |
| Cq7 | `origin_workspace` deleted — scope replaces it | `BUILT` — `src/db/schema.ts:254`: `tasks` carries the three nullable scope refs plus `tasks_exactly_one_scope` and no workspace column. Zero hits for `origin_workspace`/`originWorkspace` across `src/` and `extensions/`. Proven by `test/queue.test.ts:211` — asserts the exact column list, and that selecting `origin_workspace` throws. |
| Cq8 | **Today's bug:** `orch work` gives a queued task to any idle agent in the workspace, including another orch's slaves | `BUILT` — `src/daemon/work-loop.ts` |
| Cq9 | Queue CRUD: cancel by the enqueuer or the orch leasing the targeted agents (human always); edit only by the enqueuer while `queued`; read open | `BUILT` — read is open by construction: `src/queue.ts:233` `listTasks` / `:237` `history` take no caller. Cancel `src/queue.ts:241` (human, enqueuer, or a live lease on any agent in scope via `src/store/task-rows.ts:267`); edit `src/store/task-rows.ts:189` is one UPDATE gated on `enqueued_by` AND state `queued`. Proven by `test/queue-cli-scope.test.ts:58` (read), `test/queue.test.ts:196` (all four cancel cases), `test/queue-scope.test.ts:83` (edit refused for a foreigner and after claim). |
| Cq10 | **Unrunnable** (no live agent in scope) is reapable; **stale** (long-queued but claimable) is surfaced, never deleted on age | `BUILT` — `src/store/task-rows.ts:218` `reapTask` DELETEs only under `state='unrunnable'`; `:295` `deleteSettledTasksBefore` sees only `done`/`failed`/`cancelled`, so neither unrunnable nor stale is ever aged out. `stale` is derived, never stored (`src/queue.ts:112`, 24h at `:28`) and surfaced at `src/commands/queue.ts:22`. Proven by `test/queue-reaping.test.ts:42` (survives every sweep, then reapable) and `:71` (stale is surfaced AND still claimable). |
| Cq11 | Reaping an unrunnable task is **always deliberate** — never a timer. Unrunnable is a fact about who is alive now, and a new orch changes that | `BUILT` — reaping is reachable only from the explicit verb `orch queue reap` (`src/commands/queue.ts:191` → `src/queue.ts:282`). The one timer, `sweepExpiredRows` (`src/daemon/retention.ts:103`), routes to `deleteSettledTasksBefore`, which cannot see an unrunnable task. Liveness is the view's own definition (`src/db/schema.ts:339` `stillRunning` = NOT EXISTS over `agent_endings`), so a new live pack member flips the state back with no write. Proven by `test/queue-reaping.test.ts:58` and `:51`. |
| Cq12 | An orphaned task has three deliberate resolutions: **take it on** (re-scope to the taker's pack), leave, reap | `BUILT` — take-on `src/store/task-rows.ts:209` nulls agent/space scope and sets the taker's pack, guarded on `state='unrunnable'`; the taker must be live (`src/queue.ts:275`). Reap `src/queue.ts:283`. Leave needs no code — no sweep can touch the row. Verbs at `src/commands/queue.ts:174` and `:191`. Proven by `test/queue-reaping.test.ts:82` (re-scoped and claimable in the taker's pack), `:94` (a dead taker is refused), `:51`. |
| Cq13 | Adoption carries the queue — pack-scoped tasks come with the agents, nothing to re-parent | `BUILT` — nothing to re-parent: `src/store/lease-rows.ts:89` `adoptLease` writes only the lease and touches no task row, while claim eligibility resolves through the pack (`src/store/task-rows.ts:325` joins `t.scope_pack_id = a.root_agent_id`). Proven by `test/queue.test.ts:173` — after adoption the pack's work stays claimable by its own members and a foreign pack's agent is refused. |
| Cq14 | **A claim is an attempt row, and a retry is the next one.** `retries`, `last_error` and `agent_key` leave the task; the claim is an INSERT guarded by `one_open_attempt`, not a conditional UPDATE. Cq6 stops being enforceable code and becomes unrepresentable | `BUILT` — `src/store/task-rows.ts` |
| Cq15 | **State is derived** (`task_states`), never stored. A stored `state` is a second truth beside the attempts that produce it | `BUILT` — `src/db/schema.ts` |
| Cq16 | Scope is three typed nullable references with `exactly one non-null`, never `(kind, id)` — a polymorphic pair cannot carry a foreign key | `BUILT` — `src/store/task-rows.ts` |

## D. Lifecycle

| # | item | status |
|---|---|---|
| D1 | Work survives its spawner, always. No lifetime, no flag, no decision at spawn | `BUILT` — no lifetime column exists (`src/db/schema.ts`, asserted by PRAGMA sweep), no lifetime flag exists on `src/commands/spawn.ts`, and an ending is per-agent with no cascade (`src/store/agent-view.ts:167` reads one `agent_endings` row). Proven by `test/work-survives-its-spawner.test.ts` — 5 tests: child and grandchild stay live and listed when their spawner ends, no ending is written for anything it spawned, and no banned column or flag exists. |
| D2 | Holder death costs a **driver**, not a life: finish the task, receive no new work, lease closes `expired` | `BUILT` — clause 1: the attempt settles independently of the holder (`src/store/task-rows.ts:230` `settleAttempt`). Clause 2: no lease is minted by a death. Clause 3: `src/commands/lease.ts:119` closes a dead holder's lease `expired`, never `released`, and is never refused (`src/store/lease-rows.ts:78`). Proven by `test/holder-death-costs-a-driver.test.ts` — 6 tests: task finishes and keeps its result, lease closes `expired` at the given instant, agent stays live/unheld/adoptable, history keeps who held it, clearing is idempotent. |
| D3 | Unleased + idle stays alive and adoptable, indefinitely. Nothing ages it out | `BUILT` — `src/daemon/retention.ts:26` `removeExpiredAgentRecords` selects `FROM agent_endings WHERE ended_at < ?`, so an agent with no ending is invisible to the only agent-reaping sweep, whatever its age or lease; `reapDeadPresenceDirs` touches only dead dirs. No `setTimeout`/`setInterval` in `src/` closes or reaps an agent. Proven by `test/unleased-stays-adoptable.test.ts` — 4 tests: a decade of sweeps at zero-day retention leaves an unleased idle agent live, it is still adoptable afterwards (`adoptLease` succeeds), the same pass reaps an ENDED agent and not it, and repeated sweeps are stable. |
| D4 | Nothing actively working is ever closed on a timer | `BUILT` — spec constraint, satisfied by absence: no close-on-timer exists. The only lifecycle clock, `sweepExpiredRows` (`src/daemon/retention.ts:103`, hourly from `src/daemon/work-loop.ts:242`), reaps only rows that already have an `agent_endings` row. The one timeout that fires against a working agent, `waitForTaskState` (`src/daemon/work-loop.ts:148`, `timeouts.dispatch_ack_ms`), settles the TASK (`:213` records a task failure) and never signals, closes or reaps the process. Daemon idle shutdown (`src/daemon/orchd.ts:561`) exits the daemon, not agents, and is held open by any live agent. |
| D5 | Nested spawn: a grandchild becomes unleased, never falls to the grandparent | `BUILT` — a lease covers ONE agent and never a subtree: `src/store/lease-rows.ts:49` keys on `agentId` alone, and nothing walks `rootAgentId`/`spawnedBy` to reassign one. Closing a holder's lease leaves the agent unheld (`:78` `expireLease`). Proven by `test/nested-spawn-unleased.test.ts` — 3 tests: the middle agent's death leaves the grandchild unleased with the grandparent holding nothing, the grandchild stays live/adoptable with provenance intact, and holding `mid` is never holding what `mid` holds. |
| D6 | Three verbs — `abort` the turn, `close` the process, `reap` the record | `BUILT` — `src/commands/lease.ts` |
| D7 | Kill path never routes through the leasing orch and never touches the plexer | `DECIDED` |
| D8 | Adoption announces itself when a session starts where unleased agents exist | `DECIDED` |
| D9 | `orch detach` = release the lease. One meaning: it is nobody's, anyone may adopt | `BUILT` — `src/commands/lease.ts` |
| D10 | Lock-delay cooldown after expiry — **dropped.** C4a (monotonic `agent_leases.id` as fencing token) already makes a woken zombie harmless and C1 says expiry transfers nothing; a cooldown would be a second mechanism for a solved problem | `BUILT` — nothing to build; C4a |
| D11 | **Two things close an agent: the user, or the orch that spawned it. Nothing else, ever.** No timer, no retention window, no sweep, no idle rule, whatever state it is in and however long it sits | `BUILT` — spec constraint, satisfied by absence. The only writer of `agent_endings` is the close path (`src/commands/lifecycle.ts`), reached from the user's `orch close` or the spawning orch; the daemon's work loop never writes the row. No timer, retention window, sweep or idle rule closes an agent: `src/daemon/retention.ts:26` only reads agents that ALREADY have an ending, and `src/daemon/orchd.ts:561` idle-shutdown exits the daemon, not agents. Locked by `test/unleased-stays-adoptable.test.ts` (a decade of zero-day sweeps writes no ending). |
| D14 | **Nothing reaps an agent record on a timer either.** A record is deleted when the user says so. The only clock is a long fallback so the store cannot grow without bound, measured in months, not a cleanup policy dressed as one | `BUILT` — spec constraint, satisfied by absence. `removeExpiredAgentRecords` (`src/daemon/retention.ts:26`) selects `FROM agent_endings WHERE ended_at < ?`, so the only clock is the long `retention.ended_agents_days` fallback applied to records the user or spawner ALREADY ended. A live or unleased agent has no ending row and is invisible to it. Proven by `test/unleased-stays-adoptable.test.ts` — the same sweep pass reaps an ended agent and leaves the unleased one untouched. |
| D12 | A dead orch's queued-but-unstarted tasks **run** — scope already decides it. Only work whose *runner* died is unrunnable; nothing dies because its enqueuer did | `BUILT` — scope already decides it: `openTasksInScope` (`src/store/task-rows.ts:321`) matches on `scope_pack_id`/`scope_agent_id`/`scope_space_id` and never on the enqueuer's liveness, and `unrunnable` is derived from whether any agent IN SCOPE is still running (`src/db/schema.ts:339` `stillRunning`, `:382`). A dead enqueuer removes nothing from scope. Proven by `test/queue.test.ts:81` — a pack drains its queue with its orch dead and no lease in force. |
| D13 | **Clean exit needs no harness signal.** An `agent_endings` row exists only for an agent that ended; its `closed_by` records who asked, and NULL means nobody did, so it died. Both facts are orch's own, so the answer never depends on a harness telling the truth about its own exit | `BUILT` — an `agent_endings` row exists only for an agent that ended, and `closed_by` records who did it (`src/db/schema.ts` `agent_endings`; read at `src/store/agent-view.ts:167`). Nothing infers an ending from a missing heartbeat or a harness signal — `endedAt` is a nullable instant, so absence means "has not ended" rather than "unknown" (Rule 11: prefer a nullable instant over a boolean). Locked by `test/work-survives-its-spawner.test.ts` (no ending is written for anything a closing spawner spawned) and `test/unleased-stays-adoptable.test.ts`. |

## E. Environment and backends

| # | item | status |
|---|---|---|
| E1 | Port seam: delivery and read are orch's; a pane is an optimisation | `DECIDED` |
| E2 | `headless` must return true from `deliver` — `inbox → bridge → ack` needs no screen | `BUILT` — `src/backends/headless/index.ts` composes `channel`; no pane roles |
| E3 | Branch on what the environment provides, never on a backend id | `DECIDED` |
| E4 | `BackendCapabilities` served end-to-end to the web | `BUILT` |
| E5 | Spawning outside a pane session falls back to a **headless environment** instead of dying | `BUILT` in source, **needs `bun run build:dev`** to take effect |
| E11 | **Everything has an environment** — an agent, a pack, a space. It is not an agent-only property | `DECIDED` |
| E12 | An environment says **where a thing is and what surrounds it**: directory, harness, plexer, space. Where it can change it is an axis and changing it is a move; the directory and the harness cannot change under a running process, so they sit on `agents` | `DECIDED` |
| E8 | **An orch spawning into a plexer it is not itself inside MUST get its own new plexer workspace.** Its pack has to be visibly separate from other orchs' work and from the human's own panes — otherwise its agents read as random agents with no discoverable origin. Allowable, but never unmarked | `DECIDED` |
| E9 | That makes "can hold orch's structure" one of the things an environment provides — create / rename / close a home for a space or a pack, implemented per plexer and branched on by what it provides, never by plexer id. orch stays coupled to no plexer. Today it exposes none of it: `orch ws` is list + focus, and `orch spawn --workspace` only picks an existing one. The coordinate it returns lands in `space_plexers` / `pack_plexers` | `BUILD` — `07-port-seam.md` |
| E10 | **There is no new noun, and there must not be one.** The thing being grouped is already a **space** or a **pack**; what the plexer groups by is a coordinate orch stores and hands back, never says. The port operates on "this space's home" / "this pack's home"; `space_plexers` and `pack_plexers` hold the coordinate. Minting an orch word for a plexer coordinate is exactly how `wF` got printed as a name | `DECIDED` — `06-schema.md` |
| E6 | Rename `caps` → `capabilities` daemon-side, ~30 sites across backends/adapters/commands/control/doctor/tests. Do **not** rename the column-width `caps` locals in `src/table.ts`, `src/commands/queue.ts:15`, `src/commands/status.ts:212,427` | `BUILT` — `src/backends/backend.ts` |
| E13 | **The environment dictates what is possible — no oxygen, no fire.** `hello` records where the agent is: harness, plexer, directory, space, OS side. What it can do follows from that and is never itself recorded: no capability rows, and nothing declared to orch by a plexer. Nothing is discovered or negotiated at the moment of acting either. No method-presence check and no loose flags — Ef10's optional methods and Ef12's booleans are both deleted | `BUILT` — nullable composed roles on both ports (`src/backends/backend.ts:202` `EnvironmentServices`, `src/adapters/adapter.ts`); no capability table exists. `scripts/check-bridge.ts:539` bans `typeof x.f === "function"`, `"f" in x`, `if (x.f)`, `x.f?.()` and plexer/harness id branching, with the exemption list DERIVED from the port declarations (`:519`) so a deleted role loses its exemption automatically. Proven by `test/port-no-optional-methods.test.ts:11` and `:36` (zero optional methods on either port), `test/check-bridge.test.ts:247`, `test/claude-adapter.test.ts:65`. |
| E14 | **No fallback logic and no unsupported-operation error path inside orch.** orch never reaches for something the environment lacks, so there is nothing to catch. "Can't" is only ever said to a *human* who asked, and it is an answer, not a failure: `orch zoom` on a headless agent replies that the agent has no pane | `BUILT` — 13 boundary-answer sites; `reason: "no-pane" | `BUILT` — `src/commands/panes.ts:19` `paneBoundary` returns `{outcome:"answer", reason:"no-pane"|"no-environment-role"}`; same union in `src/control/dispatch.ts:117` with 22 answer sites across src/. No environment unsupported-operation throw remains. Proven by `test/control-dispatch.test.ts:124` (steer/model answered, with the human-readable reason), `test/answer-dispatch.test.ts:97` (answered, nothing written, no throw), `test/daemon-rpc.test.ts:125` (an unreachable agent is acked, not left pending). |
| E15 | What is possible changes when **what is there** changes — a move (a new environment record) or an upgrade (a new `host_plexers` row). Neither is a negotiation at the moment of acting | `DECIDED` |
| E16 | **A failure reaches whoever asked, including an agent.** `herdrBestEffort` and every other call that turns an error into a boolean are deleted. An agent that asked orch to do something gets the real failure text back through its own channel, not a quiet false. orch never converts a failure into a boolean (L12) | `BUILT` — `herdrBestEffort` deleted, zero occurrences in `src/` |
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
| F4 | `orch spawn <name>` — naming is **required**; there is no `--detached` and no default name | `BUILT` — `src/commands/spawn.ts`; the positionals ARE the names, one per pane; no `--name` flag, no prefix numbering; `orch tile <tab> <name>` likewise |
| F5 | `orch space` — create / rename / delete, replacing `orch ws` | `BUILD` — `03-vocabulary.md`, `adr/0001-space-not-workspace.md` |
| F6 | Status output: unleased agents must read as "no orch driving it", never as yours | `BUILT` — `src/agent/drive-state.ts:49` `NO_ORCH_DRIVER`/`DEAD_HOLDER_DRIVER`; `deriveDriveState` `:69` returns `unleased` both for no lease AND for a lease whose holder process is gone, so a dead holder never reads as a live driver. Rendered `src/commands/status.ts:559`/`:84`. Proven by `test/status-owner-column.test.ts:80` — OWNER reads "no orch driving it", and `:89` "no orch driving it (holder gone)". |
| F7 | Name→id resolution is one boundary operation shared by every command | `BUILT` — `src/commands/target.ts`; live records win, ambiguity names the keys |

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
| H7 | **Every retention window is user-configurable in `settings.json`, individually.** The numbers in H4 are defaults, never constants in the source. How long a user's own records are kept is the user's call, and a value they cannot see or change is orch deciding it for them | `BUILT` — `src/config.ts` declares them; `orch settings` now PRINTS them. A hand-written 19-case switch beside the registry loop was dropping 23 of 42 declared keys (all six `retention.*` among them) from the table and `--json`, so they were configurable but invisible. `src/commands/settings.ts:378-392` walks `SETTINGS_REGISTRY` alone; `test/settings-command.test.ts` fails if any declared key is unreachable |
| H8 | A window the user has not set falls back to its default alone — setting one never disturbs another, and there is no all-or-nothing retention block | `BUILT` — `src/config.ts` |
| H5 | `agent_dirs_days` is retired into `ended_agents_days`: one window covering the row, its satellites and its presence directory, keyed on `agent_endings.ended_at`. Two names for one age is how they drift apart | `BUILT` — `src/config.ts` |
| H6 | `identities_days` is deleted along with `session_identities` (B8) | `BUILT` — `src/config.ts` |
| H10 | **A slave never reaps or recreates the store.** Destructive store maintenance (schema-mismatch reap/recreate, `orch clean`-class sweeps of records it does not own) is reserved for the user or the pack's orch; a slave hitting a store it cannot open ERRORS, naming the skew and the fix, and mutates nothing. A schema-mismatch recreate is additionally refused for *everyone* while any live presence exists — identity of living agents is never collateral. Why: 2026-08-27, a slave running dev-tree code stamped the live store 6, and the installed schema-5 CLI silently reaped and recreated it, orphaning 12 live agents | `BUILT` — `src/store/connection.ts:128` `callerIsSpawnedAgent`, `:142` `assertStoreRecreatable` refuses a slave outright and refuses EVERYONE while a live presence dir exists (naming the holders and `orch close --all`); `:183` gives a slave "report this skew, change nothing" instead of the reset line, and `:193` throws before any DDL so no `-wal` is left. `orch clean` guarded at `src/commands/clean.ts:118`. Proven by `test/store-connection-guards.test.ts:82` (errors naming the skew, bytes unchanged) and `:100` (recreate refused for the user too). |

## I. Enforcement

Every invariant needs a mechanism. `NONE` means it will be broken.

| # | item | status |
|---|---|---|
| I1 | check-bridge rule: a lease never in `spawned_by`, provenance never in a lease | `BUILT` — `scripts/check-bridge.ts` |
| I2 | check-bridge rule: no behaviour branches on a plexer or harness id, and none checks whether a method exists. Capabilities read from the environment, only (E3, E13) | `BUILD` — E3, E13 |
| I3 | Test per command: `abort`/`close`/`reap` are never refused because of a lease | `BUILT` — `test/commands-lease.test.ts` |
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
| J9 | `TASKS/08-identity-registration.md` moves into `TASKS/` (as `08-identity-registration.md`) and is deleted from `docs/`; every reference repointed. Nothing about this refactor lives outside `TASKS/` | `BUILT` — moved to `TASKS/`, no `docs/` copy, no stale refs — README |

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
| M6 | Never two daemons at once — machine-wide registration refuses the second start and names the live one; doctor verifies | `BUILT` — `src/daemon/lifecycle.ts:126` claims a machine-wide `orchd.registration` with `flag: "wx"`, evicting only a registration whose process instance no longer matches (`:118`); refusal composed at `:169` and wired into both start paths (`src/daemon/orchd.ts:457`, `src/commands/daemon.ts:284`). Doctor verifies via `src/doctor/daemon.ts:11` and `:75` (`src/doctor/runner.ts:123`). Proven by `test/daemon-registration.test.ts:32`, `:46`, `:62`. |
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
| L7 | `ack.jsonl` is written (`src/presence/inbox.ts:61-72`) and **nothing reads it** — the documented fallback is half-built | `BUILT` — a channel write now reports `acked`/`queued`/`failed` (`src/daemon/outbox.ts:16-33`), not a boolean. `deliverControl` says which channel it used (`ControlAck`, `src/control/dispatch.ts:108-116`), `deliverWrite` maps an inbox write to `queued` (`src/daemon/orchd.ts:213`), and only the agent marker settles the row — so `dispatch.acked` is reachable. `test/outbox-ack.test.ts` (6) covers queued-not-delivered, terminal channels, duplicate markers and a mismatched key |
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
