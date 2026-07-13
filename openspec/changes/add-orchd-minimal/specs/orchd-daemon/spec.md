# orchd-daemon

## ADDED Requirements

### Requirement: Daemon lifecycle

`orch daemon start|stop|status|reload` SHALL manage a single orchd instance per `$ORCH_DIR`: start acquires a lock and daemonizes (or runs foreground with `--fg`), stop terminates cleanly, status reports pid/uptime/subsystem health as JSON-capable output, and reload re-execs the daemon in place so it runs current on-disk code and config.

#### Scenario: Second start is a no-op with pointer

- **WHEN** `orch daemon start` runs while an instance holds the lock
- **THEN** it exits 0 with "already running (pid N)" and does not spawn a second instance

#### Scenario: Reload after code change

- **WHEN** src/ or config.toml changes on disk and `orch daemon reload` runs
- **THEN** the daemon re-execs with the same lock, subsystems resume, and `orch daemon status` shows the new code hash and a fresh start time

### Requirement: Resident subsystems

orchd SHALL own the resident behaviors: watch presence dirs and emit state-transition events, deliver notification sinks (outcome-first titles per the notifications spec), run the queue work loop continuously, and hot-reload config — replacing per-CLI watchers and pollers.

#### Scenario: Notifications without any CLI attached

- **WHEN** an agent flips to `blocked` while no `orch events` process runs anywhere
- **THEN** orchd delivers the configured sinks (e.g. Windows toast) within one watch interval

#### Scenario: Queue drains while operator is away

- **WHEN** tasks are queued and an agent goes idle while orchd runs
- **THEN** orchd assigns per the task-queue spec without anyone running `orch work`

### Requirement: Local control endpoint

orchd SHALL expose newline-delimited JSON-RPC on `$ORCH_DIR/orchd.sock` (unix socket; 127.0.0.1 TCP + port file where unix sockets are unavailable), serving at minimum: subscribe-events, fleet-status, enqueue, and daemon-status. The endpoint is localhost-only; remote access remains SSH (group 9).

#### Scenario: CLI prefers the daemon

- **WHEN** `orch events` starts and orchd's socket answers
- **THEN** it streams from the daemon subscription instead of arming its own file watchers

### Requirement: Daemon-optional operation

Every orch command SHALL keep working with orchd absent, via the existing file-protocol paths; daemon absence downgrades ergonomics (no resident notify/work), never correctness. `orch doctor` SHALL report whether orchd is running, stale, or absent.

#### Scenario: Socket dead mid-stream

- **WHEN** orchd is stopped while `orch events` is subscribed
- **THEN** the CLI prints one notice and falls back to direct file watching without losing transitions that occur after the switch
