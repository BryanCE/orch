# 3a-setup-notify

Owns: `src/setup/composition.ts`, `src/setup/smoke.ts`, `src/notify/router.ts`. Follow `3a-README.md`.

Sites:
- `composition.ts:89` `loadSettingsOrNull(orchDir())` → `settings: OrchSettings | null` parameter
- `composition.ts:197-210` eight `writeSettings*(orchDir(), ...)` calls and `settingsPath(orchDir())` at `:212` → the function takes `orchDir: string`
- `composition.ts:254` `compositionUnrecorded()` → `compositionUnrecorded(orchDir: string)`. Its caller is `src/commands/index.ts:279` inside `needsFirstRunSetup`, which runs before the CLI root builds services; the 3b task for `index.ts` will read `orchDir()` there once, at the top of `runCommand`, and pass it. List it.
- `smoke.ts:14`, `:16` `agentViews(orchDir())`
- `smoke.ts:103` `loadSettings(orchDir()).defaults.adapter`
- `router.ts:11` `decisionLogger(orchDir())` → `orchDir: string`
- `router.ts:31` `loadSettingsOrNull(orchDir)?.notify ?? []` → `settings: OrchSettings | null`, keep `?? []`
