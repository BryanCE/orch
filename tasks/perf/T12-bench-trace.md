# T12. `bench-daemon.ts --trace`: the daemon logs at trace, the bench prints a drain summary

Repo: /mnt/c/dev/personal/orch, package `packages/orch/`. Rules: no `as` casts, no `any`, comments two lines max. NEVER run the bench script (Rule 1). Edit only; the gate is `bun check`.

orchd logs one `store.drained` record per write-queue drain (`src/daemon/server/orchd.ts:96`) at trace level, with fields `rows`, `batched`, `elapsedMs`. The bench writes the daemon's `settings.json` itself (`seedFleet`, L124) and prints the log path (L525). The daemon's log level comes from `logging.level` in that file. Today the bench never sees the drains.

Edit `scripts/bench-daemon.ts` only.

1. `BenchOptions` (L40-51): add `/** The daemon logs at trace; the report ends with the write-queue drain summary. */ trace: boolean;`. `DEFAULTS` (L80): `trace: false`. `parseArgs` (L96-118): `else if (flag === "--trace") options.trace = true;` beside `--profile`. The usage comment at L6-7 gains `[--trace]`.
2. `seedFleet(agents: number)` (L121) becomes `seedFleet(agents: number, trace: boolean)`. L124 writes `settingsFixtureText({ daemon: { tcp_port: TCP_PORT, idle_shutdown_minutes: 1 }, ...(trace ? { logging: { level: "trace" } } : {}) })`. The call in `main` passes `options.trace`.
3. Add, beside `fanoutSummary`:
   ```ts
   interface DrainSummary { drains: number; rows: number; p50Ms: number; p99Ms: number; maxMs: number }

   /** Every `store.drained` record the daemon logged, folded into one line's worth of numbers. */
   function drainSummary(orchDir: OrchDir): DrainSummary {
     const elapsed: number[] = [];
     let rows = 0;
     for (const line of readFileSync(logFile(orchDir), "utf8").split("\n")) {
       if (line.length === 0) continue;
       const record: unknown = JSON.parse(line);
       if (!isLogRecord(record) || record.event !== "store.drained") continue;
       const drainRows = record.fields?.rows;
       const drainMs = record.fields?.elapsedMs;
       if (typeof drainRows !== "number" || typeof drainMs !== "number") continue;
       rows += drainRows;
       elapsed.push(drainMs);
     }
     const sorted = [...elapsed].sort((a, b) => a - b);
     return { drains: sorted.length, rows, p50Ms: round(percentile(sorted, 0.5)), p99Ms: round(percentile(sorted, 0.99)), maxMs: round(sorted[sorted.length - 1] ?? 0) };
   }

   function drainLine(summary: DrainSummary): string {
     return `drain     ${summary.drains} drains   ${summary.rows} rows   p50 ${summary.p50Ms} ms   p99 ${summary.p99Ms} ms   max ${summary.maxMs} ms`;
   }
   ```
   Import `isLogRecord` from `../src/log.ts` (beside `logFile`) and `readFileSync` from `node:fs`. Read `percentile` (L197) and `round` (L203) first; if `percentile` takes the array unsorted or returns rounded already, match it and drop the duplicate work.
4. In `main`, after `printReport(...)` and before the profile/remove branch: `if (options.trace) process.stdout.write(`${drainLine(drainSummary(fleet.orchDir))}\n`);`. The log is read after `terminateDaemon` returned, so every record is on disk. With `--json`, put the summary in the JSON instead: `printReport` takes one more argument `drain: DrainSummary | undefined` and includes `drain` in the object it stringifies; the stdout line prints only when not `--json`.

Run, once, after the edits (Windows side owns the disk):
```
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT'; bun check"
```
No test imports the bench. Do not run it.

Report: one line. `done: bench-daemon.ts, check clean`, `pending: <files>`, or `blocked: <exact error>`.
