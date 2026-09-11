# P2-1 `orchd` — the daemon pushes, re-pushes on attach, and tells the caller

Read `SOCKET-REFACTOR/README.md` first (The design, The wire, Cross-slice contracts). Read
`CLAUDE.md` at the repo root and `learnings/2026-07-16-harness-plexer-architecture.md`.
Paths are inside `packages/orch/`.

Phase 1 landed. In place and yours to call:
- `src/control/bridge-links.ts`: `bridgeAttached`, `attachedBridgeKeys`, `BridgeDetachedError`.
- `src/control/bridge-message.ts`: `isBridgeMessage`.
- `src/daemon/rpc/server.ts`: handles `attach`, then calls your `attach` handler, then
  `RpcServerOptions.onBridgeAttached(key)`; `RpcServer.attachedBridgeCount()`.
- `src/daemon/outbox.ts`: `redeliverOpenRows(orchDir, target, deps)`;
  `src/store/outbox-rows.ts`: `selectOpenOutboxForTarget`, `outboxMessageState`.
- `src/daemon/mail.ts`: `acceptMail(directory, from, target, text): { id }`.
- `src/control/dispatch.ts`: `deliverControl` pushes for a `bridge` adapter; throws
  `BridgeDetachedError` (live, no link) or `AgentGoneError` (gone).

## You own exactly these files

- `src/daemon/orchd.ts`
- `test/daemon-rpc.test.ts`

Touch nothing else. P2-3 (same phase) adds `bridgeAttached: boolean` to `StatusRow`; you
fill it in `fleetStatus`. P2-4 reads your `dispatch` result; P2-7 calls your `message` RPC.

## The task

1. `deliverWrite`: the payload is a `BridgeMessage` — narrow with `isBridgeMessage`; a row
   that fails it, or whose action is `answer` / `model` (those never queue), is malformed:
   log `dispatch.malformed` and return `"gone"` so the outbox settles it `undeliverable`.
   Map `dispatch → run`, `steer → steer`. Delete the comment that names `ack.jsonl`.
2. `acceptWrite` → rename `acceptTextWrite(directory, action, params, id)`. After
   `deliverOutboxMessage`, read `outboxMessageState(directory, id)`:
   - `undeliverable` → throw `write ${id}: agent ${target} is gone`.
   - `pending` → the agent is live with no link. Log `dispatch.queued { reason: "bridge-detached" }`
     and return. The drain retries on `daemon.outbox_drain_ms`; `redeliverOpenRows` fires on
     attach. Do not throw.
   - `awaiting` → pushed, ack pending. Return.
   - `delivered` → log `dispatch.delivered`. Return.
   Delete the `outboxMessageUnsent` branch and its import if nothing else uses it.
3. `dispatch` RPC waits for the ack exactly as `steer` does: wrap `acceptTextWrite` in
   `confirmDelivery(id, timeouts.dispatch_ack_ms, …)` and return `{accepted: true, id, ack}`.
   One function serves both handlers; they differ by the action word only.
4. `message` RPC: params `{ from, target, text }`. `acceptMail(directory, from, target,
   text)` → then the same deliver-and-wait the text writes use, keyed on the returned id.
   Returns `{ accepted: true, id, ack }`. No `governWrite` (README decision).
5. `attach` handler: `({ key }) => ({ attached: true, open: selectOpenOutboxForTarget(directory, key).length })`.
   `startRpcServer` options gain
   `onBridgeAttached: (key) => void redeliverOpenRows(directory, key, outboxDeps()).catch(log)`.
6. `ack` handler: keep `markOutboxDelivered` + `acknowledgeDelivery`; add
   `decisionLogger(directory).forCorrelation(id).info("dispatch.acked", { target })` when a
   row exists (`selectOutboxMessage`), `debug` when it does not (an `answer`/`model` push).
7. `fleetStatus`: decorate each row with `bridgeAttached: bridgeAttached(row.key)` beside
   the lease payload.
8. Idle shutdown: `idleShutdownDue` input `subscribers` → `connections`, fed with
   `server.subscriberCount() + server.attachedBridgeCount()`. Rename the field everywhere in
   this file.
9. `answer` and `set-model` handlers: unchanged in shape. The `not-asking` boundary answer
   throws to the caller like every other boundary answer already does.

## `test/daemon-rpc.test.ts`

Extend, following the file's existing patterns: `dispatch` returns `ack: "acknowledged"`
when a fake link acks (call the `ack` RPC from the test after the push arrives) and
`ack: "unavailable"` when nothing acks within a short `dispatch_ack_ms` written into the temp
settings; a dispatch to a live agent with no link returns accepted with the row `pending`;
`message` refuses across the space wall and never consults the lease (a target leased by a
live foreign holder still receives mail); `attach` answers `{attached, open}` and triggers
`redeliverOpenRows` (the pending row is pushed to the fake link); `status` rows carry
`bridgeAttached`.

## Done means

`bun check` on your files (paste it; a `bridgeAttached` type error that only P2-3 clears
is named). `bun test test/daemon-rpc.test.ts` green (paste it). Report every RPC method and
result shape you added or changed.
