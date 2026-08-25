# orchd-daemon Specification

## MODIFIED Requirements

### Requirement: Daemon lifecycle

`orch daemon start|stop|status|reload` SHALL manage a single orchd instance per `$ORCH_DIR`: start acquires a lock and daemonizes (or runs foreground with `--fg`), stop terminates cleanly, status reports pid/uptime/subsystem health as JSON-capable output, and reload re-execs the daemon in place so it runs current on-disk code and config.

#### Scenario: Second start is a no-op with pointer

- **WHEN** `orch daemon start` runs while an instance holds the lock
- **THEN** it exits 0 with "already running (pid N)" and does not spawn a second instance

#### Scenario: Reload after code change

- **WHEN** `src/` or `$ORCH_DIR/settings.json` changes on disk and `orch daemon reload` runs
- **THEN** the daemon re-execs with the same lock, subsystems resume, and `orch daemon status` shows the new code hash and a fresh start time
