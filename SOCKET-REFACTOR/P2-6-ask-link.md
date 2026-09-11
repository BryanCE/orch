# P2-6 `ask-link` — `orch_ask` waits on the link, writes no question file, polls no answer file

Read `SOCKET-REFACTOR/README.md` first (The design: closes #4; Cross-slice contracts). Read
`CLAUDE.md` at the repo root (Rule 6). Paths are inside `packages/orch/`.

## You own exactly this file

- `src/agent/tools.ts`

Touch nothing else. P2-5 (same phase) defines `presence.answers.await(questionId, signal)`
→ `Promise<{ deliveryId: string; text: string }>` on the presence object; code against it.
The ack for the answer is posted by P2-5's `routeDelivery` — you do not ack.

## The task

In the `orch_ask` tool:

- Delete `waitForOrchestratorAnswer`, the `QUESTION_FILE` / `ANSWER_FILE` / `atomicWrite` /
  `presenceFile` / `reportDeliveryAck` imports, the `questionFile` / `answerFile` paths and
  both `unlinkSync` blocks.
- The question record is `state.asking = { question, id, ts }` with `state.state =
  "asking"` and a `writeStatus()` — already there; that is the only record now.
- Wait with `const answer = await presence.answers.await(id, signal)`; return
  `toolResult(answer.text)`. Keep the 60 s re-notify: a timer that calls
  `notify(notificationEvent)` every 60 s until the wait settles or aborts; clear it in
  `finally`.
- The `finally` block (clear `asking`, restore state, `writeStatus`) stays.
- `grep -n "inbox\|question.json\|answer.json\|QUESTION_FILE\|ANSWER_FILE" src/agent/tools.ts`
  → zero hits.

There is a test for the tool registrations (`grep -ln "orch_ask" test/`). If one is not in
another phase-2 slice's list, it is yours: cover the answer resolving the tool, abort
rejecting it, and the status `asking` record written and cleared.

## Done means

`bun check` on your file (paste it; a residue only P2-5 clears is named). The tool test
green (paste it).
