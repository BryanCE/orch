# 6-04-watch-load-required

Model: luna:low
Owns: `src/settings/watch.ts`

Requires 4-02b landed (the daemon passes `load`).

Goal: the watcher never loads settings itself.

Do, in `src/settings/watch.ts`:

1. `load` in `SettingsWatchOptions` becomes required: `load: () => OrchSettings;`.
2. `watchSettings(orchDir: string, opts)` becomes `watchSettings(file: string, opts)`; it only ever used `orchDir` to compute `settingsPath(orchDir)`. Delete that line and use `file` directly.
3. The `reload` closure calls `opts.load()` only. Remove the `loadSettings` and `settingsPath` imports.

The one caller is `src/daemon/orchd.ts`; it now passes `services.settings.file` as the first argument. List it under `CALLERS:`; the delegator hands it to the orchd owner as a one-line 3b task.

Check: lint, tc. Tests: `grep -l "settings/watch" test/*.ts`.
