# 6-06-test-sweep

Owns: nothing yet. This is a survey task; it edits no files.

Requires 6-01 through 6-05 landed.

Goal: find every test file that still constructs the old world (writes `settings.json` and sets `ORCH_DIR` to drive code that now takes `services`, or calls a `cmd*` with the old arity, or imports a deleted export) and hand the delegator one list to split into per-file tasks.

Do:

1. Run tc over the package (`bun --filter @bryance/orch tc`). Every error under `test/` is one entry.
2. For each failing test file, read only enough to classify it as one of:
   - `arity`: calls `cmd*(args)` and needs `cmd*(testServices({...}), args)` using `test/helpers/services.ts`
   - `deleted-export`: imports `loadSettings`, `orchDir`, `commandLogger`, `settingsLogLevel`
   - `default-param`: calls a leaf without the now-required `orchDir` / `settings`
   - `other`: say what
3. Report:
   ```
   DONE 6-06
   FILES: none
   CALLERS:
   test/<file>.test.ts <class> <one line on what to pass>
   ...
   ```

The delegator writes one `6b-<file>` task per line using the 3b template in PLAN.md, with `test/helpers/services.ts` named as the replacement for `writeSettingsFixture` + `ORCH_DIR` where the test only needs settings, and keeps `writeSettingsFixture` where the test exercises the file storage itself.

Check: none (no edits). Tests: none.
