# 6-01-delete-load-settings

Owns: `src/settings/read.ts`

Requires waves 2 through 5 landed.

Goal: `loadSettings`, `loadSettingsOrNull`, and `settingsLogLevel` no longer exist. Every reader goes through a `SettingsManager` handed down from a root.

Do: delete the three functions from `src/settings/read.ts`. Run tc over the package. Every remaining caller is a leftover the fleet missed; list each under `CALLERS:` as `<path>:<line>`. Do not fix them. If there are none, say `CALLERS: none`.

`declaredRuntime(orchDir)` (`:251`) and `allowedModelPatterns(orchDir, harness)` (`:306`) read the file themselves. Rewrite each to take `settings: OrchSettings` instead and report their callers the same way.

Check: lint, tc on this file. Tests: `grep -l "settings/read" test/*.ts`; failures that come from deleted exports go under CALLERS as test paths.
