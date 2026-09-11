# P3-1 `delete-files` — the file channels are gone

Read `SOCKET-REFACTOR/README.md` first. Read `CLAUDE.md` at the repo root (Rule 8: one
shape, no compat). Paths are inside `packages/orch/`.

Phases 1 and 2 landed. No runtime code reads or writes `inbox.jsonl`, `ack.jsonl`,
`answer.json` or `question.json`. Delete what is left.

## You own exactly these files

- `src/presence/inbox.ts` — DELETE
- `src/presence/schema.ts`, `src/presence/writer.ts`, `src/presence/roles.ts`
- `src/types/backend.ts`
- `src/backends/herdr/index.ts`, `src/backends/herdr/cli.ts`, `src/backends/headless/index.ts`, `src/backends/tmux/index.ts`

Touch nothing else. `scripts/check-bridge.ts` and its test are P3-2's; comments elsewhere
are P3-3's.

## The task

1. Prove the ground. Run and paste:
   ```bash
   grep -rn "presence/inbox\|INBOX_FILE\|ACK_FILE\|ANSWER_FILE\|QUESTION_FILE\|appendInbox\|drainInbox\|drainClaimedLines\|appendAck\|reportDeliveryAck\|writeAnswer\|appendPeerInbox\|agentChannel\|AgentChannelRole\|DeliveryReceipt" src extensions test ../web/src
   ```
   Every hit must be in a file you own, or in `scripts/check-bridge.ts` / its test (P3-2) /
   `test/smoke.sh` (P3-4). Anything else: stop and report the file.
2. Delete `src/presence/inbox.ts`.
3. `src/presence/schema.ts`: delete `INBOX_FILE`, `ANSWER_FILE`, `ACK_FILE`, `QUESTION_FILE`
   and their doc lines. `STATUS_FILE`, `RESULTS_FILE`, `OUTCOMES_FILE` stay — history and
   liveness. Rewrite the block comment: the presence directory holds the agent's status
   record and its history; control traffic travels over the daemon socket.
4. `src/presence/writer.ts`: delete `writeAnswer` and the `ANSWER_FILE` import.
5. `src/presence/roles.ts`: delete `createAgentChannelRole`, `agentChannel`,
   `requireLivePresence`, and the `appendInbox` / `randomUUID` imports. `createCaptureRole`
   / `capture` stay.
6. `src/types/backend.ts`: delete `AgentMessage`, `DeliveryReceipt`, `AgentChannelRole`, and
   the `channel` member on the backend port. Fix the comment on `capture`.
7. The three backends: delete `readonly channel = agentChannel;` and the import.
8. herdr loses the gone signal before it can raise it. `herdrOutput` in `cli.ts` runs the
   command through `runTool` with `DEFAULT_TOOL_RETRY` (4 attempts). When the pane is gone,
   `retryingSync` throws its own `failed after 4 attempts` Error, which has no `stderr`, so
   `herdrErrorCode` answers `null` and `reportGoneHandle` in `index.ts` rethrows a plain
   error instead of `AgentGoneError` (the 2026-09-11 log shows exactly this for
   `pane_not_found`). Fix:
   - Move `GONE_HANDLE_CODES` from `index.ts` to `cli.ts` and export it.
   - In `cli.ts`, add `HERDR_INPUT_RETRY: RetryPolicy` = `DEFAULT_TOOL_RETRY` plus
     `retryable: (error) => { const code = herdrErrorCode(error); return code === null || !GONE_HANDLE_CODES.has(code); }`.
     A gone code throws through on the first attempt with `stderr` intact.
   - `herdrAck(args, timeoutMs?, policy?)` passes the policy down to `herdrOutput` →
     `executeHerdr`. `agentInput.submit` and `sendKeys` in `index.ts` call
     `herdrAck([...], undefined, HERDR_INPUT_RETRY)`.
   - Find the herdr test that fakes the executor (`grep -ln "setToolExecutor" test/`) and
     add: an executor whose stderr is `{"error":{"code":"pane_not_found"}}` makes
     `agentInput.submit` throw `AgentGoneError` after exactly one call; a plain failure is
     still retried 4 times.
9. Re-run the grep from step 1 with your own files included; the only remaining hits are
   P3-2's and P3-4's.

## Done means

`bun check` on the tree (paste it — you touched a port every backend implements; hits in
`scripts/check-bridge.ts` are P3-2's and are named). `bun test test/a-backend-exposes-each-operation-once.test.ts`
and any backend test green (`grep -ln "agentChannel\|\.channel" test/`; paste).
