# T13. The drain record's `elapsedMs` is sub-millisecond

Repo: /mnt/c/dev/personal/orch, package `packages/orch/`. Rules: no `as` casts, no `any`, comments two lines max. Runtime code targets `node:` builtins only.

`drainWrites` (`src/store/connection.ts:275-286`) times a drain with `Date.now()`. A drain is under a millisecond or a few, so the record reads 0, 1 or 2 and says nothing. `loop-watchdog.ts:1` already imports `node:perf_hooks`.

Edit `src/store/connection.ts` only.

1. Add `import { performance } from "node:perf_hooks";` with the other `node:` imports.
2. In `drainWrites`: `const startedAt = Date.now();` → `const startedAt = performance.now();`. Both `drainReporter({ ... elapsedMs: Date.now() - startedAt })` calls → `elapsedMs: performance.now() - startedAt`. No rounding; the reader rounds.
3. The `DrainRecord.elapsedMs` doc comment, if one exists, says nothing about the clock; leave it. If `Date.now` is no longer used in the file after the edit, drop nothing else: `Date` is a global.

Run, once, after the edit (Windows side owns the disk):
```
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT'; bun check"
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT\packages\orch'; bun test test/store-write-queue.test.ts"
```

Report: one line. `done: connection.ts, check clean, tests <n> pass`, `pending: <files>`, or `blocked: <exact error>`.
