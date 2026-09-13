# 4-02-daemon-root

Model: luna:xhigh
Owns: `src/daemon/orchd.ts`

Requires 4-01 landed and every 3a/3b task landed (the daemon's callees now take `orchDir`, `settings`, or `SettingsManager`).

Goal: the daemon root. `startDaemon` builds one `Services` and every settings read in the file goes through `services.settings`. The three caches (`currentSettings`, `getSettings`, `sinks`) go away.

Do:

1. At the top of `startDaemon` (line 639, `const directory = orchDir();`): replace with `const services = createServices();` and `const directory = services.orchDir;`. Import `createServices` from `../services.ts`. Keep `directory` as a local because dozens of lines pass it; do not rename them.
2. Delete `let currentSettings` (`:104`), `let sinks` (`:105`), `function getSettings` (`:129-131`), and the `sinks ??=` helper at `:134`. Every `getSettings(directory)` → `services.settings.current()`. Every `loadSettings(directory)` (`:345`, `:512`, `:537`, `:657`) → `services.settings.current()`. `:266` `loadSettingsOrNull(directory)?.fleet.cross_space ?? SETTINGS_DEFAULTS.fleet.cross_space` → `services.settings.currentOrNull()?.fleet.cross_space ?? SETTINGS_DEFAULTS.fleet.cross_space`. The former `sinks` read → `services.settings.current().notify`.
   `services` must be reachable from the module-level functions that used `getSettings(directory)`. Since 4-03 turns those into closures over a state object, for this task pass `services.settings` (type `SettingsManager`) as an explicit parameter to each such function, the same way `directory` is already passed. No module-level `let services`.
3. `:197`, `:217` `decisionLogger(orchDir())` → `decisionLogger(directory)` (thread `directory` in if the function lacks it).
4. The settings watcher at `:767`: pass `load: () => { const next = services.settings.reload(); if (next === null) throw new Error(absentSettingsMessage(services.settings.file)); return next; }` importing `absentSettingsMessage` from `../settings/read.ts`. In `onChange`, delete `const previousSettings = currentSettings; currentSettings = settings; sinks = undefined;` and instead keep `previousSettings` as a local `let` captured by the closure, initialised from `services.settings.currentOrNull()` before the watcher starts. The `repinLiveFleet` call keeps receiving `previousSettings` and `settings`.
5. `:817` `getSettings: () => getSettings(directory)` → `settings: services.settings`.
6. `:830`, `:834` `getSettings(directory).daemon.*` → `services.settings.current().daemon.*`.
7. `daemonLogger = loggerFor(directory, settings.logging?.level)` at `:658`: keep `loggerFor` as is for now, but pass `services.settings.current().logging?.level`. (Merging the daemon logger with `services.logger` is a follow-up; report it as `FOLLOW-UP: daemon logger vs services.logger` in the report.)
8. Every callee whose signature changed in 3a (`daemonOutage`, `daemonLockPid`, mail's cross-space function, `events.ts` fan-out, `control/dispatch`, `presence/store`) now gets `directory`, `services.settings`, or `services.settings.current()` per its new signature; the 3a results are piped into this session, and the callee files themselves are the truth.
9. Remove the `orchDir`, `loadSettings`, `loadSettingsOrNull` imports.

Check: lint, tc. Tests: none named. `test/daemon-rpc.test.ts` is Bryan-only; do not run it. State in the report that daemon tests were not run.
