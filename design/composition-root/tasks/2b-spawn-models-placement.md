# 2b-spawn-models-placement

Owns: `src/commands/spawn/models.ts`, `src/commands/spawn/placement.ts`. Follow `2b-README.md`.

Sites:
- `models.ts:22` `settings = loadSettings(orchDir()),` is a default parameter value → the parameter becomes required, no default
- `models.ts:75` `commandLogger().warn(...)` → the function takes `logger: Logger`
- `models.ts:87` `assertModelAllowed(orchDir(), adapter, model)` → takes `orchDir: string`
- `placement.ts:106` `ORCH_DIR: orchDir()` → `spec` or the function carries `orchDir`
- `placement.ts:120` `orchDir: orchDir()`
- `placement.ts:135` `registerSpawnedAgent(orchDir(), ...)`
- `placement.ts:187`, `:218` `commandLogger().warn(...)`

Report every changed exported signature under `CALLERS:`.

Tests: `grep -l "spawn/models\|spawn/placement" test/*.ts`.
