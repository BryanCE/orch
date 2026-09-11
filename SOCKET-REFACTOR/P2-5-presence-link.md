# P2-5 `presence-link` — the bridge attaches, applies pushed deliveries, acks after apply

Read `SOCKET-REFACTOR/README.md` first (The design, The wire, Cross-slice contracts). Read
`CLAUDE.md` at the repo root (Rule 6: `src/agent/**` is bundled standalone; Rule 10). Paths
are inside `packages/orch/`.

Phase 1 landed: `DaemonClient.attach(key, onDelivery)`, `detach()`, `attached()`,
`postAck(id)` over the link (`src/agent/daemon-client.ts`); `BridgeDelivery`,
`BridgeMessage` (`src/control/bridge-message.ts`).

## You own exactly these files

- `src/agent/presence.ts`
- `src/agent/model-control.ts`
- `src/agent/harness-bridge.ts`
- `test/bridge-apply.test.ts` (new)

Touch nothing else. `src/agent/tools.ts` is P2-6's (same phase): it calls
`presence.answers`, defined below. `src/agent/peers.ts` is P2-7's.

## The task

### `src/agent/presence.ts`

- `initPresence`: once the presence dir and key exist, `daemon.attach(key, routeDelivery)`.
  Delete `poll`, `watcher`, `INBOX_POLL_MS`, `drainInbox`, `parseInboxLine`,
  `routeInboxLine`, `resetInbox`, `isInboxFilename`, the `reportDeliveryAck` /
  `drainPresenceInbox` imports, and `fs` if it goes unused. `stopPresence` calls
  `daemon.detach()`.
- `routeDelivery(delivery: BridgeDelivery)`:
  ```
  if (daemon.isAcked(delivery.id)) { void daemon.postAck(delivery.id); return; }   // redelivery: ack again, apply once
  switch (delivery.message.action):
    "dispatch" | "steer" → delivered = { id, text }; deliverSteerText(text)
    "model"              → modelControl.applyControlCommand(message, delivery.id)
    "answer"             → if (!answers.settle(delivery.id, message)) return;   // dropped, NOT acked
  daemon.markAcked(delivery.id); void daemon.postAck(delivery.id); writeStatus();
  ```
  The ack goes after the apply, never before: an ack means "applied".
- `presence.answers`:
  ```ts
  answers: {
    /** Resolve when an answer for questionId arrives; reject on abort. */
    await(questionId: string, signal: AbortSignal | undefined): Promise<{ deliveryId: string; text: string }>;
    /** Hand a delivered answer to its waiter; false when nobody waits on that question. */
    settle(deliveryId: string, message: Extract<BridgeMessage, { action: "answer" }>): boolean;
  }
  ```
  One pending waiter per questionId; `await` for a second questionId while one is pending
  replaces it (the tool never asks two at once, but the registry must not leak).
- Delete `routeInboxCommand`, the `on_done` branch, and everything only it fed:
  `pendingHandoff`, `hasPendingHandoff`, `deliverPendingHandoff`, `clearPendingHandoff`,
  the `pendingHandoff` / `handoffError` fields on `AgentPresenceState` and their writers,
  the `appendPeerInbox` / `resolvePeer` imports. Nothing reads those status fields
  (`grep -rn "pendingHandoff\|handoffError" src packages/web` — prove it; a hit outside
  this file: stop and report).
- Rewrite the header comment: its live state record, its link to orchd, the deliveries that
  arrive on it. No inbox, no marker, no pane.

### `src/agent/model-control.ts`

`applyControlCommand(message: Extract<BridgeMessage, { action: "model" }>, id: string)`.
The `cmd: "thinking"` variant goes (thinking travels inside the model spec). `isControlCommand`
/ `ControlCommand` (in `src/types/agent.ts`, P3-3's) lose their last caller — report them
orphaned; do not edit that file. Rewrite the header comment (no "inbox").

### `src/agent/harness-bridge.ts`

Nothing new to wire; presence attaches itself. Make sure `stopPresence` (so `daemon.detach`)
runs on the harness shutdown path as it does today. If the file needs no change, say so.

### `test/bridge-apply.test.ts`

Drive `createAgentPresence` with a fake `DaemonClient` whose `attach` captures
`onDelivery`. Cover: a `dispatch` delivery reaches `harness.sendUserMessage` and is acked
after; a redelivered id is acked and not applied twice; a `model` delivery reaches the model
control; an `answer` for the awaited question resolves `answers.await` and is acked; an
`answer` for another question is dropped and NOT acked; `stopPresence` detaches. See
`test/peer-tools-registration.test.ts` for the fake-harness pattern.

## Done means

`bun check` on your files (paste it; `tools.ts` errors are P2-6's and are named). `bun test
test/bridge-apply.test.ts` green (paste it). Paste the final `presence.answers` surface
verbatim.
