# R2. Recon: the `status` request path in orchd and its payload

Read only. Edit nothing. Run nothing but `grep`, `cat`, `sed -n`, `wc`. Repo: /home/bryan/orch, package `packages/orch/`.

Goal: I am about to (a) stop computing `fleetLeaseFacts` twice per `status` call, and (b) cut the size of the `status` reply (40 KB for 64 agents today). I need exact facts to write those as tasks.

Trace this chain and report on it:

1. `src/daemon/server/state.ts` `fleetStatus` (line ~153): calls `fleetStatusRows`, then `fleetLeaseFacts(directory, agentViewIndex(directory))`, then maps rows with `leasePayloadFrom` and `bridgeAttached`.
2. `src/commands/status/offline.ts` `fleetStatusRows`: calls `agentViewIndex`, `liveViews`, `currentOrchId`, `fleetDriveStates`, `buildEntities`, `sortEntities`, `statusRowFromEntity`.
3. `src/agent/drive-state.ts` `fleetLeaseFacts`, `fleetDriveStates`, `leasePayloadFrom`, `driveStateFrom`, `currentProcesses`, `recordedInstanceIsLive`.
4. `src/commands/status/rows.ts` `statusRowFromEntity` and `deriveViewTask`.
5. `src/entities/inventory.ts` `buildEntities`, `entitiesFromBackend`, `entitiesFromPresence`, `entitiesFromStore`, `paneCensus`.

Report, written to `/home/bryan/orch/tasks/perf/recon/R2-status-path.md`, with exactly these sections:

## Call chain
One line per hop: `file:line function(args) -> returns`. Tag every sqlite read `[sqlite]`, every process probe (`kill`, `recordedInstanceIsLive`) `[probe]`, and every O(fleet) allocation `[O(fleet)]`.

## The double lease-facts
Paste `fleetStatus` and `fleetDriveStates` verbatim. Paste the signatures of `fleetLeaseFacts`, `fleetDriveStates`, `leasePayloadFrom`, `driveStateFrom` and the `LeaseFacts` and `DriveFacts` types. List every caller of `fleetLeaseFacts` and `fleetDriveStates` across `src/` (file:line).

## The row
Paste the full `StatusRow` type (wherever `statusRowFromEntity` returns it) and the full `DaemonStatusRow` type. For every field, one row in a table: `field | type | set by (file:line) | read by (every file:line in src/, packages/web/src, extensions/ that reads it off a status row)`. A field nobody reads is marked `UNREAD`. This table is the point of the recon; be exhaustive on the "read by" column: grep for `.fieldName` and `["fieldName"]` and destructuring `{ fieldName`.

## Which renderers consume rows
Every function that takes `StatusRow[]` or `DaemonStatusRow[]` and produces output: the CLI table (`src/commands/status/*`), the live view (`src/commands/status/live.ts`), the web UI (`packages/web/`), `orch monitor`, anything else. file:line and the fields each one reads.

## Tests that import these modules
For each of `state.ts`, `offline.ts`, `drive-state.ts`, `rows.ts`, `inventory.ts` — the test files under `packages/orch/test/` that import it directly (grep the import lines).

Do not propose a design. Report facts. When done, reply with the single line: `R2 written`.
