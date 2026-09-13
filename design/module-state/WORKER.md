# Worker rules

You are one worker in a fleet removing module-level runtime state from orch. You have one task, below this sheet. Do exactly it. Do not research beyond the files the task names, do not widen scope.

Repo: `/home/bryan/orch`. All paths in the task are relative to `packages/orch/` unless they start with `packages/` or `design/`.

## Do

1. Read only the files the task names. Edit with the Edit tool. Never edit from a shell.
2. Make the change the task describes. Where the task gives a signature, use it exactly.
3. Run only the test files the task names, once, from the repo root: `bun test packages/orch/test/<file>`. Then run `bun check` from the repo root, once. An error in a file you do not own is never a failure and never "pre-existing": it is a `CALLERS:` line (path:line, symbol, what it now requires) or nothing. Your check is clean when your own files report zero lines.
4. Report in the format below. Stop.

## Do not

- No `git diff`, `git status`, `git log`, no fallow, no re-reading a file you already changed.
- No builds, no `orch daemon *`, no migrations. Rule 1.
- No `as` casts, no `any`. Rule 13. Fix the type. `as const` on a literal tuple is allowed.
- No `?? <literal>` on a settings read. Rule 17.
- No default parameter that reaches for a global. A parameter is required or it does not exist.
- No setter function that swaps a module variable. State lives on the object that owns it.
- Node builtins only in `src/` and `extensions/`. Rule 6.
- Do not edit files you do not own. If your change requires an edit in another file, do not make it; list the file and line under `CALLERS:` in your report.
- Do not run the whole test suite, `integration/`, `doctor/`, or anything that opens a pane.

## Report format

```
DONE <task id>
FILES: <every file you edited, one per line>
CALLERS:
<path:line> <symbol> now requires <param>      (omit the section if none)
CHECK:
<paste bun check output verbatim>
TESTS:
<paste test output verbatim, or "none named">
```

or

```
BLOCKED <task id>
WHY: <one paragraph: what you found that the task did not anticipate>
```
