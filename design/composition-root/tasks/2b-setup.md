# 2b-setup

Owns: `src/commands/setup.ts`. Follow `2b-README.md`.

Sites:
- `:57` `loadSettings(orchDir()).skills`
- `:61` `writeSettingsSkills(orchDir(), ...)`
- `:103` `reapUnreadableSettings(orchDir())`
- `:135`, `:137` `runDoctor(orchDir())`
- `:203` `commandLogger().warn(...)`
- `:207` `writeSettingsNotify(orchDir(), ...)`
- `:218` `settingsPath(orchDir())` inside `setupRequiredMessage()` — this function is called from `src/commands/index.ts` before services exist. Give it an `orchDir: string` parameter and report it under `CALLERS:` as `setupRequiredMessage now takes orchDir`. The 2c task passes it.

`runFirstTimeSetup(argv, runCommand)` is called from `index.ts` before services exist. Keep its signature. Inside it, build services once with `createServices()` from `../services.ts` at the top and thread them to what it calls; this is the one place in `src/commands/` besides `index.ts` allowed to call `createServices`, because the wizard runs before the CLI root has settings to build from. Say so in a one-line comment.

Tests: `grep -l "commands/setup" test/*.ts`.
