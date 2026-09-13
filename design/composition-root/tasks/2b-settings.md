# 2b-settings

Owns: `src/commands/settings.ts`. Follow `2b-README.md`.

Sites: 21 `orchDir()` calls and one `loadSettings` at:
- `:31` `return loadSettings(orchDir());` → `services.settings.current()`
- `:93`, `:100`, `:101`, `:128-130`, `:164-166`, `:394`, `:410`, `:414` `writeRegisteredSetting(orchDir(), ...)` → `writeRegisteredSetting(services.orchDir, ...)`. Writers keep taking a directory.
- `:229`, `:269`, `:282`, `:355` `settingsPath(orchDir())` → `settingsPath(services.orchDir)`, or `services.settings.file`, which is the same string. Prefer `services.settings.file`.
- `:268`, `:281` `writeNotifyEntries(orchDir(), ...)`
- `:301` `runSettingsEditor(orchDir())`
- `:336` `rawSetting(orchDir(), ...)`

After a write, this command may re-read settings in the same process. Where it does, call `services.settings.reload()` after the write instead of calling `loadSettings` again.

Exported `cmd*`: `cmdSettings`, `cmdSettingsModels`, `cmdSettingsNotify`, `cmdSettingsSkills`, `cmdSettingsThinking`.

Tests: `grep -l "commands/settings" test/*.ts`.
