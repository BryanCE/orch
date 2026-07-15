## ADDED Requirements

### Requirement: Writes are brokered through the daemon

Every state-changing orch command — `orch dispatch`, `orch run`, `orch steer`, `orch model`, and `orch work` — SHALL perform its effect by calling orchd over its control socket, not by contacting herdr or writing agent inbox files directly. The daemon SHALL execute the underlying Backend action only after the write passes governance checks.

#### Scenario: Dispatch routes through the daemon

- **WHEN** `orch dispatch <target> "<prompt>"` runs while orchd is running
- **THEN** the daemon performs the herdr send and the command exits 0, and no direct CLI→herdr send occurs

#### Scenario: No direct-path bypass exists

- **WHEN** any of `dispatch`, `run`, `steer`, `model`, `work` is invoked
- **THEN** the effect is applied only via the daemon socket, and there is no code path that sends to herdr or appends an agent inbox file directly from the CLI

### Requirement: Writes refuse when the daemon is absent

When orchd is not running, a write command SHALL exit nonzero with a message naming the daemon and the command to start it (`orch daemon start`), and SHALL NOT fall back to a direct herdr/file write.

#### Scenario: Dispatch with daemon down

- **WHEN** `orch dispatch <target> "<prompt>"` runs and orchd is not running
- **THEN** the command exits nonzero, prints a message telling the operator to run `orch daemon start`, and the target agent receives nothing

#### Scenario: Reads still work with daemon down

- **WHEN** `orch status` or `orch events` runs and orchd is not running
- **THEN** the command still succeeds using the presence-file protocol, confirming only writes require the broker
