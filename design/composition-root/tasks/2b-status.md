# 2b-status

Owns: `src/commands/status.ts`. Follow `2b-README.md`.

Sites:
- `:61` `export function entityAdapter(ent, views = agentViewIndex())` — `agentViewIndex` now requires `root`. Make `views` a required parameter and report `entityAdapter now takes views (required)` under `CALLERS:`.
- `:246` `rpcCall(orchDir(), "status")`
- `:272` `export function callerScope()` — if it reaches for `orchDir()` inside, it takes `orchDir: string`; report it.
- `:619` `getBackend(entity.backend)` stays
- `:636` `directory: string = orchDir(),` → required
- `:703` `options.directory?.() ?? orchDir()` → `options.directory` becomes a required `string` (not a thunk) or the function takes `orchDir: string`; remove the `??`
- `:770`, `:805`, `:816` `loadSettingsOrNull(orchDir())` → `services.settings.currentOrNull()`
- `:798` `ensureDaemonOrWarn(orchDir())`

Exported `cmd*` here: whatever `status-verb.ts` and `status-live.ts` call into (`cmdStatus` or similar). Each takes `services` first. Report every changed exported helper.

Tests: `test/commands-status.test.ts`.
