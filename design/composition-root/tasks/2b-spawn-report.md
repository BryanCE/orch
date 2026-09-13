# 2b-spawn-report

Owns: `src/commands/spawn/report.ts`. Follow `2b-README.md`.

Sites:
- `:24` `commandLogger().forAgent(key) : commandLogger()` → helper takes `logger: Logger`
- `:45` `rpcCall(orchDir(), "status")`
- `:75`, `:87`, `:119` `commandLogger().error/warn(...)`
- `:126` `loadSettings(orchDir())`
- `:127` `maySpawnFrom(orchDir(), selfId(), ...)`

Report every changed exported signature under `CALLERS:`.

Tests: `grep -l "spawn/report" test/*.ts`.
