# 4-03c-daemon-state-logger

Owns: `src/daemon/orchd.ts`. Chain: after `4-03b`, context kept.

Goal: the last two module-level `let`s, and an explicit return.

Do:
1. Move `daemonLogger` (as `state.logger`) and `fatalLogged` (as `state.fatalLogged`) into `state`; `logFatalAndExit` and `shutDown` take `state`. Delete the two module-level declarations.
2. `startDaemon` returns `state` with an explicit return type `Promise<DaemonState>`; export the `DaemonState` type. Keep the function's exported name.
3. Grep the file for `^let ` and `^const .* = new ` at column 0 and paste the result in the report; it must be empty apart from true constants (`startedAt`, `bootCodeHash` and the like, which are `const` values computed once and never reassigned; list them).

Check: lint, tc, `bun --filter @bryance/orch check:bridge`. Tests: none (Bryan-only).
