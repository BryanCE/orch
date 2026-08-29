# Burn-down — the last three slices of the original rebuild

**Status: ACTIVE. This file is the methodology AND the checklist. `.claude/hooks/tasks-gate.sh`
reads it; the Stop hook refuses to let a session end while any row below is not `BUILT`.**

Set by the user on 2026-08-29. Everything in `02-scope.md` and `11-usage-bugs.md` is done. The
four DECIDED contracts (`07`, `12`, `13`, `14`) had three unfinished slices between them. Those
three are the whole of the remaining ORIGINAL work. `10-review-findings.md` §2.5–§6 is NOT in
scope — it needs discussion with the user first. **Do not start it.**

## The methodology (deterministic, followed by every session and every agent)

One row at a time, in file order, and every agent on the fleet works THE SAME row until it is
done. Nobody is tasked with anything outside the current row.

1. **Pick the first row below that is not `BUILT`.** Quote its id.
2. **Red.** Write the test that DEFINES the row's required behaviour, in the row's own terms.
   Run it (`bun test <file>`), paste the failing line.
3. **Green.** Smallest code that passes. Delete the OLD path in the same change — a row is done
   only when the old code is gone, never when the new one exists beside it. Fleet workers take
   file-disjoint mechanical slices of THIS row only; the orchestrator writes each dispatch as one
   defined change plus the proof.
4. **Gate.** Run `bunx tsc --noEmit`, `bunx oxlint src/ test/ scripts/`, `bun test` yourself
   until all three are clean. Then hand the user, verbatim, character for character:
   ```
   bun check > .\current-errors.md
   bun run test *> .\test-results.md
   ```
   and READ the result files. Never run `bun check`/`bun run check` yourself (Rule 5).
5. **Commit.** `/cmt`, then run the printed `git cmt` command.
6. **Mark.** Flip the row below to `BUILT` with the file:line that satisfies it and the test that
   proves it. Commit that too.
7. Only now move to the next row. When every row is `BUILT`, STOP — do not begin
   `10-review-findings.md`.

"Done" for a row means: tests all pass, zero type errors, zero lint errors, old path deleted, row
marked, committed.

## Rows

| # | slice | requirement | status |
|---|---|---|---|
| B1 | `13-logging.md` slice 4 | Every `process.stderr.write` under `src/` is gone except the logger's own sink guard. Each site becomes a `log.<level>(event, fields)` call at the right level, or — where it is genuinely output the human asked for — a `process.stdout.write`. Decided per site. A static test asserts zero `process.stderr.write` in `src/` and `extensions/`. | `BUILT` — zero sites: CLI-process lines are `process.stdout.write` with a `commandLogger()` record where none preceded (`src/commands/spawn.ts`, `lifecycle.ts`, `clean.ts`, `results.ts`, `control.ts`, `events.ts`, `models.ts`, `index.ts`, `setup.ts`, `src/adapters/claude.ts`, `codex.ts`, `model-catalogue.ts`, `src/doctor/runner.ts`, `src/daemon/reach.ts`); daemon-process lines are log records only (`src/daemon/orchd.ts`, `work-loop.ts`, `retention.ts:57/92/116` → `retention.sweep-failed`, `src/backends/headless/index.ts` logPruning, `src/notify/router.ts:8` → `notify.failed`); the harness-side fatal in `src/presence/writer.ts` `launchKey` → `launch.invalid-key`. Proven by `test/no-stderr-writes.test.ts` (recursive scan of `src/` and `extensions/`, pinned non-vacuous). |
| B2 | `07-port-seam.md` slices 5 + 9 | The `Backend` shell is deleted: no `Backend` interface, no `workspaceNames()`, no `BackendWorkspace`, no "workspace" vocabulary in `src/types/backend.ts` or anywhere in orch's core (it is a plexer's word — orch says space/pack and stores the plexer coordinate). `checkBackendCapabilities` in `src/doctor/backends.ts` becomes an environment description, not a capability projection. A static test forbids the deleted names. | `BUILD` |
| B3 | `14-settings-tui.md` slice 6 | `src/commands/settings.ts` writes NOTHING except through `writeRegisteredSetting`. The direct `writeSettings*` calls (`writeSettingsDefault`, `writeSettingsModels`, `writeSettingsAllowedModels`, `writeSettingsPreferredModels`, `writeSettingsSkills`, `writeSettingsNotify`, `writeSettingsThinking`) are deleted from that file; any writer that then has no importer is deleted from `src/config.ts`. A test asserts the subcommands persist through the registry (spy on the registry, not on the file). | `BUILD` |
