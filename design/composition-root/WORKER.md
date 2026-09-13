# Worker rules

You are one worker in a fleet building the composition root for orch. You have one task, below this sheet. Do exactly it. Do not research, do not read files the task does not name, do not widen scope.

Repo: `/home/bryan/orch`. All paths in the task are relative to `packages/orch/` unless they start with `packages/` or `design/`.

## Do

1. Read only the files the task names. Edit with the Edit tool. Never edit from a shell.
2. Make the change the task describes. Where the task gives a signature, use it exactly.
3. Check YOUR FILES ONLY. Run, once, from `/home/bryan/orch/packages/orch`:
   ```
   bunx oxlint <every file you own>
   bunx tsc --noEmit 2>&1 | grep -E "<file you own>|<file you own>"
   ```
   Lint takes only your files. tc runs over the package but you read only the lines for your files; an error in a file you do not own is never a failure and never "pre-existing", it is a `CALLERS:` line (path:line, symbol, what it now requires) or nothing. Your check is clean when your own files report zero lines.
   Then run only the test files the task names, once, on the side that owns the disk (repo `CLAUDE.md` Rule 0.1). Checkout under `/mnt/<drive>/…`:
   ```
   WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT\packages\orch'; bun test <files>"
   ```
   Checkout under `/home/…`, from the repo root:
   ```
   bun test packages/orch/test/<files>
   ```
   If the task names no test files, run none.
4. Report in the format below. Stop.

## Do not

- No `git diff`, `git status`, `git log`, no fallow, no re-reading a file you already changed.
- No builds, no `orch daemon *`, no migrations. Rule 1.
- No `as` casts, no `any`. Rule 13. Fix the type.
- No `?? <literal>` on a settings read. Rule 17.
- No `orchDir()` call and no `loadSettings()` call added anywhere. That is what this fleet is removing.
- No default parameter that reaches for a global. A parameter is required or it does not exist.
- Do not edit files you do not own. If your change requires an edit in another file, do not make it; list the file and line under `CALLERS:` in your report.
- Do not run the whole test suite, the integration tests, doctor tests, or anything that opens a pane.
- A timeout from a WSL run is not a finding. Do not report it, bump it, or profile it.

## Value rule

- A command (`src/commands/**`) takes `services: Services` first.
- A helper one level below a command takes the narrowest `Pick<Services, ...>` it uses (`OrchDirService`, `SettingsService`, `LoggerService`, or an intersection).
- A leaf (`src/entities.ts`, `src/presence/*`, `src/policy/*`, `src/settings/read.ts`, `src/store/*`) takes plain values: `orchDir: string`, `settings: OrchSettings`, `hosts: OrchSettings["hosts"]`.
- Anything long-lived that must see settings changes (daemon internals, reconnect loops) takes `settings: SettingsManager` and calls `.current()` per use.

## Report format

```
DONE <task id>
FILES: <every file you edited, one per line>
CALLERS:
<path:line> <symbol> now requires <param>      (omit the section if none)
CHECK:
<paste lint and tc output verbatim>
TESTS:
<paste test output verbatim, or "none named">
```

or

```
BLOCKED <task id>
WHY: <one paragraph: what you found that the task did not anticipate>
```
