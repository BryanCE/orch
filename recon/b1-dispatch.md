# B1 dispatch specs — `TASKS/15-burndown.md` row B1 (`13-logging.md` slice 4)

Defining test: `test/no-stderr-writes.test.ts` — zero `process.stderr.write(` under `src/` and
`extensions/`. Run it with `bun test test/no-stderr-writes.test.ts`. RED lists every remaining
site; GREEN when the list is empty. Each worker also runs ONLY the test files it touches.

## The rule for every site (decided once, applied mechanically)

`TASKS/13-logging.md` §1: output and logging never share a call. stderr is neither channel.

1. **CLI process** (`src/commands/*`, `src/adapters/*`, `src/doctor/*`, `src/daemon/reach.ts`):
   the line is an answer to the command the human ran → `process.stdout.write(<same text>)`.
   If no log call already precedes the site, add ONE: `commandLogger().warn|error("<dotted.event>", { ...fields })`
   (`import { commandLogger } from "../commands/logging.ts"` — adjust the relative path).
   `warn` = degraded but proceeding; `error` = the operation failed and the caller is told.
   Many sites ALREADY have the log call on the line above — then only swap stderr→stdout.
2. **Daemon process** (`src/daemon/orchd.ts`, `src/daemon/work-loop.ts`, `src/daemon/retention.ts`,
   `src/backends/headless/index.ts` logPruning, `src/notify/router.ts`): no human reads the daemon's
   stdout → DELETE the write and log instead. orchd.ts has `log`/`daemonLogger` in scope;
   work-loop.ts has `decisionLogger(options.orchDir)`; retention.ts / headless logPruning /
   router: `decisionLogger(orchDir)` from `src/daemon/decision-log.ts` (retention already receives
   `orchDir`; headless `logPruning.prune` — check its signature for the directory; router's
   default `warn` option becomes a `decisionLogger(orchDir()).warn("notify.failed", { message })`
   with `orchDir` from `../presence/store.ts`).
3. **`src/presence/writer.ts:118` (`launchKey`)**: a harness-side fatal. Replace the write with
   `createLogger({ file: join(orchDir(), "orch.log"), level: "error" }).error("launch.invalid-key", { error: errorMessage(error) })`
   (`createLogger` from `../log.ts`), keep the `process.exit(1)`.

Event names: stable dotted, lowercase, `<area>.<what>` (`spawn.stalled`, `close.failed`,
`retention.sweep-failed`, `rename.pane-label-failed`). Fields: primitives only (string/number/
boolean/null) — no objects. NEVER `as`, NEVER `any` (Rule 13). Do not touch stdout sites that
already exist. Do not reformat surrounding code.

Tests: after converting, `grep -ln stderr test/*.test.ts` for the files that cover YOUR sites,
and update assertions from stderr to stdout (or to the log record). Run only those files.

## Slices (file-disjoint; one pane each)

| pane | files (site count) |
|---|---|
| `b1-spawn` | `src/commands/spawn.ts` (12) |
| `b1-cli` | `src/commands/lifecycle.ts` (7), `src/commands/clean.ts` (2), `src/commands/results.ts` (2), `src/commands/control.ts` (1), `src/commands/events.ts` (1), `src/commands/models.ts` (1), `src/commands/index.ts` (2) |
| `b1-setup` | `src/commands/setup.ts` (6), `src/adapters/claude.ts` (4), `src/adapters/codex.ts` (4), `src/adapters/model-catalogue.ts` (1), `src/doctor/runner.ts` (1), `src/daemon/reach.ts` (3) |
| `b1-daemon` | `src/daemon/orchd.ts` (5), `src/daemon/work-loop.ts` (2), `src/daemon/retention.ts` (3), `src/backends/headless/index.ts` (1), `src/notify/router.ts` (1), `src/presence/writer.ts` (1) |

## Proof each worker reports back

- `grep -c 'process.stderr.write' <each of my files>` → 0 for every file
- `bunx tsc --noEmit` → no output
- `bunx oxlint <my files> <my test files>` → 0 errors
- `bun test <my test files>` → all pass
- the list of test assertions changed (file:line → what it now asserts)
