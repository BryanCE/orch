## The fleet hold

`src/store/agent-view.ts:173` has the module-level per-directory map `fleets: Map<OrchDir, FleetFacts>`. `FleetFacts` (`:158-166`) holds `hubs: Map<string, HubRow>`, `names`, `holders`, `axes`, `tunings`, `endings`, and the composed `views: Map<string, AgentView>`. It registers `registerMemoReset(() => fleets.clear())` at `:174`.

`heldFleet(orchDir)` (`:176-194`) is the loader. On the first lookup for a directory it reads `hubs`, `spawnerNames`, holders, all environment axes, tunings, and endings from sqlite, composes every hub with `composeView`, stores the facts in `fleets`, and returns it. Subsequent reads return that object. The first callers are the read functions (`environmentOf`, `tuningOf`, `holderOf`, `agentView`, `agentViews`, etc.).

`refreshAgent` verbatim (`src/store/agent-view.ts:279-286`):

```ts
export function refreshAgent(orchDir: OrchDir, agentId: string): void {
  const facts = fleets.get(orchDir);
  if (facts) {
    const hub = refreshHub(orchDir, facts, agentId);
    if (hub) recomposeChildren(facts, agentId);
  }
  for (const listener of refreshListeners) listener(orchDir, agentId);
}
```

`refreshHub` re-reads one hub and its satellites; a missing hub calls `dropAgent`, which deletes it from every held sub-map and recomposes its children. `refreshSatellites` refreshes holder, environment axes, tuning, and ending. `refreshAgent` also notifies listeners even when this directory has not been loaded.

Every `refreshAgent` caller in `src/`:

- `store/agent-rows.ts:55` — `insertAgent`: inserts a new hub.
- `store/agent-rows.ts:74` — `claimAgent`: stamps the session claim.
- `store/agent-rows.ts:85` — `reclaimAgent`: clears the claim.
- `store/agent-rows.ts:94` — `endAgent`: inserts the ending.
- `store/agent-rows.ts:102` — `setWorktree`: writes the worktree satellite.
- `store/agent-rows.ts:117` — `renameAgent`: changes the hub name; `refreshHub` plus `recomposeChildren` updates descendant `spawnedByName`.
- `store/agent-rows.ts:280` — `getOrCreateSessionAgent`: creates or updates a session hub/process before refreshing it.
- `store/interval-rows.ts:46` — `recordProcess`: closes/opens the process interval.
- `store/interval-rows.ts:53` — `endProcess`: closes the process interval.
- `store/interval-rows.ts:62` — `setHandle`: closes/opens the handle interval.
- `store/interval-rows.ts:71` — `setSpace`: closes/opens the space interval.
- `store/interval-rows.ts:78` — `clearSpace`: closes the space interval.
- `store/interval-rows.ts:89` — `setTuning`: closes/opens the tuning interval.
- `store/interval-rows.ts:99` — `setAgentPlexer`: inserts the plexer satellite.
- `store/lease-rows.ts:47` — `acquireLease`: inserts an open lease.
- `store/lease-rows.ts:71` — `releaseLease`: closes the lease.
- `store/lease-rows.ts:76` — `expireLease`: expires the lease.
- `store/lease-rows.ts:84` — `handoffLease`: closes one lease and inserts another.
- `store/lease-rows.ts:93` — `adoptLease`: closes any old lease and inserts a new one.
- `presence/store.ts:76` — `reapAgentRecord`: deletes the hub (cascading satellites) and refreshes; the missing hub path drops the held entry.

The only exported `agent-view.ts` function that mutates the held fleet is `refreshAgent(orchDir: OrchDir, agentId: string): void`. `onAgentRefreshed(listener: AgentRefreshListener): void` (`:42`) mutates only the listener set, not the held fleet. The other exports (`environmentOf`, `tuningOf`, `holderOf`, `agentView`, `agentViews`, `agentViewIndex`, `liveAgentViews`, `liveViews`) read or derive maps and do not patch `fleets`.

## The presence hold

`src/presence/store.ts:208` has `held: Map<OrchDir, HeldPresence>`. `HeldPresence` (`:200-206`) contains `statuses: Map<string, AgentStatusRow>`, `results: Map<string, string>`, `settled: Set<string>`, `processes: Map<string, ProcessRow>`, and `alive: Map<string, boolean>`. `registerMemoReset(() => held.clear())` is at `:209`.

`heldPresence(root)` (`:211-232`) loads once per directory. It calls `currentProcesses(root)`, initializes `alive` by applying `recordedInstanceIsLive(process.pid, process.startToken)` to every process, then loads `selectAgentStatuses(root)`, `latestResultTexts(root)`, and `settledDispatchIds(root)`, stores the assembled `HeldPresence` in `held`, and returns it. `loadPresence` (`:237-242`) is not the held map itself: it creates a new `Map<string, PresenceEntry>` by iterating the held fleet's `agentViews` and calling `entryFor`. `entryFor` decides `alive` as `view.endedAt === null && current.alive.get(view.id) === true`.

Presence patch functions and effects:

- `recordAgentStatus(root: OrchDir, agentId: string, patch: StatusPatch, now: number): { previous: AgentStatusRow | undefined; current: AgentStatusRow }` (`:251-261`) reads the held prior row, calls `mergeAgentStatus` (which queues the sqlite upsert), then calls `patchStatus` to set the held status row.
- `patchStatus(root: OrchDir, row: AgentStatusRow): void` (`:263-265`) sets `held.get(root)?.statuses[row.agentId]`. There are no direct `src/` callers other than `recordAgentStatus`.
- `dropStatus(root: OrchDir, agentId: string): void` (`:267-269`) deletes the held status. There are no direct `src/` callers.
- `refreshProcess(root: OrchDir, agentId: string): void` (`:275-293`) is registered as the `onAgentRefreshed` listener at `:302`. If the view disappeared it deletes status, result, process, and alive entries. If the process row disappeared it deletes the process and sets alive false. Otherwise it replaces the process row and recomputes alive with `recordedInstanceIsLive`.
- `probeAllProcesses(root: OrchDir): void` (`:295-300`) loops the held process map and recomputes every `alive` value with `recordedInstanceIsLive`.
- The `onRunUpserted` listener (`:305-321`) patches `results` and `settled`: a text result sets the agent's newest result and adds its dispatch id; a result-less update removes the dispatch id and re-reads the newest text from sqlite, deleting or replacing the held result accordingly. `upsertRun` invokes this listener after queuing its sqlite write (`store/run-rows.ts:62-70`). In `src/`, the callers are `daemon/server/status-report.ts:51` (status report) and `:92` (result report).
- `reapAgentRecord(agentId: string, root: OrchDir): void` (`:74-77`) deletes the hub and calls `refreshAgent`; therefore its missing-hub path invokes `refreshProcess` and removes the presence entries. Its direct callers are `daemon/server/handlers/lease.ts:151-152`; `reapDeadAgentRecords(root: OrchDir): string[]` (`:99-119`) also calls it internally for removable dead leaves. `reapDeadAgentRecords`'s daemon callers are `daemon/server/status-report.ts:122` and `daemon/server/handlers/clean.ts:23`.

Other presence callers: `recordAgentStatus` is called by `daemon/server/status-report.ts:47` (report path) and `:118` (liveness tick). `probeAllProcesses` is called only by `status-report.ts:111`. `refreshProcess` has no direct caller; the `onAgentRefreshed` callback at `presence/store.ts:302` is the caller. `patchStatus` and `dropStatus` have no direct `src/` callers.

The liveness tick is `startLivenessTick(orchDir: OrchDir, intervalMs: number, publish: (event: NotifyEvent) => void, logger: Logger): { stop(): void }` (`daemon/server/status-report.ts:100-128`). Each tick calls `probeAllProcesses` (`:111`), marks non-terminal status rows whose `entry.alive` is false as `exited` through `recordAgentStatus` (`:113-120`), then calls `reapDeadAgentRecords` (`:122`). `orchd.ts:196-197` obtains `services.settings.current().daemon.liveness_poll_ms` and passes it as the interval to `startLivenessTick`; the timer is `setInterval(tick, intervalMs)` at `status-report.ts:126`. Alive is therefore initialized on first hold load, recomputed when process rows are refreshed, and polled for all held processes at that setting interval.

## Capacity inputs, mapped to mutations

`computeFleetCapacity` (`src/policy/capacity.ts:89-119`) reads:

- `views` keys and values; `presence.get(view.id)?.alive` via `presenceAliveViews` (`:20-27`), then `view.environment.space` via `liveSpawnCounts` (`:30-41`), `view.rootAgentId`, `view.spawnedBy`, and `view.name` via `rootAgent` (`:43-58`).
- `settings.fleet.max_agents_per_pack` (`:95`) for every pack.
- `settings.spaces` (`:106`) to turn a space id into a display name through `spaceName`.
- `settings.fleet.max_agents_per_space[id]` (`:106`) for each used space.
- `settings.fleet.max_agents_total` (`:111`) for the total cap.
- `options.packRootId` / `options.packSpace` (`:76-88`) to select the pack scope.

Mutation mapping:

- A view appearing is `store/agent-rows.ts:55` (`insertAgent`) or `:280` (`getOrCreateSessionAgent`), each followed by `refreshAgent`; the first load of a directory also creates all views in `heldFleet`.
- A view disappearing is `presence/store.ts:74-77` (`reapAgentRecord`), followed by `refreshAgent`; `refreshHub` sees no hub and `dropAgent` removes it from `facts.views`.
- `rootAgentId` and `spawnedBy` are assigned when `insertAgent` creates the hub (`agent-rows.ts:36-55`) and have no later update writer. Their held view is refreshed by that `refreshAgent`; a parent rename (`agent-rows.ts:115-117`) recomposes children and changes the root/name data used by `rootAgent`.
- A space change is `interval-rows.ts:65-71` (`setSpace`) or `:74-78` (`clearSpace`), each followed by `refreshAgent`; `refreshSatellites` updates the held space axis and recomposes the view.
- Presence `alive` changes through `refreshProcess` (`presence/store.ts:275-293`) on every `refreshAgent` notification and through `probeAllProcesses` (`:295-300`) on the liveness tick. `entryFor` (`:223-230`) then exposes the held boolean, additionally forcing false for an ended view.
- Settings changes are not learned by either held map. `daemon/server/orchd.ts:144-169` starts the one `watchSettings` watcher. Its `load` callback calls `services.settings.reload()` (`:145-149`); `onChange` receives the new settings (`:150-167`) and updates the settings manager's current value. Capacity callers read `services.settings.current()` when they compute (for example `daemon/server/events.ts:84-92`); no settings map patch is performed. The four capacity settings above therefore change on the next computation after the watcher reloads.

## The write queue

`queueWrite` is `export function queueWrite(orchDir: OrchDir, write: RowWrite): void` (`src/store/connection.ts:234`). `RowWrite` is `(db: Orm) => void` (`:31`). Inside a transaction it runs the write synchronously (`:235-237`). Otherwise it appends to the per-dir `writeQueues` map (`:239-241`), schedules one `setImmediate` (`:242-247`), and the callback calls `drainWrites(orchDir)`.

`drainWrites(orchDir: OrchDir): void` is `:275-286`. It removes the queued array, first tries one transaction for the whole batch (`drainAsBatch`, `:251-260`), then, on batch failure, retries each write in its own transaction (`drainOneByOne`, `:263-271`). A queued write can fail after an in-memory patch already succeeded. Failed individual writes are reported to `writeFailureReporter` and dropped (`:268-270`); there is no rollback of the held map. `orchd` installs the reporter at `daemon/server/orchd.ts:87`.

The RPC handler resolves the operation and calls `lineResponse` for the reply at `daemon/server/rpc.ts:99-105` (error replies at `:106-110`). The queue's `setImmediate` drain runs on the later event-loop turn, after the handler has returned and the reply has been queued, as also stated in `docs/orchd-owns-the-store.md` (step 1) and `learnings/2026-09-17-in-memory-state-with-durable-copy.md` (the queue + `setImmediate` section). `orm()` itself calls `drainWrites` synchronously before returning a database handle (`connection.ts:291-293`), so a later sqlite read drains pending writes first.

## Where a per-dir singleton lives today

- `store/agent-view.ts:173`: `fleets: Map<OrchDir, FleetFacts>`; held fleet facts and views. Reset by its `registerMemoReset` callback at `:174`, invoked by `closeAllStores` (`store/connection.ts:343-363`).
- `presence/store.ts:208`: `held: Map<OrchDir, HeldPresence>`; status, result, settled-dispatch, process, and alive maps. Reset by `registerMemoReset` at `:209`, invoked by `closeAllStores`.
- `store/connection.ts:29`: `connections: Map<OrchDir, OpenDatabase>`; cached sqlite/drizzle handles. Cleared directly by `closeAllStores` (`:356-358`).
- `store/connection.ts:33`: `writeQueues: Map<OrchDir, RowWrite[]>`; pending row writes. Drained and cleared by `closeAllStores` (`:344-361`).
- `store/connection.ts:35`: `openTransactions: Map<OrchDir, number>`; transaction nesting depth. Cleared directly by `closeAllStores` (`:360-361`).
- `store/event-rows.ts:9`: `eventSeqs: Map<OrchDir, number>`; next in-memory event sequence per directory. Reset by `forgetEventSeqs` (`:44`) registered at `:47`, invoked by `closeAllStores`.
- `presence/history.ts:78`: `pendingLines: Map<string, string[]>`, keyed by the full history-file path under an `OrchDir`; queued append-only history lines. `flushPresenceHistory` clears it at `:103`; daemon shutdown calls that function at `daemon/server/orchd.ts:56`. It is not registered with `closeAllStores`.

No `WeakMap` occurs under `src/`. Other top-level `Map`s found by the same scan are process-wide registries/caches keyed by agent, target, event, pid, or adapter rather than per-`OrchDir` state.

## Tests that import these modules

`agent-view.ts`: `agent-view.test.ts`, `backend-headless.test.ts`, `broker-ownership.test.ts`, `cli-backends-herdr-headless.test.ts`, `close-always.test.ts`, `command-space-fields.test.ts`, `commands-spawn.test.ts`, `daemon-events.test.ts`, `environment-dictates-what-is-possible.test.ts`, `hello-environment.test.ts`, `holder-death-costs-a-driver.test.ts`, `lease-authority.test.ts`, `nested-spawn-unleased.test.ts`, `one-writer-records-a-spawned-agent.test.ts`, `orchd-rpc-reconnect.test.ts`, `pack-membership.test.ts`, `reap-walks-provenance.test.ts`, `rename-syncs-the-pane-border.test.ts`, `space-policy.test.ts`, `spawn-identity.test.ts`, `spawn-policy.test.ts`, `status-unleased.test.ts`, `store-instants.test.ts`, `transfer-does-not-disturb.test.ts`, `unleased-stays-adoptable.test.ts`, `vocabulary.test.ts`, `work-survives-its-spawner.test.ts`.

`presence/store.ts`: `adapter-pi.test.ts`, `bridge-terminal.test.ts`, `check-bridge.test.ts`, `claude-adapter.test.ts`, `close-always.test.ts`, `close-is-keyed-by-agent-id.test.ts`, `close-reports-every-target.test.ts`, `command-space-fields.test.ts`, `commands-clean.test.ts`, `commands-lease.test.ts`, `commands-results.test.ts`, `doctor-stale-presence.test.ts`, `helpers/presence.ts`, `offline-is-not-a-second-source.test.ts`, `one-writer-records-a-spawned-agent.test.ts`, `owner-scoping.test.ts`, `peer-identity.test.ts`, `port-seam-channel.test.ts`, `presence-dirs-are-reaped-not-migrated.test.ts`, `reap-walks-provenance.test.ts`, `retention.test.ts`, `smoke-seed.ts`, `spawn-identity.test.ts`, `spawn-name-list.test.ts`, `spawn-names.test.ts`, `unleased-stays-adoptable.test.ts`.

`policy/capacity.ts`: `capacity.test.ts`, `commands-status.test.ts`.

The write-queue module is `store/connection.ts`. Direct-importing tests: `a-row-is-not-a-pane.test.ts`, `agent-key-is-minted-id.test.ts`, `agent-view.test.ts`, `broker-governance.test.ts`, `broker-ownership.test.ts`, `claim-agent.test.ts`, `close-always.test.ts`, `close-authority.test.ts`, `close-is-keyed-by-agent-id.test.ts`, `close-reports-every-target.test.ts`, `command-refusal.test.ts`, `command-space-fields.test.ts`, `commands-clean.test.ts`, `commands-lease.test.ts`, `commands-lifecycle.test.ts`, `commands-queue.test.ts`, `commands-results.test.ts`, `commands-runs.test.ts`, `commands-space.test.ts`, `commands-spawn.test.ts`, `commands-status.test.ts`, `cross-pack-result-delivery.test.ts`, `daemon-decision-trail.test.ts`, `daemon-events.test.ts`, `daemon-rpc-identity.test.ts`, `daemon-rpc.test.ts`, `daemon-status-lease.test.ts`, `doctor-checks.test.ts`, `doctor-declared-vs-reality-tuning.test.ts`, `doctor-declared-vs-reality.test.ts`, `doctor-stale-presence.test.ts`, `doctor-unscoped-tasks.test.ts`, `doctor.test.ts`, `environment-dictates-what-is-possible.test.ts`, `every-agent-has-a-link.test.ts`, `hello-environment.test.ts`, `helpers/rows.ts`, `helpers/space.ts`, `helpers/tempdir.ts`, `holder-death-costs-a-driver.test.ts`, `lease-authority.test.ts`, `lifecycle-reports-a-partial-run.test.ts`, `nested-spawn-unleased.test.ts`, `no-placement-row-over-the-composed-view.test.ts`, `notify-events-format.test.ts`, `one-query-stack-over-the-connection.test.ts`, `one-shape-only.test.ts`, `one-spelling-per-fact.test.ts`, `one-writer-records-a-spawned-agent.test.ts`, `outbox-ack.test.ts`, `owner-scoping.test.ts`, `pack-membership.test.ts`, `peer-lease-visibility.test.ts`, `plexer-versions.test.ts`, `queue-cli-scope.test.ts`, `queue-reaping.test.ts`, `queue-scope.test.ts`, `queue-space-replay.test.ts`, `queue.test.ts`, `reap-picker.test.ts`, `reap-walks-provenance.test.ts`, `rename-syncs-the-pane-border.test.ts`, `retention.test.ts`, `routing-hardening.test.ts`, `self-actor-identity.test.ts`, `session-refresh-repoints-identity.test.ts`, `session-sees-only-held-agents.test.ts`, `space-policy.test.ts`, `spawn-identity.test.ts`, `spawn-policy.test.ts`, `spawn-registry.test.ts`, `status-unleased.test.ts`, `store-agent-rows.test.ts`, `store-catalogue.test.ts`, `store-connection-guards.test.ts`, `store-events.test.ts`, `store-identity.test.ts`, `store-instants.test.ts`, `store-interval-rows.test.ts`, `store-lease-rows.test.ts`, `store-outbox.test.ts`, `store-queue.test.ts`, `store-rebuild-schema.test.ts`, `store-runs.test.ts`, `store-task-rows.test.ts`, `store-write-queue.test.ts`, `transfer-does-not-disturb.test.ts`, `unleased-agents.test.ts`, `unleased-stays-adoptable.test.ts`, `vocabulary.test.ts`, `work-loop-binding.test.ts`, `work-loop-identity.test.ts`, `work-survives-its-spawner.test.ts`.
