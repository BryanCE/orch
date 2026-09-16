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

## Where it stands (working tree after 67702a0, about 75%)

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

Commands converted (no `store/` or `presence/store` import): `grant`, `queue`, `clean`,
`runs`, `review`, `status` (live), `events`, `control` (dispatch, steer, answer, model,
message, broadcast, pipe), `results` (result, questions, tail, session), `close`, `abort`,
`spawn`, `tile`, `rename`, `detach`, `adopt`, `reap`.

Headless spawn needs no change: `HeadlessBackend.spawn` runs inside orchd (the
`spawn-headless` handler), so `registerSpawnedAgent` is already a daemon-side write.

### Reads still made by the CLI process

| file | store call | what replaces it |
|---|---|---|
| `lifecycle/index.ts`, `lifecycle/reset.ts` | `selectAgentStatus`, `tuningOf`, `spawnedRecords` | `resolve-lifecycle` already answers the view; status and tuning ride on it |
| `lifecycle/reload.ts` | `selectAgentStatus`, `agentView`, `tuningOf`, `agentProcessLive` | same, plus `process-live` |
| `target.ts` (`backendTarget`, `assertAgentOwned`, `assertPaneUnowned`) | `spawnedRecords`, `loadPresence`, `currentLease` | `resolve-lifecycle` (`holder`, `callerOwns`); the rename and pane verbs move onto it |
| `panes.ts`, `status/index.ts`, `status/rows.ts` | `loadPresence`, `spawnedRecords`, `agentViewIndex`, `liveViews`, `pendingQuestion` | `readFleet`; the question rides on the fleet presence row |
| `setup.ts` | `presenceDir` | a path helper outside `presence/store.ts` |
| `identity/self.ts` `ensureCallerRegistered` (status, events) | `callerKindOf`, `selfIdentityOf` | `self` answers `kind`; register when it says unregistered |

`status --offline` and `doctor` keep their direct reads by ruling.

### Gate

```
grep -rln "store/\|presence/store\|entities/" packages/orch/src/commands
```

prints `status/offline.ts` and the doctor files, and nothing else. A module under
`entities/` that imports no `store/` module (`entities/target.ts` parses text) may stay
imported; the grep is then narrowed to the modules that open the store. `bun check` and
the touched tests are the rest of the gate.

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
