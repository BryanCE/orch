# orchd hot-path work

Goal: `report-status` and `status` under their p99 targets (50 ms and 60 ms) on both node
and bun. Baseline is the runtime comparison in `docs/orchd-performance.md` (2026-09-17,
500 requests, mean of 5): report-status p99 54 node / 47 bun, status p99 44 node / 49 bun.

Bench, Bryan-only:

```
bun packages/orch/scripts/bench-daemon.ts --runtime node --requests 500 --rounds 5
bun packages/orch/scripts/bench-daemon.ts --runtime bun  --requests 500 --rounds 5
```

## Findings so far (from reading, not yet confirmed by recon)

report-status, per request (`status-report.ts:43` → `events.ts:65`):
- `emitAndNotify` recomputes fleet capacity on every transition: `agentViews` builds a
  fresh Map of all views, `loadPresence`, `computeFleetCapacity` walks the fleet. O(fleet)
  per report, only so the event can carry `packUsed/packCap`.
- `rpc.ts:247` fan-out: `lineResponse` per subscriber, each call `JSON.stringify`s the same
  event. 10 subscribers = 10 stringifies of one object.

status, per call (`state.ts:153` → `offline.ts:31`):
- `fleetLeaseFacts` runs twice: inside `fleetDriveStates` and again in `fleetStatus` for
  `leasePayloadFrom`. Each run probes lease-holder processes.
- The reply is ~40 KB for 64 agents (~625 bytes/row). The payload is the wire floor.

## Plan

1. Recon wave (R1–R4, one agent each, read-only). Reports land in `tasks/perf/recon/`.
2. From the reports, write the implementation tasks (T1…), one file per task, exact
   files/edits/tests, grouped into waves by file ownership.
3. Wave A, report path: hold `FleetCapacity` and patch it where `refreshAgent` and the
   liveness tick already patch; encode the event line once per event.
4. Wave B, status path: compute lease facts once per call; cut UNREAD fields from the row
   (R2's table decides which); then hold the serialised `status` reply and re-serialise
   only when the fleet or presence is patched.
5. Bench after each wave, both runtimes, append to `docs/orchd-performance.md`.

Later, not now: profile the write-queue drain; if the commit shows in the tail, move all
sqlite writes to a worker thread with its own connection (WAL: one writer, many readers).

## Spawn

```
orch spawn recon-report recon-status recon-held recon-tests --tab perf \
  --file tasks/perf/R1-report-path.md --file tasks/perf/R2-status-path.md \
  --file tasks/perf/R3-held-state.md --file tasks/perf/R4-tests-bench.md
```

Needs a herdr space grant first (`orch grant <id>` from the refusal), or `--space <id>`.
