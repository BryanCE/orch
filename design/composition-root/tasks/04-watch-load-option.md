# 04-watch-load-option

Owns: `src/settings/watch.ts`

Goal: let the caller supply how settings are loaded, so the daemon can route reloads through its `SettingsManager` instead of the watcher calling `loadSettings` itself. This task adds the option; task 6-04 later makes it required.

Do, in `src/settings/watch.ts`:

1. Add to `SettingsWatchOptions`:
   ```ts
   /** Load the current settings. The daemon passes `() => services.settings.reload()` so the
    *  watcher and the manager agree on one value. */
   load?: () => OrchSettings;
   ```
   Note: `reload()` on the manager returns `OrchSettings | null`; the daemon wraps it. This option's type stays `() => OrchSettings`.

2. In the `reload` closure inside `watchSettings` (line 41), replace `const settings = loadSettings(orchDir);` with `const settings = opts.load === undefined ? loadSettings(orchDir) : opts.load();`.

Nothing else changes. The single caller, `src/daemon/orchd.ts:767`, keeps working unchanged.

Check: lint, tc. Tests: every test file that imports `settings/watch.ts` (`grep -l "settings/watch" test/*.ts`).
