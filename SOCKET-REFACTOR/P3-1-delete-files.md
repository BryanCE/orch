# P3-1 `delete-files` — the file channels are gone

Read `SOCKET-REFACTOR/README.md` first. Read `CLAUDE.md` at the repo root (Rule 8: one
shape, no compat). Paths are inside `packages/orch/`.

Phases 1 and 2 landed. No runtime code reads or writes `inbox.jsonl`, `ack.jsonl`,
`answer.json` or `question.json`. Delete what is left.

## You own exactly these files

- `src/presence/inbox.ts` — DELETE
- `src/presence/schema.ts`, `src/presence/writer.ts`, `src/presence/roles.ts`
- `src/types/backend.ts`
- `src/backends/herdr/index.ts`, `src/backends/headless/index.ts`, `src/backends/tmux/index.ts`

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
8. Re-run the grep from step 1 with your own files included; the only remaining hits are
   P3-2's and P3-4's.

## Done means

`bun check` on the tree (paste it — you touched a port every backend implements; hits in
`scripts/check-bridge.ts` are P3-2's and are named). `bun test test/a-backend-exposes-each-operation-once.test.ts`
and any backend test green (`grep -ln "agentChannel\|\.channel" test/`; paste).
