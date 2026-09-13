# 2c-01-cli-root

Model: luna:xhigh
Owns: `src/commands/index.ts`

Requires every `2a-*` and `2b-*` task reported DONE. Every `cmd*` function now takes `services: Services` first.

Goal: the CLI root. `runCommand` builds one `Services` and every handler receives it. After this task the whole-tree gate must be green.

Do:

1. Import `createServices` from `../services.ts` and `Services` from `../types/services.ts`.
2. `type Handler` becomes `(services: Services, args: string[]) => void`.
3. `dispatchAsync(task)` becomes `dispatchAsync(logger: Logger, task: Promise<unknown>)` and `reportCommandFailure(error)` becomes `reportCommandFailure(logger: Logger, error: unknown)`, logging through the passed logger instead of `commandLogger()`. Keep `reportCommandFailure` exported; if tests import it with the old arity, tc will say so and you fix the test call sites listed in `CALLERS:` only if they are under `test/` and import `commands/index.ts` (report them, do not edit).
4. Every entry in `commandHandlers` becomes `(services, args) => dispatchAsync(services.logger, cmdX(services, args))` or `(services, args) => cmdX(services, args)` for the synchronous ones, preserving which are sync and which are async exactly as today.
5. In `runCommand`, after the setup gate (`needsFirstRunSetup` / `compositionUnrecorded` / `preflightSkew` block) and before the `cmd === undefined` check, add `const services = createServices();`. The setup gate must keep running before services exist because `createServices` builds a logger from settings that may not exist yet; that is fine, `createServices` tolerates absent settings, but the gate's own messages must still fire first. Pass `services` into every handler call and into the two `dispatchAsync(cmdStatusVerb(...))` fallbacks.
6. The `commandLogger().error("command.unknown", ...)` line becomes `services.logger.error(...)`.
7. `runFirstTimeSetup(argv, runCommand)` is unchanged.
8. Remove the `commandLogger` import if unused. Do not delete `src/commands/logging.ts`; task 6-03 does.

Check: lint, tc. Tests: `test/commands-status.test.ts`, `test/caller-kind.test.ts`, and every test file that imports `commands/index.ts` (`grep -l "commands/index" test/*.ts`). Paste results. Failures caused by tests calling `cmd*` with the old arity go under `CALLERS:` as `test/<file>:<line>`; do not edit tests.
