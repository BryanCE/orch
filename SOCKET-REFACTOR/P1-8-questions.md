# P1-8 `questions` — `orch questions` reads `status.asking`, not `question.json`

Read `SOCKET-REFACTOR/README.md` first (Decisions: `question.json` is deleted). Read
`CLAUDE.md` at the repo root. Paths are inside `packages/orch/`.

## You own exactly these files

- `src/commands/results.ts`
- `test/commands-results.test.ts`

Touch nothing else. `orch answer` (`commands/control.ts`) is P2-4's; the bridge's writer of
`status.asking` (`agent/tools.ts`) is P2-6's and already writes it today.

## The task

The bridge already records a pending question in `status.json` as
`asking: { question, id, ts }` (typed at `src/types/presence.ts:45`) with `state: "asking"`.
`question.json` duplicates it.

`collectPendingQuestions`: the pending question for a live, scoped presence entry is
`pres.status?.asking`. Delete the `readJSON` of `QUESTION_FILE`, the `QUESTION_FILE` and
`path` imports if they go unused, and `isQuestionPayload` / `QuestionPayload` if `asking`
already is the typed shape (`questionText` then reads `asking.question`; keep `questionText`
only if a second caller exists — grep). Keep the alive filter and its comment. Rewrite the
doc comment on the collector.

`test/commands-results.test.ts`: every fixture that wrote `question.json` writes
`status.asking` through `seedStatus` (see `test/helpers/presence.ts`) instead; a dead
agent's `asking` is not listed; an agent with no `asking` is not listed; the JSON output
carries `id`, `question`, `ts`.

## Done means

`bun check` clean on your files (paste it). `bun test test/commands-results.test.ts` green
(paste it).
