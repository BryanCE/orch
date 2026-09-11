# P3-4 `smoke-dead` — the smoke fixture asks through `status.asking`; dead code is named

Read `SOCKET-REFACTOR/README.md` first. Read `CLAUDE.md` at the repo root. Paths are inside
`packages/orch/`.

## You own exactly this file

- `test/smoke.sh`

Touch nothing else. The second half of this task is a REPORT, not an edit.

## The task

1. `test/smoke.sh` ~77 writes a `question.json` fixture. Delete that heredoc. Put the
   question into the `status.json` fixture (~55) instead:
   `"state": "asking"`, and `"asking": { "question": "Proceed with the fixture?", "id": "q-fixture", "ts": "<same date expression the file already uses>" }`.
   Wherever the smoke asserts on `orch questions` output, make the expected text match the
   command's current output (run it; read `src/commands/results.ts`, P1-8's, for the
   columns). If a golden file exists for it, it is yours to regenerate only if it lives
   under `test/`; say what changed.
2. Run the smoke the way the repo runs it (find the runner: `grep -rn smoke.sh package.json
   scripts`). Paste the tail.
3. `bun run fallow:dead` over the tree. For every dead export the refactor exposed, list
   `file:line — name — which phase-3 slice owns the file (or "nobody")`. Do not delete any of
   them; the owners do, and the delegator does the rest.

## Done means

Smoke green (paste the tail). The dead-code list, formatted as above.
