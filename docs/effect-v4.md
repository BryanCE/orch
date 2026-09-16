# Effect v4 in orch

Direction for the `effect-v4` branch. Bryan's rulings outrank this file. `CLAUDE.md` rules stay in force on the branch.

## Goal

Every long-lived orch process runs on the Effect v4 runtime: the seat inside pi, and orchd. Short-lived processes cross into Effect at one boundary or not at all.

Done when:
- `packages/orch` depends on `effect@4.x` only. No `effect@3`, no `@effect/platform-*`, no `@effect/vitest`, no `effect/unstable/*` import.
- Phases 1 to 3 below are merged with `bun check` clean and the touched tests green.
- `pi-bridge.js` is not larger than it is on `dev` (2.4 MB). Measure after phase 1.

## Decisions in force

- **Version.** `effect@4.0.0-rc.115`, pinned exact. Bryan bumps it. Nobody else.
- **Core modules only.** `effect`, `effect/testing`. No `effect/unstable/*` (breaks in minors). No `@effect/platform-*` (Rule 6: the `node:` builtins are the target; core Effect needs nothing else). Process exit, signals, and exit codes are orch's own code at each root.
- **Errors are `Schema.TaggedError`.** One class per failure a caller handles, with typed fields. `Data.TaggedError` is not used. A bug is a defect and reaches the root uncaught.
- **Services are `Context.Service`.** Class syntax: `class X extends Context.Service<X, Shape>()("orch/<dir>/X") {}`. The primary layer is `X.layer`. No `Live`/`Default` suffix.
- **Store stays synchronous.** `node:sqlite` `DatabaseSync` and every `src/store/*` function stay plain functions over an `OrchDir`. Effect code calls them inside `Effect.sync`. The store is not a service.
- **Settings stay `settings.json`.** Effect `Config` is not used (Rule 17 names the one source).
- **Agents are never fibers (Rule 11).** A fiber is an in-process tick, drain, watch, or subscription. `Effect.forkDetach` appears only where a fiber must outlive the scope that made it, and the line above it says why.
- **Hook bundles never import `effect`.** `extensions/claude/*` and `extensions/codex/*` run as a fresh process per hook event. They stay plain.
- **`packages/web` is out of scope.**
- **Tests run on `bun:test`.** One helper, `test/helpers/effect.ts`, exposes `runTest(effect, layer)` = `Effect.runPromise(Effect.provide(effect, layer))`. Time-based tests provide `TestClock` from `effect/testing`. No `it.effect`.
- **Half states do not merge (Rule 8).** Each phase converts one process seam end to end. Inside a seam there is no Promise wrapper around an Effect and no Effect wrapper around a Promise API that is still called as a Promise elsewhere.

## Phase 0. Branch and dependency

Bryan runs, on Windows:
```
git checkout -b effect-v4
cd packages\orch
bun add --exact effect@4.0.0-rc.115
```

## Phase 1. Seat on v4

Files: `src/seat/domain.ts`, `src/seat/source.ts`, `src/seat/manager.ts`, `src/seat/runtime.ts`, `src/types/seat.ts`. Renames, from the v4 migration map:

| Today | v4 | Where |
| --- | --- | --- |
| `Context.Tag("orch/seat/PackSource")<PackSource, PackSourceShape>()` | `Context.Service<PackSource, PackSourceShape>()("orch/seat/PackSource")` | `source.ts:23`, `manager.ts:89` |
| `Data.TaggedError("PackSendError")<{ message: string }>` | `Schema.TaggedError<PackSendError>()("PackSendError", { message: Schema.String })` | `domain.ts:35-41` |
| `Effect.runtime<never>()` + `Runtime.runFork(runtime)` | `Effect.context()` + `Effect.runForkWith(services)` | `manager.ts:95-96` |
| `Effect.forkDaemon` | `Effect.forkDetach` | `manager.ts:170` |
| `Stream.async` | `Stream.callback` | `source.ts:26` |
| `Effect.async` | `Effect.callback` | `source.ts:66` |
| `Layer.scoped(PackManager, makeManager)` | `Layer.effect(PackManager, makeManager)` | `manager.ts:238` |
| `PackManagerLive` | `PackManager.layer` | `manager.ts:237`, `runtime.ts:9,15` |

Unchanged: `ManagedRuntime.make`, `Layer.succeed`, `Layer.provide`, `Effect.gen`, `Effect.addFinalizer`, `Fiber.interrupt`, `Effect.tryPromise`, `Effect.ignore`, `Stream.runForEach`.

Done when: `bun check` clean, `test/settings-thinking.test.ts` and every test that imports `src/seat/*` green, Bryan runs `bun run build:orch:dev` and opens `/orch-view` in pi with one spawned agent.

## Phase 2. orchd on Effect

The daemon root becomes one scoped program. `startDaemon` in `src/daemon/server/orchd.ts` returns an `Effect` that acquires every resource in a `Scope` and forks every periodic job into that scope. `shutDown` is the scope closing. `SIGTERM`/`SIGINT` interrupt the root fiber. The exit code is set once, at `invokedAsMain()`.

| Today | v4 |
| --- | --- |
| `acquireDaemonRegistration` / `releaseDaemonRegistration`, `acquireDaemonLock` / `releaseDaemonLock` | `Effect.acquireRelease` |
| `startRpcServer` / `server.close()` | `Effect.acquireRelease` |
| `setInterval` outbox drain, idle check; `startLivenessTick`; `watchSettings` | `Effect.forkScoped(Effect.repeat(job, Schedule.spaced(ms)))` |
| `runWorkLoop` + `AbortController` + `state.workLoop` | `Effect.forkScoped`; interruption replaces the signal |
| `wake.next(ms, signal)` | `Effect.callback` with the wake as the resume; `Effect.timeout(ms)` |
| `waitForWorking` do/while | `Effect.repeat` until the predicate, under `Effect.timeout` |
| `mapWithLimit` | `Effect.forEach(items, f, { concurrency: n })` |
| `retryingAsync` | `Effect.retry(Schedule.exponential(delayMs, backoff).pipe(Schedule.compose(Schedule.recurs(attempts - 1))))` |
| `process.on("uncaughtException")`, `logFatalAndExit` | `Effect.catchCause` at the root, then exit |
| `DaemonState` mutable bag | Services: `DaemonServices` (`Services` + `WakeSignal` + `RpcServer`) as `Context.Service` classes with `.layer` |

Stays: `retryingSync` (its callers are synchronous), every `src/store/*` call (inside `Effect.sync`), `src/control/dispatch.ts` adapter execution (`runAdapterCommand` becomes `Effect.callback`, nothing else moves).

Done when: `bun check` clean, tests that import `src/daemon/server/*` green, Bryan runs `bun run build:orch:dev`, `orch daemon status`, one spawn, one dispatch, one `orch daemon stop`, and the log shows `daemon.stopped` with no leaked interval.

## Phase 3. Daemon client and the CLI boundary

`src/daemon/client/rpc.ts` becomes Effect: `connect` is `Effect.callback` under `Effect.timeout`; `subscribeEvents` returns a `Stream` built from `Stream.callback` with `Schedule.exponential(250ms)` capped at `5s` for reconnects; `rpcCall` returns `Effect<ResultOf<M>, DaemonAbsentError | DaemonUnreachableError | RpcError>`.

Every command in `src/commands/**` becomes an `Effect`. `die()` in `src/refusal.ts` becomes `Effect.fail(new CommandRefusal(...))`. `bin/orch.ts` holds the one `Effect.runPromiseExit` and maps: success to `0`, `CommandRefusal` to its message and `1`, `DaemonAbsentError`/`DaemonUnreachableError` to their message and `1`, a defect to the trace and `2`. The 34 `process.exit` calls collapse to that one site.

This phase starts after phase 2 is merged. It is the largest: 270 `async` functions and 327 `Promise` signatures live here.

Done when: `bun check` clean, `test/cli-*.test.ts` and every test that imports `src/commands/*` or `src/daemon/client/*` green, Bryan runs `bun run build:orch:dev` and `test/smoke.sh`.

## Not built

- The seat's `PackReadView` stays a synchronous read model with fire-and-forget commands. It is the pi UI boundary and does not become Effect.
- No Effect `Stream` over `status.jsonl`, `results.jsonl`, or `outcomes.jsonl` (Rule 18: nothing reads those files).
- No `@effect/sql-*`. Drizzle over `node:sqlite` stays.

## References

- Migration index: https://github.com/Effect-TS/effect-smol/blob/main/MIGRATION.md
- Rename map: https://github.com/Effect-TS/effect-smol/blob/main/migration/v3-to-v4.md
- Template for the service/manager/runtime split: `src/seat/` (after Davis, `davis7dotsh/my-pi-setup`, `extensions/subagents/src/`).
