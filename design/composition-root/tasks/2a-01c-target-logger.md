# 2a-01c-target-logger

Owns: `src/commands/target.ts`. Chain: after `2a-01b`, context kept.

Goal: no `commandLogger()` call in this file.

Do: grep the file for `commandLogger(`. Each enclosing function takes `logger: Logger` (from `../types/core.ts`) or, if it already takes a `services: Pick<Services, ...>` from `2a-01b`, widens that pick with `LoggerService` and uses `services.logger`. `logger.forAgent(x)` replaces `commandLogger().forAgent(x)`. Remove the `commandLogger` import.

Also remove the now-unused `orchDir` import if `2a-01a` left it.

Check: lint, tc on this file. Tests: none named.
Report the final list of every exported signature that changed across `2a-01a`, `2a-01b`, and this task under `CALLERS:`. That list is what every 2b worker gets piped.
