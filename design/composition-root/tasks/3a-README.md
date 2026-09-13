# 3a: leaf signatures

Every `3a-*` task has the same shape. The delegator prepends this README to every 3a prompt after WORKER.md.

## Rules for a 3a task

1. In your file, every `orchDir()` call, every `loadSettings(...)` / `loadSettingsOrNull(...)` call, and every parameter defaulting to `orchDir()` goes away. The enclosing function gains a required parameter per the value rule in WORKER.md:
   - leaf module: `orchDir: string` or `settings: OrchSettings` or a specific slice like `hosts: OrchSettings["hosts"]`
   - long-lived code that re-reads settings on each use (reconnect loops, daemon internals): `settings: SettingsManager` from `src/types/services.ts`, calling `.current()` or `.currentOrNull()` per use
2. A private function threads the value from its exported caller inside the same file.
3. You do not edit any other file. Run tc over the package; every error it reports in another file is a caller. List each under `CALLERS:` as `<path>:<line> <symbol> now requires <param>`. Group by file. The delegator writes one 3b task per caller file.
4. Where a `?? SETTINGS_DEFAULTS.x` sits next to a `loadSettingsOrNull` (for example `loadSettingsOrNull(dir)?.fleet.cross_space ?? SETTINGS_DEFAULTS.fleet.cross_space`), the function takes `settings: OrchSettings | null` and keeps the `?? SETTINGS_DEFAULTS.x`. That fallback reads from the registry, which Rule 17 allows.
5. Remove the `orchDir` / `loadSettings` imports once unused.
6. Your file's lint and tc must be green. The tree is expected red until the generated 3b tasks land.
