# orchd performance log

Every run is the same command, so the rows compare across commits:

```
bun packages/orch/scripts/bench-daemon.ts --requests 500 --rounds 5
```

64 agents, concurrency 32, 10 event subscribers, 500 requests per phase. Times are the
whole phase in milliseconds unless the column says otherwise. Runs 1 to 7 were one round
each; from run 8 every column is the mean of 5 rounds against the one daemon.

Target: every phase finishes 500 requests in well under 200 ms.

The number to read is **p99**, the latency of one call at the 99th percentile.

## p99 by stage

| phase | 1: before memo | 2: fleet memo | 3: reads via orchd | 4: write queue | 5: fleet map | 6: presence map | 7a / 7b: history off the request | 8: same build, mean of 5 | target |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| daemon-status (connect per call) | 19.3 | 33.2 | 38.0 | 39.4 | 28.9 | 34.3 | 30.9 / 84.6 | 12.8 | floor |
| status (fleet rows) | 1843 | 88.8 | 110.9 | 52.9 | 59.4 | 57.0 | 67.2 / 69.7 | 40.2 | 60 |
| peer-view | 88.5 | 24.0 | 22.9 | 18.4 | 14.2 | 18.8 | 19.5 / 27.8 | 15.0 | 10 |
| report-status (transition + fan-out) | 1019 | 344 | 358 | 287 | 171 | 71.8 | 94.4 / 69.3 | 65.3 | 50 |
| pipelined daemon-status (one socket) | — | 1.1 | 0.76 | 2.9 | 2.8 | 0.84 | 0.79 / 4.06 | 1.99 | — |
| fan-out | 1019 | 345 | 358 | 288 | 171 | 71 | 95 / 69 | 65.4 | 50 |

Milliseconds. Stages 4, 5, 6 are steps 1, 2, 3 of "memory is the truth": the write
queue, the fleet map patched, presence patched. Stage 7 is two runs of one build: the
spread between them is wider than the change under test. Stage 8 is the same build as 7,
the first mean of 5 rounds.

## Phases

| phase | what one request does |
|---|---|
| daemon-status (connect per call) | open a socket, ask orchd for its status, close |
| status (fleet rows) | the `orch status` payload: every agent's row, about 40 KB |
| peer-view | which agents a caller may see, from provenance |
| report-status (transition + fan-out) | a bridge reports a state change; orchd writes it and pushes an event to every subscriber |
| pipelined daemon-status (one socket) | 500 status calls down one open socket |
| fan-out | how long an event takes to reach a subscriber after the report |

## Runs

### 2026-09-16, before the read memo (commit 2510fae)

Every read rebuilt the fleet from sqlite and probed 64 processes. Every write committed
with `synchronous = FULL`. `status` hashed both bridge bundles on every call.

| phase | ms/500 | req/s | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|---:|
| daemon-status (connect per call) | 95 | 5242 | 4.5 | 15.5 | 19.3 | 19.7 |
| status (fleet rows) | 22937 | 22 | 1441 | 1658 | 1843 | 1893 |
| peer-view | 793 | 631 | 48.6 | 76.4 | 88.5 | 88.8 |
| report-status (transition + fan-out) | 14172 | 35 | 906 | 1007 | 1019 | 1023 |
| pipelined daemon-status (one socket) | 10 | — | 0.6 | — | — | — |
| fan-out | 4680/5000 events | | 909 | | 1019 | 1023 |

### 2026-09-16, fleet memo, `synchronous = NORMAL`, no bundle hash, CLI writes via orchd (commit b518fd8)

`readFleetFacts` and `loadPresence` are held per store version. `status` no longer
hashes bundles. Every CLI write goes through an orchd RPC.

| phase | ms/500 | req/s | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|---:|
| daemon-status (connect per call) | 131 | 3804 | 4.7 | 32.7 | 33.2 | 33.4 |
| status (fleet rows) | 1145 | 437 | 72.1 | 86.4 | 88.8 | 95.5 |
| peer-view | 168 | 2978 | 9.1 | 20.4 | 24.0 | 25.1 |
| report-status (transition + fan-out) | 3866 | 129 | 240 | 327 | 344 | 360 |
| pipelined daemon-status (one socket) | 11 | 46796 | 0.6 | 1.1 | 1.1 | 1.2 |
| fan-out | 4680/5000 events | | 243 | | 345 | 360 |

Change against the previous run, on p99: status 1843 → 89 ms (21×), peer-view 89 → 24 ms
(3.7×), report-status 1019 → 344 ms (3×), fan-out 1019 → 345 ms (3×). daemon-status p99
went 19 → 33 ms: the connect-per-call phase moves with process scheduling and is at its
floor. Pipelined p99 is 1.1 ms.

Still over target on p99: `status` (89 ms; the 40 KB reply × 500 is 20 MB of JSON, so the
payload is now the largest cost) and `report-status` (344 ms). A report costs 7.7 ms of
daemon time; 32 concurrent callers queue behind each other on one thread, so the tail is
32 × 7.7 ms. Of the 7.7 ms, two thirds is two full fleet rebuilds: every write bumps the
store version, so the memo misses on the existence check and again on the event build.

### 2026-09-16, every CLI read via orchd (working tree after 5ffc133, store handover 100%)

No command under `src/commands/` opens the store except `status/offline.ts`. The bench
drives orchd directly, so this run is the baseline for the held-fleet steps, not a gain.

| phase | ms/500 | req/s | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|---:|
| daemon-status (connect per call) | 137 | 3637 | 4.7 | 36.1 | 38.0 | 38.2 |
| status (fleet rows) | 783 | 638 | 44.0 | 93.3 | 110.9 | 115.5 |
| peer-view | 199 | 2508 | 11.4 | 20.2 | 22.9 | 28.2 |
| report-status (transition + fan-out) | 3667 | 136 | 218 | 335 | 358 | 374 |
| pipelined daemon-status (one socket) | 6 | 78616 | 0.35 | 0.7 | 0.76 | 0.81 |
| fan-out | 4680/5000 events | | 213 | | 358 | 374 |

Same shape as the previous run within noise: status p99 89 → 111 ms, report-status
344 → 358 ms, peer-view 24 → 23 ms. Pipelined p99 1.1 → 0.76 ms. The daemon still
rebuilds the fleet on every write; step 1 of the held fleet is next.

### 2026-09-17, the write queue (step 1 of "memory is the truth")

A row write that needs no result (`upsertRun`, the event insert with a minted `seq`,
`deleteAgentStatus`, the outbox insert, the control outcome) is queued and lands in one
transaction on `setImmediate`, after the reply. `orm()` drains before it returns, so a
read is read-your-writes. `mergeAgentStatus` still reads after its write, so each report
drains the previous one; the fleet memo still checks `data_version`.

| phase | ms/500 | req/s | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|---:|
| daemon-status (connect per call) | 124 | 4028 | 4.4 | 38.9 | 39.4 | 39.6 |
| status (fleet rows) | 462 | 1082 | 28.5 | 39.6 | 52.9 | 54.7 |
| peer-view | 143 | 3493 | 8.4 | 15.9 | 18.4 | 20.9 |
| report-status (transition + fan-out) | 3240 | 154 | 199 | 262 | 287 | 292 |
| pipelined daemon-status (one socket) | 8 | 63851 | 0.29 | 2.8 | 2.9 | 2.9 |
| fan-out | 4680/5000 events | | 202 | | 288 | 292 |

On p99: status 111 → 53 ms (under the 60 ms target), peer-view 23 → 18 ms, report-status
358 → 287 ms, fan-out 358 → 288 ms. The event insert and the run upsert left the
request; what remains in a report is the status merge (read, write, read) and the two
fleet rebuilds behind the `data_version` check. Steps 2 and 3 remove those.

### 2026-09-17, the fleet map is patched, never rebuilt (step 2)

`agent-view.ts` loads the fleet once per process and holds it. A fleet-shape writer
calls `refreshAgent`, which re-reads that one agent and recomposes its view. No
`data_version` check on the fleet. The presence memo still checks it and still probes.

| phase | ms/500 | req/s | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|---:|
| daemon-status (connect per call) | 119 | 4206 | 4.2 | 26.1 | 28.9 | 29.2 |
| status (fleet rows) | 502 | 996 | 30.4 | 43.9 | 59.4 | 61.4 |
| peer-view | 123 | 4077 | 6.9 | 13.6 | 14.2 | 14.6 |
| report-status (transition + fan-out) | 2193 | 228 | 136 | 166 | 171 | 172 |
| pipelined daemon-status (one socket) | 10 | 49452 | 0.45 | 2.7 | 2.8 | 3.0 |
| fan-out | 4680/5000 events | | 138 | | 171 | 171 |

On p99: report-status 287 → 171 ms, fan-out 288 → 171 ms, peer-view 18 → 14 ms, status
53 → 59 ms (noise; the payload bounds it). A report now costs about 4.4 ms of daemon
time, down from 7.7 ms at run 2. What remains: the status merge reads and re-reads
sqlite, `runSettled` reads sqlite, the presence memo rebuilds behind `data_version` and
probes 64 processes, and the JSONL history append. Step 3 takes the first three.

### 2026-09-17, presence is patched, never rebuilt (step 3)

`presence/store.ts` holds statuses, results, settled dispatches, processes and `alive`
per dir, loaded once. `mergeAgentStatus` reads nothing and queues one upsert. The
liveness tick is the only probe. `storeMemo`, `storeVersion`, the `data_version` check
and `holdPresenceFor` are gone. No read on the report path touches sqlite.

| phase | ms/500 | req/s | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|---:|
| daemon-status (connect per call) | 109 | 4586 | 3.7 | 33.5 | 34.3 | 34.5 |
| status (fleet rows) | 485 | 1030 | 28.5 | 47.1 | 57.0 | 59.2 |
| peer-view | 132 | 3787 | 7.0 | 15.0 | 18.8 | 18.9 |
| report-status (transition + fan-out) | 686 | 729 | 38.0 | 67.8 | 71.8 | 76.2 |
| pipelined daemon-status (one socket) | 6 | 83752 | 0.32 | 0.77 | 0.84 | 0.9 |
| fan-out | 4680/5000 events | | 38 | | 71 | 72 |

On p99: report-status 171 → 72 ms, fan-out 171 → 71 ms; the phase went 2193 → 686 ms.
A report now costs about 1.4 ms of daemon time, down from 4.4 ms. Against run 1 the
report path is 14× faster and `status` is 32× faster. Remaining over target:
report-status 72 vs 50, peer-view 19 vs 10. What is left in a report: the JSONL history
append (a sync `appendFileSync` plus an `existsSync`/`mkdirSync` for the agent dir),
`loadPresence` composing all 64 entries for one lookup, the event build, and the fan-out
to 10 subscribers.

### 2026-09-17, the history append leaves the request (T55)

`presence/history.ts` queues each JSONL line and lands them on `setImmediate`, one
`mkdirSync` per agent dir and one `appendFileSync` per file. `presenceEntry(root, id)`
composes one entry for the eleven one-key readers. `composeBase` reads the question row
only for `asking`. Two runs of the same build, p99:

| phase | 7a | 7b |
|---|---:|---:|
| daemon-status (connect per call) | 30.9 | 84.6 |
| status (fleet rows) | 67.2 | 69.7 |
| peer-view | 19.5 | 27.8 |
| report-status (transition + fan-out) | 94.4 | 69.3 |
| fan-out | 95 | 69 |

report-status moved 25 ms between the runs; the change under test is smaller than that.
The machine also ran three pi panes and herdr during both. One round cannot rank a change
of this size, so the bench gets `--rounds` and reports the mean of each percentile.

### 2026-09-17, run 8: the same build, mean of 5 rounds

| phase | ms/500 | req/s | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|---:|
| daemon-status (connect per call) | 56 | 10480 | 2.7 | 12.1 | 12.8 | 13.0 |
| status (fleet rows) | 405 | 1244 | 24.9 | 34.4 | 40.2 | 41.5 |
| peer-view | 95 | 5317 | 5.1 | 13.1 | 15.0 | 15.4 |
| report-status (transition + fan-out) | 541 | 931 | 30.3 | 59.3 | 65.3 | 66.4 |
| pipelined daemon-status (one socket) | 7 | 83776 | 0.29 | 1.9 | 1.99 | 2.0 |
| fan-out | 4840/5000 events | | 30 | | 65 | 66 |

Against run 6 on p99: status 57 → 40, peer-view 19 → 15, report-status 72 → 65. Every
row from here is a mean of 5 rounds, so this is the baseline the next change compares to.
Over target: report-status 65 vs 50, peer-view 15 vs 10.

## Next

1. Memory is the truth (`docs/orchd-owns-the-store.md`, steps 1–6): a write patches the
   map and queues the row; a `setImmediate` drain commits the turn's rows in one
   transaction after the replies went out; the tick owns liveness. The `data_version`
   check and the presence hold go.
2. `report-status`: one map patch, one queued row, one event, no rebuild.
3. `status`: cut the payload, or stream rows.
