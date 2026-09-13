# 4-02b-daemon-caches

Owns: `src/daemon/orchd.ts`. Chain: after `4-02a`, context kept.

Goal: the three settings caches go away. The manager is the one holder.

Do:
1. Delete `let currentSettings`, `let sinks`, `function getSettings(directory)`, and the `sinks ??= loadSettings(directory).notify` helper (originally `:104`, `:105`, `:129-131`, `:134`).
2. Every former `getSettings(directory)` → `settings.current()` where `settings: SettingsManager` is the parameter added in `4-02a` (add it to any function that lacks it). The former `sinks` read → `settings.current().notify`. Inside `startDaemon` itself use `services.settings`.
3. The watcher (originally `:767`): add `load: () => { const next = services.settings.reload(); if (next === null) throw new Error(absentSettingsMessage(services.settings.file)); return next; }`, importing `absentSettingsMessage` from `../settings/read.ts`. In `onChange`, delete the three lines `const previousSettings = currentSettings; currentSettings = settings; sinks = undefined;` and instead declare `let previousSettings = services.settings.currentOrNull();` just before `settingsWatch = watchSettings(...)`, and set `previousSettings = settings;` at the end of `onChange`. `repinLiveFleet` keeps receiving `previousSettings` and `settings`.
4. `:817` `getSettings: () => getSettings(directory)` → `settings: services.settings`.
5. `:830`, `:834` `getSettings(directory).daemon.*` → `services.settings.current().daemon.*`.

Check: lint, tc on this file. Tests: none (Bryan-only).
