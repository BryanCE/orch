## 1. Durable store (bun:sqlite)

- [x] 1.1 Add a `bun:sqlite` (WAL) store module under `src/store/` with tables: `queue`, `ownership`, `outbox`, `spawned`; open per `$ORCH_DIR`, create-if-absent, atomic migrations.
- [x] 1.2 Port the queue and spawn registry off jsonl-only to the SQLite tables; keep jsonl result/transition logs untouched (durable + visible).
- [x] 1.3 Add an `origin_workspace` column to `queue`; populate it on `orch queue add`.
- [x] 1.4 Guard `$ORCH_DIR` on WSL to the Linux filesystem (doctor warning if it resolves under `/mnt`).

## 2. Broker RPC surface (additive — no CLI behavior change yet)

- [x] 2.1 Extend the orchd NDJSON-RPC server with methods `dispatch`, `steer`, `set-model`, `ack` alongside existing `subscribe`/`fleet-status`/`enqueue`/`daemon-status`.
- [x] 2.2 Keep RPC method semantics transport-neutral (no fd passing, no peer-cred logic inside methods) so a network transport can bind later.
- [x] 2.3 Implement broker handlers that execute the Backend action (herdr send / model set) server-side.
- [x] 2.4 Add a connection manager: per-client subscriptions, monotonic event sequence numbers, and a capped persisted event window for replay.

## 3. At-least-once delivery

- [x] 3.1 Write accepted steers/dispatches to the `outbox` in the same transaction that accepts them (message id, target, payload, state).
- [x] 3.2 Mark a message delivered only on `ack`; retry undelivered rows with backoff; make delivery idempotent per message id.
- [x] 3.3 On daemon start, re-scan the outbox and resume delivery of unacked messages.
- [x] 3.4 Bridge: post an `ack` when a steer/dispatch is consumed (socket ack primary; presence-file ack marker as transport-neutral fallback).

## 4. Flip reads to the socket (auto-start, no silent fallback)

- [x] 4.1 `orch events` subscribes over the socket and streams pushed events; present last-seen sequence number on reconnect to replay the gap.
- [x] 4.2 Add daemon auto-start: any command needing orchd starts it if absent (idempotent; second-start is a no-op).
- [x] 4.3 Replace the automatic file-watch fallback with an explicit read-only `orch status --offline` (and `--offline` for `events`) diagnostic path; no silent fallback remains.
- [x] 4.4 Retire per-CLI file-watchers/pollers; the daemon's single presence aggregator is the only watcher.

## 5. Flip writes through the broker (remove direct path)

- [x] 5.1 Make `orch dispatch`/`run`/`steer`/`model`/`work` issue RPC to the daemon (auto-start first); return once the daemon has durably accepted the message.
- [x] 5.2 Remove the direct CLI→herdr send and CLI→inbox-append write code paths entirely (no compat shim).
- [x] 5.3 With orchd genuinely unavailable, writes exit nonzero naming `orch daemon start`; never write directly.

## 6. Governance enforcement

- [x] 6.1 Record the controlling orchestrator as `owner` at spawn; store in `ownership`.
- [x] 6.2 Broker refuses a write from a non-owner unless `--steal`; `--steal` reassigns owner (and notifies the prior owner via sinks).
- [x] 6.3 Apply the shared workspace-wall primitive to every write method; refuse cross-workspace unless `--cross-workspace`.
- [x] 6.4 Scope the work-loop to each task's `origin_workspace`; never assign across workspaces.

## 7. Verification

- [x] 7.1 Tests: writes refuse with daemon down; reads succeed via `--offline`; dispatch routes only through the socket (no direct herdr call).
- [x] 7.2 Tests: message survives daemon restart (outbox replay); reconnect replays exactly the missed events with no dup.
- [x] 7.3 Tests: foreign-owner write refused then `--steal` succeeds; cross-workspace write refused; work-loop stays in origin workspace.
- [x] 7.4 Cross-platform: full suite green on Linux and Windows (unix socket + 127.0.0.1 TCP fallback path both exercised).
- [x] 7.5 `openspec validate` the change; update `unify-workspace-policy` to narrow it to the wall primitives the broker calls.
