# P2-2 `outcome` — silence after a model push has one meaning

Read `SOCKET-REFACTOR/README.md` first. Read `CLAUDE.md` at the repo root. Paths are inside
`packages/orch/`.

## You own exactly these files

- `src/control/outcome.ts`
- `src/control/dispatch.ts` (one call site: `deliverModel`)

Touch nothing else.

## The task

`stillQueued` in `outcome.ts` reads `inbox.jsonl` to tell "still queued" from "consumed and
dropped". Neither exists now: `deliverModel` either throws `BridgeDetachedError` before the
wait (never pushed) or the push succeeded. So:

- Delete `stillQueued`, `silenceReason`, and the `readFileSync` / `inboxPath` / `isRecord`
  imports.
- `awaitControlOutcome(id, timeoutMs)` — drop the `dir` parameter. The timeout error reads:
  `agent took the model command but reported no outcome within ${timeoutMs}ms`.
- Rewrite the header comment (no record to poll, no file in the path — already true; make
  it say the wait is one in-process promise settled by the `control-outcome` RPC).
- `dispatch.ts` `deliverModel`: call `awaitControlOutcome(id, timeoutMs)`; delete the
  `dir` lookup and its "presence dir vanished" throw.

There is a test for the outcome wait (`grep -ln awaitControlOutcome test/`). Fix its call
shape and delete any case that seeded an inbox file to produce the "still queued" message.

## Done means

`bun check` clean on your files (paste it). The outcome test and
`bun test test/control-dispatch.test.ts` green (paste it).
