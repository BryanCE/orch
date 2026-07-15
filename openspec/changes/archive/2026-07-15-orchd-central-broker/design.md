## Context

orch's control plane grew daemonless: the CLI writes agent state to files and dispatches directly to herdr; orchd was added later only to watch presence and auto-assign the queue. It sits beside the write path, so nothing is brokered — any caller can dispatch/steer/model any agent, the work-loop crosses workspaces, and `orch events` arms per-CLI file-watchers (which degrade to polling on WSL `/mnt`). This design routes every write through orchd over its socket, makes the daemon the one place governance and delivery live, and replaces client-side watching with server push — while preserving the presence-dir jsonl protocol as the durable, human-visible truth channel. Constraints: TypeScript on Bun, node built-ins + `bun:sqlite` only (zero new runtime deps); herdr stays at the process boundary (MIT vs AGPL wall); primary environment is Windows/WSL2 (unix socket with 127.0.0.1 TCP fallback).

## Goals / Non-Goals

**Goals:**
- One broker: all of `dispatch`/`run`/`steer`/`model`/`work` flow through orchd; governance (ownership + workspace wall) enforced there.
- Socket-push live events; retire per-CLI file-watchers/polling.
- Durable, at-least-once messaging that survives a daemon restart; reconnect replay via sequence numbers.
- Protocol semantics independent of unix-socket specifics, so a network transport can be added later without touching call sites.

**Non-Goals:**
- Cross-machine transport (TCP/TLS, auth, SSH tunnel) — only the seams, not the implementation.
- Workspace-provider abstraction (tmux/headless/directory-as-workspace) — separate follow-up; broker uses today's herdr-derived identity.
- External event bus (Redis/NATS).
- Forcing an external DB — `bun:sqlite` only.

## Decisions

### Decision 1: No silent read fallback — auto-start the daemon instead
**Choice:** The daemon is on whenever orch is in use. **Every** orch command (read or write) auto-starts orchd if it is absent (idempotent; second-start is a no-op), so reads and writes always share one path through the daemon; the session tears the daemon down when it ends. There is no "pure-file until a daemon happens to be up" branch. The presence-dir jsonl protocol remains the daemon's durable store and crash-replay source, **not** a client-facing fallback. A genuine "daemon won't start" case is served only by an explicit, read-only `orch status --offline` escape hatch. Writes never go offline.

**Why over the alternatives:**
- *Keep silent automatic fallback (status/events read files when daemon down):* rejected as the primary form — silent dual paths are exactly what let write-bypass and uncoordinated watchers happen; the file-view and daemon-view can diverge. The mess was caused by *silent automatic* fallback + client-side watchers, not by reading a file per se.
- *Reads hard-require the daemon with no escape at all:* rejected — you would go blind precisely when the daemon crashes, unable to diagnose. Auto-start makes "down" transient; `--offline` covers the rare "won't start" case for diagnosis only.
- Auto-start keeps a single code path (clean) while remaining self-healing and never leaving the operator blind.

### Decision 2: Transport = newline-delimited JSON-RPC over a unix socket, transport-neutral
**Choice:** Serve NDJSON-RPC on `$ORCH_DIR/orchd.sock` (127.0.0.1 TCP + port file where unix sockets are unavailable, e.g. Windows). Method semantics carry no socket-specific assumptions (no fd passing, no peer-cred gating in the method layer), so the same surface can later be bound to an authenticated network transport. Methods: `subscribe`, `fleet-status`, `enqueue`, `daemon-status`, `dispatch`, `steer`, `set-model`, `ack`.
**Why:** unix sockets give push + near-zero idle cost and a localhost trust boundary now; keeping semantics transport-neutral is the whole down payment on the cross-machine goal without paying for it yet. Alternative (bespoke binary protocol) rejected: NDJSON is debuggable and already used by the CLI/herdr boundary.

### Decision 3: Durable store = `bun:sqlite` (WAL) for state, jsonl for logs
**Choice:** SQLite (WAL mode) holds queue, ownership registry, the delivery outbox, and the spawn registry — concurrent, queryable, crash-safe. jsonl keeps results/transitions/transcripts as the append-only durable + human-visible log and replay source.
**Why:** SQLite gives ACID + concurrent writers that flat files race on, with zero install (built into Bun). jsonl stays because it is the language-neutral, greppable truth other AI tools rely on and the presence contract mandates. Alternative (all-files with lockfiles) rejected: concurrent queue/ownership updates need real transactions.

### Decision 4: At-least-once delivery via a transactional outbox + ack
**Choice:** A steer/dispatch is written to the SQLite outbox in the same transaction that accepts it, then sent; the row is marked delivered only when the agent's bridge posts an `ack` (over the socket, or by writing an ack marker the daemon consumes). Undelivered rows are retried with backoff and survive restart. Delivery is idempotent per message id so a retried-then-acked message applies once.
**Why:** the outbox pattern is the standard way to not lose messages across crashes without a broker like Kafka. Alternative (fire-and-forget append to inbox.jsonl, today's behavior) rejected: a message sent while the agent is briefly offline is lost.

### Decision 5: Ownership recorded at spawn, enforced at every write, `--steal` to override
**Choice:** spawn records the controlling orchestrator as the agent's owner in SQLite; the broker refuses a write from a non-owner unless `--steal` (which reassigns owner). The workspace wall reuses one shared policy primitive across all write methods; the work-loop only assigns a task within its origin workspace.
**Why:** puts the three governance rules (ownership, wall, scoped assign) in one enforcement point that cannot be bypassed, since writes now have only the brokered path.

## Risks / Trade-offs

- **Auto-start races** (two commands start orchd at once) → the start path acquires the lock and the loser observes "already running (pid N)" and proceeds; second-start is a no-op by spec.
- **Daemon becomes a hard dependency for writes** → mitigated by auto-start + a fast, well-tested start path; `orch doctor` reports daemon health; `--offline` gives a read-only diagnostic view.
- **SQLite over a `/mnt` (Windows) path can be slow / lock oddly** → keep `$ORCH_DIR` on the Linux filesystem for WSL; WAL reduces lock contention; the store is small (queue/ownership/outbox), not hot-path bulk data.
- **bridge ack adds a round-trip** → acks are cheap and batched; delivery does not block the CLI (the CLI returns once the daemon has durably accepted the message).
- **Replay log growth** → cap the persisted event window (ring by sequence number / age); older history lives in jsonl for forensic reads, not replay.

## Migration Plan

1. **Additive**: build the broker methods (`dispatch`/`steer`/`set-model`/`ack`) and the SQLite store inside orchd behind the existing socket; daemon can serve them while the CLI still uses direct paths. No behavior change yet.
2. **Flip reads**: `events`/`status` prefer the socket subscription; add auto-start; keep the file read only under an explicit `--offline` flag.
3. **Flip writes**: `dispatch`/`run`/`steer`/`model`/`work` become RPC clients; on daemon-absent they auto-start, then call. Remove the direct CLI→herdr and CLI→inbox write code paths (no compat shim).
4. **Enforce**: turn on ownership + wall checks in the broker; scope the work-loop to origin workspace.
5. **Rollback**: since steps are staged, revert is per-step; the daemon-absent `--offline` read path remains available throughout for diagnosis.

## Open Questions

- **Ack channel**: does the bridge ack over a socket client connection (agent dials the daemon) or by writing an ack marker the daemon watches? Socket is cleaner and fits the push model but adds an outbound connection from each agent; the marker reuses the file protocol. Leaning socket, with the marker as the transport-neutral fallback.
- **`--steal` audit**: should a steal notify the prior owner (e.g., a toast) so takeovers are visible? Probably yes via the notify sinks.
