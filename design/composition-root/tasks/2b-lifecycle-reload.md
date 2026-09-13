# 2b-lifecycle-reload

Owns: `src/commands/lifecycle/reload.ts`. Follow `2b-README.md`.

Sites:
- `:41`, `:79`, `:120` `agentProcessLive(orchDir(), presenceKey)`
- `:92` `path.join(orchDir(), "reload.signal")` → `path.join(services.orchDir, RELOAD_SIGNAL_FILE)` importing the constant from `../../settings/watch.ts` (it exists at `watch.ts:8`); the literal is a Rule 17 violation on its own
- `:114`, `:235` `reclaimAgent(orchDir(), ...)`
- `:204` `refreshStaleShims(orchDir(), ...)`
- `:258` `loadSettings(orchDir())`
- every `commandLogger()`

`cmdReload` and `cmdRestart` take `services` first.

Tests: `grep -l "lifecycle/reload" test/*.ts`.
