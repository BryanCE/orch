# P2-8 `transport-tests` — the four "needs no screen" tests assert on the link

Read `SOCKET-REFACTOR/README.md` first (The design). Read `CLAUDE.md` at the repo root
(Rule 11: delivery and read are orch's mechanism; a pane is a shortcut). Paths are inside
`packages/orch/`.

## You own exactly these files

- `test/dispatch-channel-first.test.ts`
- `test/every-agent-has-an-inbox.test.ts` → create `test/every-agent-has-a-link.test.ts`,
  delete the old file (a `git mv` is Bryan's; say in your result that the file moved)
- `test/port-seam-channel.test.ts`
- `test/transfer-does-not-disturb.test.ts`

Touch nothing else. No `src/` file is yours. If a test needs a source change, report the
file and the line; do not make it.

Phase 1 landed: `deliverControl` pushes for a `bridge` adapter through
`src/control/bridge-links.ts`; `attachBridge(key, { push })` gives a test a fake link;
the outbox payload is a `BridgeMessage`.

## The task

Each of these tests proved "delivery needs no screen" by reading `inbox.jsonl` and writing
`ack.jsonl`. The claim stands; the evidence changes: a headless agent with an attached
bridge receives the push, and no pane is consulted.

Rewrite, do not patch. Attach a fake link, drive the same entry point the test drives today
(`deliverControl`, `acceptTextWrite`, `attemptDelivery` — read each test to see which),
assert on the pushed `BridgeDelivery` and the outbox row state. Delete every `appendAck`,
`drainInbox`, `inboxPath`, `INBOX_FILE`, `ACK_FILE` import and fixture. Detach every key in
`afterEach`. Fix each header comment so it describes the link.

- `test/dispatch-channel-first.test.ts`: a headless agent receives a dispatch through the
  link, not a "no-pane" answer; a `bridge: null` adapter in a capless environment still gets
  the `not-placed` boundary answer.
- `test/every-agent-has-a-link.test.ts`: every agent is addressable through its link
  whatever environment it is in; an agent with no handle still receives a push.
- `test/port-seam-channel.test.ts`: headless delivery reaches the link and the row settles
  on `markOutboxDelivered` (what the `ack` RPC does) without a screen.
- `test/transfer-does-not-disturb.test.ts`: "nothing was said to the agent" = no outbox row
  for it and no push on its link.

## Done means

`bun check` clean on your files (paste it). `bun test` on the four files green (paste it).
List every source line you needed and could not change, if any.
