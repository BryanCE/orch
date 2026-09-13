# 3a-doctor-roles

Owns: every file under `src/doctor/` that calls `loadSettings`, `loadSettingsOrNull`, or `orchDir()`, plus `src/presence/roles.ts`. Follow `3a-README.md`.

Find the doctor sites with `grep -n "orchDir()\|loadSettings(\|loadSettingsOrNull(" src/doctor/*.ts`. Known from the survey: `runner.ts` (2), `settings-file.ts` (2), `notify.ts` (2), `unclaimed-agents.ts`, `skills.ts`, `remote.ts`, `provenance-depth.ts`, `models.ts` (1 each), `shared.ts` (a `process.env` read). `runDoctor(orchDir)` already takes the directory; the checks below it re-load settings instead of receiving them. Load once in `runDoctor` via `fileSettingsManager(orchDir)` from `src/settings/manager.ts` and pass `settings: OrchSettings | null` (or `SettingsManager` if a check needs to reload) to every check that used to load its own.

`roles.ts:12` `createCaptureRole(root: RootSource = (() => orchDir()))` → `root: RootSource` required, no default.
