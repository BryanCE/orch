# Proposal: add-orchd-minimal

## Why

The destination has always been a daemon (`orchd`) — but we keep faking resident-process behavior inside one-shot CLIs and ad-hoc watchers: `orch events` streams, `orch work` polls, notification sinks attach per-process, config loads once and runs stale, and every orchestrator session arms its own background waiters. Each workaround adds surface the daemon must later absorb. Pulling a minimal orchd forward stops the divergence: resident behavior moves into the one place designed for it (operator order 2026-07-13; supersedes `add-live-reload`).

## What Changes

- New `orchd` daemon (one per host): owns everything long-running — the presence-watch event stream, notification sink delivery, the queue work loop, config hot-reload, and extension staleness tracking.
- Local control endpoint: newline-delimited JSON-RPC over a unix domain socket at `$ORCH_DIR/orchd.sock` (localhost-only; SSH remains the remote transport per group 9). Windows/WSL fallback: TCP on 127.0.0.1 with a port file.
- CLI integration, daemon-optional: `orch events`/`work --attach`/`status` use orchd when the socket answers, and fall back to today's direct file reads when it doesn't. **No behavior is daemon-exclusive in this change** — the file-based presence protocol stays the wire contract, orchd is a resident reader/actor on it.
- Lifecycle: `orch daemon start|stop|status|reload`, foreground `--fg` mode for supervisors, single-instance lock, self-staleness check (daemon reports when its own code predates disk — the reload-the-reloader problem is surfaced, resolved by `orch daemon reload` which re-execs).
- Subsumes `add-live-reload`: config hot-reload and extension staleness become orchd duties; `orch reload --all` = pane `/reload`s + `orch daemon reload`.

**Non-goals**: multi-tenant auth, non-SSH remote transports, web UI, task DAGs. orchd stays single-user local.

## Capabilities

### New Capabilities
- `orchd-daemon`: daemon lifecycle (start/stop/reload/status, single-instance, self-staleness), the resident event/notify/work/config subsystems, and the local JSON-RPC endpoint with file-protocol fallback.

### Modified Capabilities
<!-- notifications/task-queue requirement behavior unchanged — their resident execution moves into orchd; specs gain a "runs in orchd when present" clause via this change's delta only if verify shows requirement-level drift -->
