# 2b-spawn-index

Owns: `src/commands/spawn/index.ts`. Follow `2b-README.md`.

Sites:
- `:46` `loadSettings(orchDir())`
- `:47` `maySpawnFrom(orchDir(), selfId(), settingsFile.fleet.max_depth)`
- `:89` `commandLogger().error("spawn.failed", ...)`
- `:142` `ORCH_DIR: orchDir()` in the child env → `ORCH_DIR: services.orchDir`
- `:229`, `:230` `directory: orchDir()`, `agentById(orchDir(), ...)`
- `:259` `openFleetHome({ directory: orchDir(), ...})`
- `:266`, `:267`, `:338` `rpcRegisterSession(orchDir())`, `environmentOf(orchDir(), ...)`
- `:306` `loadSettings(orchDir())`

`cmdSpawn` and `cmdRun` take `services` first. The sibling modules `flags.ts`, `admission.ts`, `models.ts`, `placement.ts`, `report.ts` were changed before this task, either by you earlier in this session or by results piped to you. Pass what each now requires; where in doubt, the signature in the sibling file is the truth.

Tests: `test/spawn-identity.test.ts` and `grep -l "spawn/index" test/*.ts`.
