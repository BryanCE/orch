## MODIFIED Requirements

### Requirement: Daemon-optional operation

Read-only orch commands (`orch status`, `orch events`, `orch result`, `orch doctor`) SHALL keep working with orchd absent, via the existing file-protocol paths; daemon absence downgrades their ergonomics (no resident notify, socket push replaced by file-watch), never their correctness. Write commands (`orch dispatch`, `orch run`, `orch steer`, `orch model`, `orch work`) SHALL require the broker: with orchd absent they SHALL refuse with a nonzero exit and a message to run `orch daemon start`, and SHALL NOT fall back to a direct herdr or inbox-file write. `orch doctor` SHALL report whether orchd is running, stale, or absent.

#### Scenario: Socket dead mid-stream

- **WHEN** orchd is stopped while `orch events` is subscribed
- **THEN** the CLI prints one notice and falls back to direct file watching without losing transitions that occur after the switch

#### Scenario: Write refuses without the broker

- **WHEN** orchd is absent and `orch dispatch <target> "..."` runs
- **THEN** the command exits nonzero, tells the operator to run `orch daemon start`, and performs no direct-path write

### Requirement: Local control endpoint

orchd SHALL expose newline-delimited JSON-RPC on `$ORCH_DIR/orchd.sock` (unix socket; 127.0.0.1 TCP + port file where unix sockets are unavailable), serving at minimum: subscribe-events, fleet-status, enqueue, daemon-status, and the write methods dispatch, steer, set-model, and ack. The RPC method semantics SHALL NOT depend on unix-socket specifics, so the same surface can later be served over an authenticated network transport. The endpoint is localhost-only; remote access remains SSH (group 9).

#### Scenario: CLI prefers the daemon

- **WHEN** `orch events` starts and orchd's socket answers
- **THEN** it streams from the daemon subscription instead of arming its own file watchers

#### Scenario: Writes are served over the socket

- **WHEN** `orch dispatch <target> "..."` runs against a live daemon
- **THEN** the CLI issues a dispatch RPC over the socket and the daemon executes the send, with no direct CLI→herdr call
