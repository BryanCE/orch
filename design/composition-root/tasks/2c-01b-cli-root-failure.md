# 2c-01b-cli-root-failure

Owns: `src/commands/index.ts`. Chain: after `2c-01a`, context kept.

Goal: failure reporting and the setup gate use the services logger and the root's `orchDir`, not `commandLogger()` or `orchDir()`.

Do:
1. `reportCommandFailure(error)` becomes `reportCommandFailure(logger: Logger, error: unknown)` and logs through `logger`. Keep it exported.
2. `dispatchAsync(task)` becomes `dispatchAsync(logger: Logger, task: Promise<unknown>)`; every call in `commandHandlers` becomes `dispatchAsync(services.logger, cmdX(services, args))`.
3. The `commandLogger().error("command.unknown", ...)` line becomes `services.logger.error(...)`.
4. The setup gate runs before `services` exists. `setupRequiredMessage()` from `./setup.ts` now takes `orchDir` (2b-setup changed it) and `compositionUnrecorded()` from `../setup/composition.ts` may now take `orchDir` (3a-setup-notify changes it; if it has not landed, leave that call alone and say so). At the top of `runCommand`, read the directory once with `orchDir()` from `../presence/writer.ts` into `const directory` and pass it to those two calls. This is the one `orchDir()` call that survives in commands until task 6-02 replaces it with `envOrchDir()` from `../services.ts`; put a one-line comment saying so.
5. Remove the `commandLogger` import.

Check: lint, tc. Tests: `test/commands-status.test.ts`, `test/caller-kind.test.ts`, and `grep -l "commands/index" test/*.ts`. Failures from tests calling `cmd*` or `reportCommandFailure` with the old arity go under `CALLERS:` as `test/<file>:<line>`; do not edit tests.
