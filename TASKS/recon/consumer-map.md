# Store rebuild consumer map

Scope read: J1–J8, Cq14–Cq16, E13, C6–C7. Line numbers are current tree locations.

## 1) OLD STORE CONSUMERS

| file:line | function | what it does with it |
|---|---|---|
| `src/queue.ts:3-14,46,71,76,80,89,97,101,127,132,137` | all queue-row exports | Queue facade inserts/selects/counts and performs claim/done/failure/requeue/cancel; settled-task filtering delegates to rows. |
| `src/doctor/presence.ts:8,80` | `selectQueueTasks` | Doctor loads all queue tasks for presence diagnostics. |
| `src/daemon/retention.ts:6,62,66` | `deleteSettledTasksBefore` | Retention deletes old settled queue rows (also calls identity retention). |
| `src/backends/headless/index.ts:16,69,196` | `selectSpawnedRecords`, `insertSpawnedRecord` | Finds detached records and records a newly launched headless agent. |
| `src/presence/store.ts:10,182,189,195` | spawned + ownership exports | Upserts presence metadata, reloads spawned registry, and removes spawned/owner rows when reaping. |
| `src/agent/registry.ts:1,12` | `selectSpawnedRecord` | Looks up one agent's stored launch record. |
| `src/daemon/events.ts:9,197` | `selectSpawnedRecord` | Joins an incoming event to its stored spawned record. |
| `src/commands/lifecycle.ts:10,339` | `writeSpawnedName` | Persists a renamed agent. |
| `src/daemon/orchd.ts:20,157,165` | `getOwner`, `checkOwnerWrite` | Reads owner and gates daemon control writes. |
| `src/daemon/rpc.ts:9,193,598` | identity-row exports | Mints/loads session identity during hello and validates RPC identity replies. |
| `test/*.test.ts` (imports listed below) | row exports | Direct fixtures/assertions exercise every old row API. |
| `test/smoke.sh:136` | `insertSpawnedRecord` | Smoke fixture inserts a spawned row. |

Direct test import sites: `store-queue.test.ts` (all queue exports), `queue.test.ts`/`routing-hardening.test.ts`/`doctor-unscoped-tasks.test.ts` (`insertQueueTask`, claim), `retention.test.ts` (queue/identity/spawned/owner), `store-identity.test.ts` (all identity exports), `daemon-rpc.test.ts` (`isSessionIdentity`), `store-spawned.test.ts` (all spawned/owner exports), `answer-dispatch.test.ts`, `broker-governance.test.ts`, `broker-ownership.test.ts`, `ownership.test.ts` (owner exports), and spawned inserts in `workspace-walls.test.ts`, `daemon-events.test.ts`, `review.test.ts`, `commands-results.test.ts`, `command-workspace-fields.test.ts`, `workspace-policy.test.ts`, `backend-headless.test.ts`, `cli-backends-herdr-headless.test.ts`, `cli-backends-tmux.test.ts`, `owner-scoping.test.ts`, `notify-events-format.test.ts`, `commands-runs.test.ts`.

Export list covered: queue (`insertQueueTask`, `selectQueueTasks`, `selectQueueTask`, `countTasksInState`, `selectTasksInStates`, `writeTaskClaim`, `writeTaskDone`, `writeTaskFailure`, `writeTaskRequeue`, `writeTaskCancel`, `deleteSettledTasksBefore`); ownership (`setOwner`, `getOwner`, `deleteOwner`, `checkOwnerWrite`); spawned (`insertSpawnedRecord`, `selectSpawnedRecords`, `selectSpawnedRecord`, `writeSpawnedName`, `deleteSpawnedRecord`); identity (`isSessionIdentity`, `getOrCreateSessionIdentity`, `deleteSessionIdentitiesBefore`).

## 2) IDENTITY KEY SITES (J1)

| file:line | function/site | segments consumed |
|---|---|---|
| `src/commands/panes.ts:5,115-116` | `parseIdentity(ent.key)`; backend check | backend, workspace (via parsed identity), id/handle indirectly. |
| `src/commands/target.ts:4,162,201,210` | parse target/entity/record keys | backend, workspace, id; uses backend to resolve route and workspace for walls. |
| `src/entities.ts:4,96,98` | `tryParseIdentity`/`serializeIdentity` | backend/workspace/id to derive entity keys and operator key. |
| `src/policy/spawner.ts:1,23` | serialize spawner identity | emits all three segments. |
| `src/agent/presence.ts:13,110` | parse/serialize process identity | all three segments; writes status key. |
| `src/commands/spawn.ts:12,359,449,503` | serialize newly minted key | emits backend/workspace/minted id. |
| `extensions/claude/index.ts:19,79`; `extensions/codex/index.ts:17,45` | parse key for bridge state | parse call is validation/identity extraction (all fields available). |
| `src/backends/herdr/hud.ts:33,39,52,65,246` | `AGENT_IDENTITY?.backend === "herdr"` | consumes backend; id for metadata; environment variables gate integration. |
| `src/entities.ts:117` | `record.backend === backend.id` | backend segment only; matches stored handle to entity. |
| `src/commands/panes.ts:116` | `id.backend !== backend.id` | backend segment only. |
| `src/commands/setup.ts:502` | `...backend === "headless"` | backend segment only. |
| `src/commands/control.ts:...` / `test/control-dispatch.test.ts:30` | backend conditional when constructing fixture identity | backend selects workspace fixture; workspace/id are emitted. |
| `src/backends/identity.ts:104-132` | `serializeIdentity`/`parseIdentity` implementation | serializes/parses exactly backend~workspace~id. |
| `test/identity.test.ts:2,18-59` | parse/serialize/tryParse tests | Exercises all three segments and malformed-key validation. |
| `test/presence-schema.test.ts:7,78,91,110`; `test/cli-backends-herdr-headless.test.ts:5,124,129,165,171`; `test/cli-backends-tmux.test.ts:7,56,59`; `test/claude-adapter.test.ts:7,15`; `test/answer-dispatch.test.ts:11,26`; `test/spawn-identity.test.ts:6,64`; `test/commands-panes.test.ts:3,6`; `test/control-dispatch.test.ts:9,30`; `test/check-bridge.test.ts:142-170` | parse/serialize callers | Fixtures and assertions consume/emit backend, workspace, id (or validate round-trip). |

Literal key construction and fixtures are widespread (tests named in inventory 1); production consumers do not split keys directly. `src/entities.ts:206` also matches target strings using `:` suffix/short forms, consuming opaque target/handle text rather than identity segments. No production `split("~")` call exists outside the identity module.

## 3) SPAWNEDBY SCOPING (C6/C7)

| file:line | read/site | what it filters/groups |
|---|---|---|
| `src/commands/events.ts:58-59` | event `spawnedBy` or stored record `spawnedBy` compared with `mineAddress` | Filters events to the current spawning session. (This is the C6-affected provenance scope.) |
| `src/commands/lifecycle.ts:131-132,389,402` | `spawnedBySelf(record)` | `close --all` selects records spawned by self; per-target close gate checks spawner provenance. |
| `src/daemon/work-loop.ts:74` | stored/status `spawnedBy` read | Associates work-loop entry with its spawner for routing/metadata. |
| `src/commands/status.ts:140-141,345-346` | spawnedBy/spawnedByLabel read | Carries provenance into live/history status rows (display/group input). |
| `src/daemon/orchd.ts:378-379` | spawnedBy fields copied into response | Exposes provenance in daemon agent response. |
| `src/daemon/events.ts:122-144` | event/status spawnedBy merge | Persists/propagates provenance in event records. |
| `src/agent/peers.ts:159-160` | peer status spawnedBy read | Includes provenance in peer records. |
| `src/presence/store.ts:180-181`; `src/agent/presence.ts:154-155`; extensions claude/codex:80-81 | read/write status metadata | Propagates spawning address/label, not a grouping query. |

Schema/index sites: `src/store/schema.ts:57-58,86,102` define `spawned_by` and its index. C6/C7 require replacing live scoping by lease while retaining provenance for history.

## 4) CAPABILITY BRANCHES (E13)

| file:line | branch/read | behavior |
|---|---|---|
| `src/commands/control.ts:112-194` | adapter caps; `backend.canSendKeys` | Selects steering mechanism, ask/model/lifecycle support, and key-delivery errors. |
| `src/worker-prompt.ts:44-45` | `adapter?.caps.ask/steer` | Changes worker prompt text. |
| `src/commands/status.ts:114,363`; `src/commands/results.ts:72,235`; `src/config.ts:28`; `src/commands/spawn.ts:59,404` | adapter `.caps` | Session-tail display, command-lock config, presence registration, bridge wait. |
| `src/daemon/retention.ts:45` | `backend.caps.canPruneLogs` + `backend.pruneLogs` presence | Decides log pruning. |
| `src/doctor/backends.ts:21-23,40,55,78-90` | `.panes`, `.focusable`, `.canSendKeys`, backend ids | Chooses active/headless report and renders capability flags. |
| `src/commands/panes.ts:42,50,62,82,99,119,159,185,199,209,218,253,301,318,327` | pane booleans and optional methods | Gates pane/read/key/group/zoom/move/workspace operations. |
| `src/commands/spawn.ts:70,425,438,467,583,592-593,659-672,706` | optional inventory/group/workspace methods and `.panes` | Chooses workspace/group creation, cleanup, tiling, and pane capability. |
| `src/commands/lifecycle.ts:52-53,134,179-181,257,261,306,310,340,360,444-447` | optional wait/focus/rename/deliver methods; `.canSendKeys`; adapter caps | Waits, reloads/restarts, renames, aborts, and sends keys. |
| `src/entities.ts:114` | `backend.inventory` presence | Includes backend entities only when inventory exists and session is active. |
| `src/backends/tiling.ts:79` | optional `groupLayout` | Uses backend layout when available. |
| `src/backends/registry.ts:42-43` | `isAvailable`/`isInsideSession` methods | Backend discovery/selection. |
| `src/backends/herdr/hud.ts:33,39,52,65,89,246` | `HERDR_ENV`, `HERDR_SOCKET_PATH`, backend identity | Harness-specific integration activation and metadata publishing. |
| `src/backends/herdr/index.ts:28-29,40,131,136,142,153-156` | `HERDR_KINDS[adapter.id]`, `HERDR_*` env and herdr backend constant | Maps harness/adapter ids to herdr kind, detects herdr session, derives identity, and starts the mapped kind. |
| `src/setup/notifiers.ts:94-95`; `src/config.ts:56` | `HERDR_SINK_ID`/literal herdr sink | Selects herdr notifier configuration. |
| `src/commands/spawn.ts:426,663-664`; `src/commands/setup.ts:502` | literal backend ids (`headless`) | Headless fallback and setup cleanup behavior. |
| tests (`backend-*.test.ts`, `cli-backends-*.test.ts`, `doctor-backends.test.ts`, `commands-status.test.ts`, `check-bridge.test.ts`) | assertions on backend ids, `.caps`, `.panes`, `.focusable`, `.canSendKeys`, HERDR env | Lock current capability/id behavior and static enforcement expectations. |

### Counts summary

| inventory | count |
|---|---:|
| Old-store consumer groups (production) | 14 |
| Identity key production sites (parse/serialize or segment matching) | 14 |
| SpawnedBy read/scoping sites | 10 |
| Capability/id branch groups (production) | 17 |
