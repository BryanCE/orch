# orchd owns the store

## Goal

One process reads and writes `orch.db`: orchd. A CLI command is a client. It sends an RPC
and prints the answer. It never opens the store while a daemon is up.

The two exceptions, and the only two: `orch status --offline` and `orch doctor` read the
store directly, because they must work when there is no daemon. Nothing else under
`src/commands/` imports `store/`, `presence/store.ts` or `entities/`.

Why: a held fleet inside orchd is only correct if orchd sees every write. While any other
process writes the store, orchd must re-read it on every call, and that re-read is the
whole cost measured in `docs/orchd-performance.md`.

## Where it stands (working tree after 5ffc133, 100%: the gate passes)

Every write goes through orchd: `register-agent`, `agent-closed`, `detach`, `adopt`,
`rename`, `reap`, `reap-candidates`, `reclaim`, `set-handle`, `lifecycle`, `steer`,
`dispatch`, `answer`, `enqueue`, `register-session`, `report-status`, `report-result`,
`control-outcome`, `space-create`, `space-rename`, `space-delete`, `record-home`,
`clear-home`, `admit-home`, `grant`, `clean`, `queue-cancel`, `queue-edit`,
`queue-take-on`, `queue-reap`, `queue-intake`.

Governance is stamped by the daemon. A governed call carries `caller: CallerCredential`
(launch, session, process) and nothing else; `stampGovernance` resolves the actor, its space
and whether it is an operator, and refuses `--steal` / `--cross-space` for a non-operator.
The CLI reads no store to learn who it is.

Read RPCs served and used: `spaces`, `space`, `home`, `grants`, `queue-list`,
`resolve-agent`, `fleet`, `runs`, `run`, `agent-status`, `process-live`, `resolve-target`,
`resolve-lifecycle`, `self`, `owned-agents`, `questions` (filtered by the caller),
`close-targets`. Events carry `holder`, so `events` filters with no lookup.

Every command is converted. Nothing under `src/commands/` opens the store except
`status/offline.ts`, the one file behind `status --offline`, which orchd's `status` handler
also reads through (`fleetStatusRows`). `doctor` lives under `src/doctor/` and keeps its
direct reads by ruling.

The shared seams a command uses instead: `whoAmI` / `refuseNonOperatorOverride` /
`registerCallerSession` (`commands/self.ts`), `resolveEntity` / `resolveLifecycle` /
`refuseForeignHolder` (`commands/resolve.ts`), `readFleet` (`commands/fleet.ts`),
`lifecycleTargets(services, self, invocation)` for `--all`. `commands/target.ts` keeps only
the remote and text helpers. The callerless wrappers (`resolveTarget`, `resolvePane`,
`callerMayResolve`, `scopeEntitiesToSpace`, `recipientFor`, `maySpawnFrom`,
`spawnerIsRepliable`, `workerHeaderContext`) are deleted; every survivor takes a credential
or a `self`.

Headless spawn needs no change: `HeadlessBackend.spawn` runs inside orchd (the
`spawn-headless` handler), so `registerSpawnedAgent` is already a daemon-side write.

### Gate

```
grep -rln "store/\|presence/store\|entities/inventory\|identity/self\|policy/caller" packages/orch/src/commands
```

prints `status/offline.ts` and nothing else. `bun check` and the touched tests are the
rest of the gate. Passed 2026-09-16; the baseline bench is in `docs/orchd-performance.md`.

## Then: memory is the truth, sqlite is the copy

Only after the gate above passes. Each step is measured with
`bun packages/orch/scripts/bench-daemon.ts --requests 500` and recorded in
`docs/orchd-performance.md`. The number is p99.

The model. The daemon's maps are the truth. An operation reads them and patches them. A
row write is queued and lands in sqlite after the reply, in one transaction per drain.
sqlite is the copy that survives a crash: orchd loads the maps from it once, and
`status --offline` and `doctor` open it when no daemon runs. The daemon reads sqlite at
runtime only for cold data the maps do not hold (run history, past events, closed leases).
Research and numbers: `learnings/2026-09-17-in-memory-state-with-durable-copy.md`.

1. **The write queue.** `store/connection.ts` gets a per-dir queue of row writes and a
   drain. A writer pushes its statement and returns. The drain runs on `setImmediate`,
   after the replies of the turn went out, and commits every queued statement in one
   `BEGIN IMMEDIATE ... COMMIT`. A runtime read of sqlite (`ormForRead`) drains first, so
   it is read-your-writes. `daemon stop` and `reload` drain before the connection closes.
   `orm(orchDir)` drains before it returns, so every read-then-write writer keeps its
   order; the drain itself uses the raw handle. A writer that needs the write's result
   (`changes`, a `returning()` id) runs through `orm` synchronously, except the event
   insert, which is hot: it mints `seq` from a counter loaded with `max(seq)` and queues
   the row. The loss window on a crash is one event-loop turn; on power loss, the last
   commit under `synchronous = NORMAL`. The file is never corrupt.
2. **The fleet map is patched, never rebuilt.** `store/agent-view.ts` holds one
   `FleetFacts` per dir, built from sqlite once on the first read. A fleet-shape writer
   (`insertAgent`, `claimAgent`, `reclaimAgent`, `endAgent`, `renameAgent`,
   `getOrCreateSessionAgent`, lease, handle, space, process, tuning, worktree) writes its
   row and then refreshes that one agent's entry: its hub row and satellites are read
   back by id and its view recomposed. A rename also recomposes the children, whose
   `spawnedByName` changed. `reapAgentRecord` drops the entry. A whole-fleet read is a
   map lookup; the fleet is never rebuilt after the first load. The fleet no longer uses
   `storeMemo`.
3. **Status, results and liveness are patched, not rebuilt.** `presence/store.ts` holds
   `statuses`, `results`, `alive` per dir. `mergeAgentStatus` and the result report patch
   the map and queue the row. `alive` is written only by the liveness tick on
   `daemon.liveness_poll_ms`. No read probes a process. `holdPresenceFor`, `storeMemo`,
   `storeVersion` and the `data_version` check are deleted.
4. **The report path reads the map.** `status-report.ts`, `status-events.ts`: existence
   check and `composeBase` from the held fleet; `pendingQuestion` only for `asking`.
5. **The capacity stamp runs over the held maps.** `events.ts:84` stops rebuilding.
6. **The work loop wakes for a reason.** Only a transition into `idle`, `done`, `error`,
   `aborted`, a result, a registration or a close wakes it.

Prepared statements on the hot writes are not a step: the drain batches them, so one
commit covers a turn's worth of reports.

Targets for the run after step 6: `report-status` and `fan-out` p99 under 50 ms, phase
under 500 ms; `status` p99 under 60 ms; `peer-view` p99 under 10 ms.

## Memory

Per agent the daemon holds one composed view, one status row, the newest result text and
the queued rows of the current turn. 150 agents is under 1 MB plus results. Nothing holds
history; `status.jsonl` and `results.jsonl` are append-only and never read.
