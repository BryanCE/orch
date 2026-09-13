# 3a-doctor-roles

Owns: `src/doctor/runner.ts`, `src/doctor/models.ts`, `src/doctor/skills.ts`, `src/doctor/notify.ts`, `src/doctor/settings-file.ts`, `src/doctor/provenance-depth.ts`, `src/doctor/remote.ts`, `src/doctor/unclaimed-agents.ts`, `src/presence/roles.ts`. Follow `3a-README.md`.

Goal: `runDoctor(orchDir)` loads settings once and hands `settings: OrchSettings | null` to every check. No check loads its own.

Sites:
- `runner.ts:86` `const config = loadSettingsOrNull(orchDir);` → this is the one load; replace with `fileSettingsManager(orchDir).currentOrNull()` from `../settings/manager.ts` and keep the result in a local `settings` passed to every check below.
- `runner.ts:165` `loadSettingsOrNull(orchDir)?.enabled.adapters ?? []` → `settings?.enabled.adapters ?? []`
- `models.ts:21` `loadSettingsOrNull(orchDir)?.defaults.models[harness]` → the check takes `settings: OrchSettings | null`
- `skills.ts:27`, `notify.ts:35`, `notify.ts:74`, `settings-file.ts:14`, `settings-file.ts:30`, `provenance-depth.ts:8`, `remote.ts:12`, `unclaimed-agents.ts:7` → same: each check takes `settings: OrchSettings | null` and keeps its own `?? []` / `?? {}` absent-file fallbacks.
- `roles.ts:12` `createCaptureRole(root: RootSource = (() => orchDir()))` → `root: RootSource` required, no default.

`doctor/shared.ts:25` reads `WSL_DISTRO_NAME`; that is an env fact, leave it.

Callers outside these files (whoever calls `createCaptureRole()` with no argument, and any command calling a check directly) go under `CALLERS:`.
