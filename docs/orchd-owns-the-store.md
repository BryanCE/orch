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

## Then: the held fleet

Only after the gate above passes. Each step is measured with
`bun packages/orch/scripts/bench-daemon.ts --requests 500` and recorded in
`docs/orchd-performance.md`. The number is p99.

1. **Writers invalidate, reads never check.** `storeMemo` drops the `data_version` and
   `total_changes()` key; `storeVersion` is deleted. A fleet-shape writer (`insertAgent`,
   `endAgent`, lease, handle, space, process, tuning, rename) calls `forgetFleet`. A read is
   a map lookup.
2. **Status, results and liveness are patched, not rebuilt.** `presence/store.ts` holds
   `statuses`, `results`, `alive` per dir. `mergeAgentStatus` and the result report write
   the row and patch the map. `alive` is written only by the liveness tick on
   `daemon.liveness_poll_ms`. No read probes a process. `holdPresenceFor` goes.
3. **The report path reads the map.** `status-report.ts`, `status-events.ts`: existence
   check and `composeBase` from the held fleet; `pendingQuestion` only for `asking`.
4. **The capacity stamp runs over the held maps.** `events.ts:84` stops rebuilding.
5. **The work loop wakes for a reason.** Only a transition into `idle`, `done`, `error`,
   `aborted`, a result, a registration or a close wakes it.
6. **Prepared statements on the hot writes.** The status upsert and the run upsert are
   drizzle `.prepare()` statements built once per connection.

Targets for the run after step 6: `report-status` and `fan-out` p99 under 50 ms, phase
under 500 ms; `status` p99 under 60 ms; `peer-view` p99 under 10 ms.

## Memory

Per agent the daemon holds one composed view, one status row and the newest result text.
150 agents is under 1 MB plus results. Nothing holds history; `status.jsonl` and
`results.jsonl` are append-only and never read.
