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

## Waves as run  (reports: tasks/perf/recon/R1-R4; R1, R2, R4 under /home/bryan/orch/tasks/perf/recon/)

### Wave A  (files: wire.ts rpc.ts | drive-state.ts offline.ts state.ts | command.ts rows.ts protocol.ts + fixtures)
- tasks/perf/T1-fanout-encode-once.md     owner: rpc.ts, wire.ts             encode the event line once per event
- tasks/perf/T2-lease-facts-once.md       owner: drive-state.ts, offline.ts, state.ts   one fleetLeaseFacts per status
- tasks/perf/T3-cut-unread-row-fields.md  owner: command.ts, rows.ts, protocol.ts   drop capabilities, sessionPath, turns

### CHECKPOINT A: committed 629b65d. Bench in docs/orchd-performance.md, "Machine change".

### Wave B  (files: events.ts notify.ts event.ts)
- tasks/perf/T4-delete-event-capacity.md  owner: events.ts, types/notify.ts, notify/event.ts   delete event.capacity; no reader

### Wave C  (files: policy/capacity.ts | daemon/server/capacity.ts presence/store.ts status-report.ts orchd.ts | protocol.ts handlers/fleet.ts table.ts state.ts | status/index.ts)
- tasks/perf/T5-capacity-split.md         owner: policy/capacity.ts          fleetCapacity + scopeCapacity; computeFleetCapacity composes them
- tasks/perf/T6-capacity-hold.md          owner: daemon/server/capacity.ts, presence/store.ts, status-report.ts, orchd.ts   held per dir; forget on refreshAgent, liveness flip, settings reload
- tasks/perf/T7-capacity-rpc.md           owner: protocol.ts, handlers/fleet.ts, table.ts, state.ts   `capacity` RPC serves the held value scoped
- tasks/perf/T8-status-capacity-rpc.md    owner: status/index.ts             footer line over the RPC, no second fleet pull

### Wave D  (files: entities/census.ts inventory.ts backends/registry.ts daemon/client/registration.ts)
- tasks/perf/T9-census-hold.md            owner: entities/census.ts, inventory.ts, registry.ts, registration.ts   census listed once, trusted until refreshAgent or a break; no isAvailable() on a hot path

### Wave D fix  (files: status/index.ts)
- tasks/perf/T10-status-offline-capacity.md   owner: status/index.ts   `offlineCapacity` function; no IIFE in the ternary
- tasks/perf/T11-tmux-selection-test.md       owner: test/cli-backends-tmux.test.ts   explicit selection resolves without a PATH probe

### CHECKPOINT B: bun check clean over the tree (T4–T11 landed). Benched twice, docs/orchd-performance.md "waves B–D".

### Wave E  (files: scripts/bench-daemon.ts | store/connection.ts | status/rows.ts)
- tasks/perf/T12-bench-trace.md               owner: scripts/bench-daemon.ts   `--trace`: daemon logs at trace, report ends with the drain summary
- tasks/perf/T13-drain-clock.md               owner: store/connection.ts      drain `elapsedMs` from `performance.now()`
- tasks/perf/T14-status-row-session-read.md   owner: status/rows.ts           session file read only when presence has no status

### CHECKPOINT C: bun check; bench with `--trace` on both runtimes; the drain p99 decides the sqlite worker thread.

Findings held for later, not tasks yet:
- `rows.ts:88` reads a session file per agent per status (`adapter.sessionView.readSessionView`).
- `registration.ts:47` runs `herdr --version` on every session registration (`versionInfo.installed()`).
- `registry.ts:58` probes availability to pick a backend when settings name no default.
- fan-out delivers 4840/5000 in every bench run; deterministic, predates this work.

## Spawn

```
orch spawn recon-report recon-status recon-held recon-tests --tab perf \
  --file tasks/perf/R1-report-path.md --file tasks/perf/R2-status-path.md \
  --file tasks/perf/R3-held-state.md --file tasks/perf/R4-tests-bench.md
```

Needs a herdr space grant first (`orch grant <id>` from the refusal), or `--space <id>`.
