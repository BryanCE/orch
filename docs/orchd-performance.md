# orchd performance log

Every run is the same command, so the rows compare across commits:

```
bun packages/orch/scripts/bench-daemon.ts --requests 500
```

64 agents, concurrency 32, 10 event subscribers, 500 requests per phase. Times are the
whole phase in milliseconds unless the column says otherwise.

Target: every phase finishes 500 requests in well under 200 ms.

The number to read is **p99**, the latency of one call at the 99th percentile. It is the
worst case nearly every caller meets; p50 hides the slow tail. Compare runs on p99 and on
the phase total. p50 is in the tables for the record only.

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

## Next

1. The daemon holds the fleet in memory: reads are a map lookup, writes update the map and
   sqlite, the tick owns liveness. The `data_version` check and the presence hold go.
2. `report-status`: one write, one event, no rebuild.
3. `status`: cut the payload, or stream rows.
