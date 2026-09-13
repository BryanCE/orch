# 4-02a-daemon-services

Owns: `src/daemon/orchd.ts`. Chain: this, then `4-02b`, then `4-02c`, same agent, context kept.

Requires 4-01 and every 3a/3b task landed.

Goal: `startDaemon` builds `Services`, and every direct `loadSettings` / `loadSettingsOrNull` call in the file reads through a `SettingsManager` parameter instead. Nothing else in this slice.

Do:
1. `startDaemon` line 639 `const directory = orchDir();` → `const services = createServices(); const directory = services.orchDir;`. Import `createServices` from `../services.ts`. Keep `directory` as the local name; do not rename its uses.
2. `:657` `const settings = loadSettings(directory);` → `services.settings.current()`.
3. `:345`, `:512`, `:537` `loadSettings(directory).timeouts.dispatch_ack_ms` and `:266` `loadSettingsOrNull(directory)?.fleet.cross_space ?? SETTINGS_DEFAULTS.fleet.cross_space`: the enclosing module-level functions gain a `settings: SettingsManager` parameter (import from `../types/services.ts`) next to their existing `directory` parameter, and read `settings.current()` / `settings.currentOrNull()`. Their call sites inside `startDaemon`'s handler table pass `services.settings`.
4. Remove the `orchDir`, `loadSettings`, `loadSettingsOrNull` imports if unused. Leave `getSettings`, `currentSettings`, `sinks` alone; `4-02b` removes them.

Check: lint, tc on this file. Tests: none (daemon tests are Bryan-only; say so).
