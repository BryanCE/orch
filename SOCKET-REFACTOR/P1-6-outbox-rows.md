# P1-6 `outbox-rows` — the outbox carries `BridgeMessage`, re-pushes on attach, scans no file

Read `SOCKET-REFACTOR/README.md` first (The design, Cross-slice contracts). Read `CLAUDE.md`
at the repo root. Paths are inside `packages/orch/`.

## You own exactly these files

- `src/store/outbox-rows.ts`, `src/types/store.ts`
- `src/daemon/outbox.ts`
- `test/outbox-ack.test.ts`

Touch nothing else. `orchd.ts` (P2-1, next phase) calls what you add. Need a change outside
this list? Stop and report it.

Already in place: `src/control/bridge-message.ts` (`BridgeMessage`, `isBridgeMessage`),
`src/control/bridge-links.ts` (`BridgeDetachedError`).

## The task

### `src/types/store.ts`

`OutboxMessageInput` (line 167) and `OutboxMessage` (line 181) are hand-packed on one line.
Rewrite both as ordinary code. `payload: unknown` → `payload: BridgeMessage` on both. Fix the
comment near line 174 ("inbox dispatch").

### `src/store/outbox-rows.ts`

- `toMessage` narrows the stored JSON with `isBridgeMessage`; a row that fails it throws
  (`invalid outbox payload for <id>`). No cast.
- Add `selectOpenOutboxForTarget(directory, target): OutboxMessage[]` — every row in
  `OPEN_OUTBOX_STATES` for the target, oldest first, ignoring `nextAttemptAt`.
- Add `outboxMessageState(directory, id): OutboxState | undefined`.

### `src/daemon/outbox.ts`

- DELETE `consumeOutboxAcks` and everything only it used: `readdirSync`, `statSync`,
  `join`, `ACK_FILE`, `drainClaimedLines`, `presenceRoot`, `isRecord`. After this the file
  imports nothing from `src/presence/`.
- `drainOutbox` returns `{ retried, awaiting }`; delete the `delivered` counter.
- Add `redeliverOpenRows(orchDir, target, deps): Promise<void>` — `attemptDelivery` for
  every row from `selectOpenOutboxForTarget`. It reuses `attemptDelivery` so the in-flight
  guard and the state changes stay in one place. P2-1 calls it on `attach`.
- `attemptDelivery`: a thrown `BridgeDetachedError` is `failed` (retry); a thrown
  `AgentGoneError` is `gone` (settle `undeliverable`). The `isAgentGone(error) ? "gone" :
  "failed"` branch already says so, but today it is dead code: orchd's `deliverWrite`
  catches every throw and returns `"failed"` before anything reaches it (P2-1 fixes that).
  Keep the branch; it is the contract P2-1 codes against. Make the `retry.attempt` log line
  carry `reason: "bridge-detached" | "error"` so the decision log says which.
- `attemptDelivery`: the attempts cap. After a `failed` outcome, when
  `message.attempts + 1 >= deps.maxAttempts`, settle the row `undeliverable` and log
  `dispatch.undeliverable { target, attempts, reason: "attempts-exhausted" }` instead of
  bumping it. `deps.maxAttempts` is on `OutboxDeps` (P1-2 adds it; P2-1 fills it from
  `daemon.outbox_max_attempts`). No literal in this file (Rule 17).
- `selectOpenOutboxTargets(directory)` already exists in `outbox-rows.ts` (landed with the
  `orch clean` change); `closeOutboxForDeadTargets` in `src/presence/store.ts` calls it.
  Leave both alone.
- Fix the doc comments: no marker, no `ack.jsonl`; "a queued message is re-delivered only if
  no ack arrives on the socket".

### `test/outbox-ack.test.ts`

Rewrite. Delete `appendAck`. Cover: `markOutboxDelivered` (what the `ack` RPC calls) settles
an `awaiting` row and a later `attemptDelivery` skips it; a `deliver` that throws
`BridgeDetachedError` leaves the row `pending`, bumps `attempts`, and the log carries
`bridge-detached`; a `deliver` that throws `AgentGoneError` settles the row `undeliverable`
on the first attempt; a `deliver` that returns `"failed"` on a row whose `attempts` is
already `maxAttempts - 1` settles it `undeliverable` with reason `attempts-exhausted`, and
one attempt earlier leaves it `pending`; `redeliverOpenRows` attempts every open row for the target and none for
another target, ignoring `nextAttemptAt`; a redelivered row keeps its id;
`selectOpenOutboxForTarget` excludes settled rows; `toMessage` throws on a malformed payload.

## Done means

`bun check` clean on your files (paste it). `bun test test/outbox-ack.test.ts` green (paste
it). Report the exact signatures of the three functions you added.
