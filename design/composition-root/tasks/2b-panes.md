# 2b-panes

Owns: `src/commands/panes.ts`. Follow `2b-README.md`.

Sites:
- `:38` `loadSettings(orchDir()).spaces`
- `:112` `resolveBackend({ configured: loadSettings(orchDir()).defaults.backend ?? null })` — the `?? null` here converts an optional field to a nullable argument; that is not a settings default, keep it
- `:124` `commandLogger().error("tabs.ambiguous", ...)`
- `:300` `loadSettings(orchDir()).tiling.first_split`
- `:349` `setHandle(orchDir(), key, ...)`
- every other `commandLogger()`

`cmdPanes`, `cmdTabs`, `cmdTab`, `cmdFocus`, `cmdZoom`, `cmdMove`, `cmdTile` all live here or import from here; each exported `cmd*` takes `services` first.

Tests: `grep -l "commands/panes" test/*.ts`.
