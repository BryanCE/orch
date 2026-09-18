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

## Runtime comparison

The bench takes `--runtime <node|deno|bun>`: it runs the built `dist/daemon/orchd.js`
under that runtime's binary, so two runs differing only in the flag compare runtimes on
identical code. Without the flag the daemon runs from source under the bench's own runtime
(bun), which is what every run above measured.

### 2026-09-17, node vs bun, same build as run 8, mean of 5 rounds

```
bun packages/orch/scripts/bench-daemon.ts --runtime node --requests 500 --rounds 5
bun packages/orch/scripts/bench-daemon.ts --runtime bun  --requests 500 --rounds 5
```

node 22.21.0, bun 1.4.0 (the Rust codebase). The standard 500 requests per phase, so
every column compares to the log above.

node:

| phase | ms/500 | req/s | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|---:|
| daemon-status (connect per call) | 46 | 14189 | 2.14 | 11.42 | 11.98 | 12.62 |
| status (fleet rows) | 409 | 1251 | 24.29 | 36.22 | 44.24 | 46.46 |
| peer-view | 86 | 6016 | 4.54 | 10.07 | 12.31 | 12.78 |
| report-status (transition + fan-out) | 549 | 920 | 32.87 | 49.93 | 54.33 | 55.53 |
| pipelined daemon-status (one socket) | 5 | 97414 | 0.24 | 1.19 | 1.28 | 1.28 |
| fan-out | 4840/5000 events | | 32.8 | | 54.6 | 55.8 |

bun:

| phase | ms/500 | req/s | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|---:|
| daemon-status (connect per call) | 36 | 15076 | 1.83 | 4.97 | 5.82 | 6.17 |
| status (fleet rows) | 354 | 1477 | 20.55 | 45.31 | 48.69 | 51.04 |
| peer-view | 82 | 6349 | 4.43 | 9.24 | 10.08 | 11.01 |
| report-status (transition + fan-out) | 513 | 987 | 31.33 | 45.19 | 47.01 | 47.85 |
| pipelined daemon-status (one socket) | 5 | 108170 | 0.24 | 0.55 | 0.66 | 0.72 |
| fan-out | 4840/5000 events | | 31 | | 46.8 | 47.8 |

On p99, bun leads four of five phases: daemon-status 12.0 → 5.8, peer-view 12.3 → 10.1,
report-status 54.3 → 47.0 (the first time a report lands under the 50 ms target),
pipelined 1.28 → 0.66. node leads `status` on p99 (44.2 vs 48.7) while bun leads it on
p50 and throughput (18% more req/s): bun serialises the 40 KB reply faster and has the
longer tail. Every gap is under 15% except connect-per-call, where bun's socket accept and
teardown are about half the cost.

The same pair was run once before at 2000 requests per phase, and there `report-status`
went the other way: node p99 55.6 vs bun 66.2, node 23% more req/s, while bun still took
connect-per-call (17.5 vs 6.2) and the rest tied. One phase flipping by 20% between two
runs of the same two binaries is the machine's own spread, the same spread run 7a/7b
showed on one runtime. The stable findings are the ones that held both times: bun wins
connect-per-call by about 2×, and the rest sits within the noise.

Ruling: the runtime is not a performance decision for orchd. `node` stays the default
(`DEFAULT_RUNTIME`) because it is the most widely present; bun is a valid pick and, on this
build, slightly ahead on the daemon's hot path. Nothing in orchd may branch on the runtime
to chase either number; the next gains on `report-status` come from the work in "Next",
which moves the same on both.

## Machine change

Every run above ran on the home laptop, WSL. From here the bench runs on the office
machine, WSL, checkout on `/mnt/c`, temp dir on the WSL disk. The first run on the office
machine was Windows native (bun 1.4.0 Windows x64) and came out 3× to 5× slower on every
phase (`status` p99 232 node, `report-status` 127): named pipes, NTFS and the temp dir
scan, not the code. The same build on the same machine under WSL sits beside the laptop
rows below. Windows native numbers are not comparable to anything in this log.

### 2026-09-18, wave A: encode once, lease facts once, three row fields cut

Three edits. The subscriber fan-out in `rpc.ts` encodes the event line once and writes
the same string to every socket. `fleetStatus` reads `fleetLeaseFacts` once and hands it
to `fleetStatusRows` (`leaseFacts`), where it used to run twice per `status` call.
`StatusRow` lost `capabilities`, `sessionPath` and `turns`: nothing read them off a row.

Office machine, WSL, node 24.12.0, bun 1.4.0, mean of 5 rounds.

node:

| phase | ms/500 | req/s | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|---:|
| daemon-status (connect per call) | 65 | 8842 | 3.29 | 13.61 | 14.13 | 14.35 |
| status (fleet rows) | 430 | 1197 | 26.74 | 33.42 | 37.26 | 39.16 |
| peer-view | 91 | 5902 | 4.92 | 9.67 | 11.3 | 11.46 |
| report-status (transition + fan-out) | 488 | 1041 | 27.0 | 50.79 | 55.13 | 59.31 |
| pipelined daemon-status (one socket) | 4 | 118314 | 0.24 | 0.5 | 0.57 | 0.61 |
| fan-out | 4840/5000 events | | 26.8 | | 55.6 | 59.4 |

bun:

| phase | ms/500 | req/s | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|---:|
| daemon-status (connect per call) | 60 | 10001 | 3.11 | 9.02 | 9.43 | 9.7 |
| status (fleet rows) | 466 | 1113 | 28.84 | 38.43 | 44.11 | 46.88 |
| peer-view | 133 | 4268 | 7.33 | 14.83 | 16.99 | 18.02 |
| report-status (transition + fan-out) | 605 | 841 | 35.12 | 58.78 | 63.17 | 64.96 |
| pipelined daemon-status (one socket) | 5 | 106672 | 0.28 | 0.47 | 0.54 | 0.57 |
| fan-out | 4840/5000 events | | 35.2 | | 63 | 65 |

Against the laptop runtime rows, p99: `status` 44.2 → 37.3 node, 48.7 → 44.1 bun, both
under the 60 ms target. `report-status` 54.3 → 55.1 node, 47.0 → 63.2 bun. The machine
changed under the comparison, so the `status` gain and the bun `report-status` loss are
each inside the cross-machine spread until a second run on this machine. `report-status`
is over the 50 ms target on both runtimes. This run is the baseline the next wave
compares to.

### 2026-09-18, waves B–D: the event lost its capacity, orchd holds capacity and census

`event.capacity` is gone; no reader existed, and every `report-status` computed it. orchd
holds `FleetCapacity` in a map (`daemon/server/capacity.ts`) and forgets it only on
`refreshAgent`, on a liveness flip, or on a settings reload. A `capacity` RPC serves the
held value scoped per caller, and `orch status` reads its footer line from it instead of a
second `fleet` pull. The pane census (`entities/census.ts`) is listed once per enabled
plexer and held until `refreshAgent`; a plexer that does not answer throws and names
`orch doctor`. `isAvailable()` left `validateBackend`, session registration and the census.

Same machine, same runtimes, mean of 5 rounds.

node:

| phase | ms/500 | req/s | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|---:|
| daemon-status (connect per call) | 68 | 8155 | 3.45 | 12.84 | 14.3 | 15.05 |
| status (fleet rows) | 447 | 1142 | 27.28 | 38.47 | 42.48 | 44.7 |
| peer-view | 99 | 5209 | 5.52 | 12.21 | 14.3 | 14.59 |
| report-status (transition + fan-out) | 513 | 1007 | 29.32 | 53.38 | 57.91 | 59.16 |
| pipelined daemon-status (one socket) | 6 | 95560 | 0.3 | 0.98 | 1.13 | 1.14 |
| fan-out | 4840/5000 events | | 29.2 | | 58.2 | 58.8 |

bun:

| phase | ms/500 | req/s | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|---:|
| daemon-status (connect per call) | 52 | 12191 | 2.39 | 11.91 | 12.49 | 12.62 |
| status (fleet rows) | 373 | 1349 | 22.87 | 31.65 | 37.35 | 39.4 |
| peer-view | 92 | 5520 | 4.81 | 10.83 | 13.06 | 14.32 |
| report-status (transition + fan-out) | 557 | 921 | 32.82 | 57.22 | 63.84 | 65.28 |
| pipelined daemon-status (one socket) | 4 | 116932 | 0.23 | 0.62 | 0.71 | 0.74 |
| fan-out | 4840/5000 events | | 32.8 | | 63.8 | 65.2 |

Against wave A, p99: `report-status` 55.1 → 57.9 node, 63.2 → 63.8 bun; `status`
37.3 → 42.5 node, 44.1 → 37.4 bun. Every delta is inside the run-to-run spread of this
machine (`daemon-status`, untouched, moved 14.1 → 14.3 node and 9.4 → 12.5 bun). The bench
enables no plexer and every bench agent stays in one space, so neither the census hold nor
the capacity hold is on its measured path. What the bench does show: the capacity
computation that `report-status` paid per transition was not the tail. The tail is the
fan-out itself: `report-status` p50 tracks fan-out p50 within a millisecond, and the
per-transition cost is the ten socket writes plus the commit. `report-status` stays over
the 50 ms target on both runtimes.

A second run of the same build, minutes later, p99:

| phase | node run 1 | node run 2 | bun run 1 | bun run 2 |
|---|---:|---:|---:|---:|
| daemon-status (connect per call) | 14.3 | 12.77 | 12.49 | 4.77 |
| status (fleet rows) | 42.48 | 34.59 | 37.35 | 39.82 |
| peer-view | 14.3 | 14.82 | 13.06 | 11.18 |
| report-status (transition + fan-out) | 57.91 | 58.34 | 63.84 | 51.93 |
| fan-out | 58.2 | 58.6 | 63.8 | 52.4 |

One build moves 8 ms on `node status` and 12 ms on `bun report-status` between two runs.
That is the band on this machine; the wave A row sits inside it on every phase. A change
under 10 ms on p99 needs more than one run per side to be read at all.

### 2026-09-18, wave E: the drain measured (`--trace`)

The bench gained `--trace`: the daemon logs at trace, and the report ends with a summary
of every `store.drained` record (`elapsedMs` now from `performance.now()`). A trace run
appends one log line per rpc call synchronously, so its phase rows are not comparable to
the runs above (bun's `pipelined daemon-status` went 0.7 → 3.8 ms on the append alone).
The drain line is the finding.

Same build as waves B–D plus `rows.ts` (the session file is read only when presence has no
status; the bench's agents have no session file, so that is off this path).

| runtime | drains | rows | rows/drain | p50 | p99 | max |
|---|---:|---:|---:|---:|---:|---:|
| node | 3701 | 6200 | 1.7 | 0.18 | 0.58 | 34.82 |
| bun | 3701 | 6200 | 1.7 | 0.24 | 2.38 | 38.15 |

What it says:
- A commit is 0.18 ms on node. One report costs about 0.85 ms of loop time (p50 27 ms at
  concurrency 32), so the commit is a fifth of a report. A worker thread for sqlite
  removes at most that fifth: p99 58 → about 47 on node, at the cost of a second
  connection and a channel. It is not the tail.
- The drain does not batch. 1.7 rows per drain means `setImmediate` fires once per
  request, not once per 32: each request is its own I/O turn. A coalescing window would
  trade latency for batching and buys nothing at this commit cost.
- One drain per run takes 35 ms: a WAL checkpoint (`wal_autocheckpoint`, every 1000
  pages). The 32 requests behind it are 1.3% of a 2500-call phase, which is inside p99.
  Moving the checkpoint off the request path (`wal_autocheckpoint = 0` and a checkpoint
  on the liveness tick or the idle timer) is the one drain change that touches p99.
- bun's drain p99 is 4× node's at the same median; bun's sqlite binding has a longer
  tail.

### 2026-09-18, wave F: names once, rows carry ids; replies are not re-parsed

The `status` reply and `--json` are `{ names: { agents, spaces }, rows }`. A row carries
ids only (`spawnedBy`, `rootAgentId`, `spaceId`, `lease.holderId`); every name an id stands
for is in `names`, once per fleet, never once per row. `owner`, `spawnedByLabel`,
`modelShort`, `spaceName`, `rootAgentName` and `lease.holderName` left the row; the table,
the live view and the web resolve them from `names` at draw time. The client no longer
runs `safeParse` on a daemon reply: the zod schema is the type (`ResultOf<M>`), and the one
runtime check left is `isFleetStatus` at the remote-host boundary.

Same machine, same runtimes, mean of 5 rounds.

node:

| phase | ms/500 | req/s | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|---:|
| daemon-status (connect per call) | 66 | 8600 | 3.38 | 14.23 | 14.68 | 15.12 |
| status (fleet rows) | 356 | 1425 | 21.74 | 27.83 | 30.01 | 31.11 |
| peer-view | 92 | 5580 | 4.79 | 12.28 | 13.32 | 13.8 |
| report-status (transition + fan-out) | 520 | 979 | 29.38 | 53.48 | 56.41 | 57.2 |
| pipelined daemon-status (one socket) | 6 | 92124 | 0.27 | 1.21 | 1.27 | 1.32 |
| fan-out | 4840/5000 events | | 29 | | 56.4 | 57 |

bun:

| phase | ms/500 | req/s | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|---:|
| daemon-status (connect per call) | 47 | 12686 | 2.35 | 9.28 | 9.58 | 9.71 |
| status (fleet rows) | 294 | 1710 | 17.71 | 24.51 | 25.64 | 26.88 |
| peer-view | 81 | 6362 | 3.94 | 10.33 | 11.9 | 12.83 |
| report-status (transition + fan-out) | 503 | 1005 | 28.59 | 55.22 | 58.84 | 59.65 |
| pipelined daemon-status (one socket) | 5 | 104751 | 0.26 | 0.61 | 0.68 | 0.7 |
| fan-out | 4840/5000 events | | 28.4 | | 58.8 | 60 |

Against waves B–D: `status` p99 42.5 → 30.0 node and 37.4 → 25.6 bun, p50 27.3 → 21.7
node and 22.9 → 17.7 bun. Both runtimes moved the same way by more than the band, and the
two phases the change did not touch stayed inside it (`report-status` p99 57.9 → 56.4 node,
63.8 → 58.8 bun; `daemon-status` 14.3 → 14.7 node, 12.5 → 9.6 bun). The cut is the bytes:
64 rows no longer repeat six labels each, and the CLI no longer walks the reply a second
time to check it.

## Next

1. Memory is the truth (`docs/orchd-owns-the-store.md`, steps 1–6): a write patches the
   map and queues the row; a `setImmediate` drain commits the turn's rows in one
   transaction after the replies went out; the tick owns liveness. The `data_version`
   check and the presence hold go.
2. `report-status`: the commit is 0.18 ms of a 0.85 ms report; the worker thread is not
   worth its channel. The WAL checkpoint (35 ms, once per run, inside p99) moves off the
   request path: `wal_autocheckpoint = 0`, checkpoint on the idle timer. After that the
   floor is the ten socket writes per event on one thread.
3. `status`: the labels are out of the rows (wave F). Left: pre-encode a row once per change and hand the encoded bytes to every reader, or stream rows.
