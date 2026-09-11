# P3-3 `comment-sweep` — no sentence describes the old transport

Read `SOCKET-REFACTOR/README.md` first. Read `CLAUDE.md` at the repo root (a comment that
needs a paragraph means the code is wrong; keep each to one or two lines). Paths are inside
`packages/orch/`.

## You own exactly these files

- `src/entities.ts`, `src/seat/source.ts`
- `src/types/core.ts`, `src/types/policy.ts`, `src/types/seat.ts`, `src/types/daemon.ts`,
  `src/types/agent.ts`
- `test/a-row-is-not-a-pane.test.ts`

Touch nothing else. Words only, plus the orphaned types named below. A hit in a file you do
not own: report it with the line; do not edit.

## The task

Run `grep -n -i "inbox\|ack\.jsonl\|answer\.json\|question\.json\|marker" <each file>` and
fix every hit so the sentence reads true today. Delete the sentence when the point no longer
exists.

- `src/entities.ts` ~101, ~247: "its inbox" → "its link".
- `src/seat/source.ts` ~8: "send → the peer inbox" → "send → the daemon's `message` RPC".
- `src/types/core.ts` ~211 (`spawnerRepliable`): "the spawner is live; orchd queues mail
  for it".
- `src/types/policy.ts` ~22.
- `src/types/seat.ts` ~92.
- `src/types/daemon.ts`: P1-2 rewrote the `OutboxDelivery` block; sweep the rest.
- `src/types/agent.ts`: delete `ControlCommand` and `isControlCommand` if P2-5 reported them
  orphaned (`grep -rn "isControlCommand\|ControlCommand\b" src test` — zero callers means
  delete). Delete `DaemonClient.messageIdOf` if it has no caller
  (`grep -rn messageIdOf src test`). Sweep the doc comments.
- `test/a-row-is-not-a-pane.test.ts` ~29, ~93.
- `presenceRegistration` on the adapter port: if P2-3 reported it has no reader, it is in
  `src/types/adapter.ts` (not yours) — report it again with the grep result so the delegator
  deletes it.

## Done means

The grep above returns nothing across your eight files (paste it). `bun check` clean on
your files (paste it). `bun test test/a-row-is-not-a-pane.test.ts` green (paste it).
