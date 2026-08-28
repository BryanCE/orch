# Recon: `ack.jsonl` delivery path (L7)

## 1. Current chain (with source locations)

1. **RPC request:** CLI control commands call `writeRpc("dispatch", ...)` / `writeRpc("steer", ...)` (for example `src/commands/control.ts:55-61`; lifecycle dispatch is `src/commands/lifecycle.ts:31`). The daemon registers both RPC handlers at `src/daemon/orchd.ts:326-329`.
2. **Daemon outbox insert and initial drain:** `acceptWrite()` validates/governs the request, generates the message UUID, and inserts an outbox row with `{state: pending, attempts: 0}` at `src/daemon/orchd.ts:169-176`; it immediately calls `drainOutbox()` at `:176`. The pending-row check at `:177-180` rejects the RPC if the row remains pending.
3. **Outbox delivery:** `src/daemon/outbox.ts:25-55` selects due pending rows (`selectPendingOutbox`, `src/store/outbox-rows.ts:53-60`), calls `deps.deliver(target,payload,id)` at `outbox.ts:38-43`, and treats a `true` return as delivered (`:44-47`). For inbox adapters, `deliverWrite()` routes through `deliverControl()` (`src/daemon/orchd.ts:132-145`), which requires a live presence bridge and calls the adapter's inbox writer (`src/control/dispatch.ts:111-121`; pi implementation `src/adapters/pi.ts:171-175,192-196`).
4. **Inbox append:** The adapter appends JSON containing the same `id` and text to `<presence>/inbox.jsonl` (`src/adapters/pi.ts:192-196`).
5. **Bridge poll/watch:** The harness bridge drains that inbox via the shared atomic rename drain (`src/agent/presence.ts:413-424`, backed by `src/presence/inbox.ts:34-58`). It starts both a periodic poll (`presence.ts:440-446`) and `fs.watch` filtered by `isInboxFilename` (`:447-454`).
6. **Ack write:** After applying a message, `routeInboxLine()` marks the id locally and first attempts the daemon `ack` RPC; if that fails it calls `appendAckMarker()` (`src/agent/presence.ts:398-410`, fallback at `:382-386`). `appendAck()` appends `{id,key,ts}` to `ack.jsonl` (`src/presence/inbox.ts:61-72`).

There is also a **working socket ack path**: `src/agent/daemon-ack.ts:34-55` posts RPC method `ack`; orchd's handler marks the outbox row delivered at `src/daemon/orchd.ts:334-339`. The file fallback is not wired: no source reads `ack.jsonl` today.

## 2. Where success is decided

The daemon currently has two independent success decisions:

- `drainOutbox()` decides success solely from the boolean returned by `deps.deliver` (`src/daemon/outbox.ts:38-46`). `true` immediately runs `markOutboxDelivered`; `false` or a thrown error runs `bumpOutboxAttempt` and schedules another attempt (`:49-51`).
- A bridge's socket `ack` RPC also directly runs `markOutboxDelivered` (`src/daemon/orchd.ts:334-339`). Thus an inbox append can return from the adapter with no confirmation that the bridge consumed it; only the bridge's later socket ack makes that row delivered. If the socket is unavailable, the bridge writes `ack.jsonl`, but nothing consumes that marker, so the row remains pending and is retried.

Outbox states are only `"pending" | "delivered"` (`src/store/outbox-rows.ts:10-17`), with no failed/dead-letter state. Outbox attempts are unbounded; `src/daemon/outbox.ts:14-18,49-51` applies exponential backoff (capped at 30s) and increments `attempts`. `queue.max_retries` (`src/config.ts:60-64`) belongs to task-queue claim/error retries in `src/daemon/work-loop.ts:156-181,206-235`; it does not limit outbox delivery attempts.

## 3. Minimal ack-reader fix slice

**Smallest proposal:** add one daemon-side consumer in `src/daemon/outbox.ts`, next to `drainOutbox`:

```ts
export function consumeOutboxAcks(orchDir: string): number
```

It would enumerate presence agent directories under `${orchDir}/agents`, read/parse each `ack.jsonl`, call `markOutboxDelivered(orchDir, id)` for valid ids (optionally checking the stamped key against the directory), then truncate/claim the file so markers are not reprocessed. The insertion point is the first line of `drainOutbox()` before `selectPendingOutbox(...)` (`src/daemon/outbox.ts:29`): consume persisted fallback acks, then select pending rows so an acknowledged row is excluded from the retry pass. Calling it from the existing daemon drain path gives restart recovery without a second delivery loop. The existing RPC ack handler remains the fast path.

This is deliberately not a new outbox state or retry policy: `pending` and `delivered` remain the complete state set, and `attempts`/backoff remain the outbox retry mechanism. `queue.max_retries` should not be consulted by this reader.

## 4. Headless E2 check

Changing only `HeadlessBackend.deliver()` from `false` to `true` (`src/backends/headless/index.ts:243-246`) is not sufficient for inbox delivery. Headless launch explicitly runs its one initial prompt and exits (`:159-164`), so a later inbox message has no live process to drain it. Inbox routing also calls `requireLiveAgent()` and refuses a missing/dead bridge (`src/control/dispatch.ts:84-89,111-121`).

Therefore the headless boolean is the only blocker for the **backend keystroke/fallback** path, but not for the normal adapter inbox path: headless's one-shot lifetime and the live-presence gate remain blockers. The smallest E2-compatible design must either keep headless delivery limited to the initial launch prompt (and avoid claiming post-launch inbox delivery), or change headless spawning/lifecycle to keep a bridge process alive; merely returning `true` would falsely mark a write delivered.
