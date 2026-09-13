# 4-01-work-loop-settings

Owns: `src/daemon/work-loop.ts`, `src/types/daemon.ts` (only `WorkOptions`), `src/commands/queue.ts` (only where `cmdWork` builds `WorkOptions`)

Goal: the work loop reads settings through a `SettingsManager`, never through `loadSettings`.

Do:

1. `src/types/daemon.ts:258`: replace `getSettings?: () => OrchSettings;` with
   ```ts
   /** Settings for each loop iteration. The daemon passes its manager so reloads are seen. */
   settings: SettingsManager;
   ```
   importing `SettingsManager` from `./services.ts`.

2. `src/daemon/work-loop.ts`: replace every `options.getSettings?.() ?? loadSettings(options.orchDir)` (`:97`, `:118`, `:248`) with `options.settings.current()`, `:273` `loadSettings(options.orchDir).notify` with `options.settings.current().notify`, and `:278` `options.getSettings?.()` with `options.settings.current()` (or `.currentOrNull()` if the surrounding code handles undefined; keep the same nullability the code handled before). Remove the `loadSettings` import.

3. `src/commands/queue.ts` `cmdWork`: where it builds `WorkOptions`, add `settings: services.settings`.

`src/daemon/orchd.ts:817` passes `getSettings: () => getSettings(directory)`; that line breaks now. Do not edit it; the 4-02 chain owns `orchd.ts` and runs next.

Check: lint, tc on your three files. Tests: `test/agent-monitor.test.ts` and `grep -l "work-loop" test/*.ts`.
