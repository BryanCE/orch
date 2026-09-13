# 2b-control

Owns: `src/commands/control.ts`. Follow `2b-README.md`.

Sites:
- `:142` `commandLogger().forAgent(refusal.key) : commandLogger()`
- `:199` `resolveTuningOrDie({ modelFlag: modelArg }, loadSettings(orchDir()), adapter.id)`
- `:231` `commandLogger().forCorrelation(delivered.id)`
- `:253` `registerSpawnedAgent(orchDir(), {...})`
- `:282` `getBackend(ent.backend)` stays
- `:292` `const settings = loadSettings(orchDir());`
- Every `die(` and helper import from `./target.ts`: pass the new first argument per "2a signatures".

Tests: `grep -l "commands/control" test/*.ts`.
