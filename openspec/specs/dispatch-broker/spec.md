# dispatch-broker Specification

## Purpose
TBD - created by archiving change orchd-central-broker. Update Purpose after archive.
## Requirements
### Requirement: Writes are brokered through the daemon

Every state-changing orch command — `orch dispatch`, `orch run`, `orch steer`, `orch model`, and `orch work` — SHALL perform its effect by calling orchd over its control socket, not by contacting a backend or writing agent files directly from the CLI. The daemon SHALL execute the underlying effect only after the write passes governance checks, and it SHALL apply steer and model effects through the single control dispatcher — resolving the target's recorded adapter and backend and routing on declared capabilities — rather than importing a concrete adapter or appending an agent's native inbox file directly.

#### Scenario: Dispatch routes through the daemon

- **WHEN** `orch dispatch <target> "<prompt>"` runs while orchd is running
- **THEN** the daemon performs the backend send and the command exits 0, and no direct CLI→backend send occurs

#### Scenario: Steer routes through the dispatcher, not a hardcoded adapter

- **WHEN** `orch steer <target> "<text>"` runs while orchd is running, for a target of any supported adapter
- **THEN** the daemon applies the steer through the control dispatcher for that target's adapter, and there is no code path in the daemon that imports a concrete adapter or appends an agent inbox file directly

#### Scenario: No direct-path bypass exists

- **WHEN** any of `dispatch`, `run`, `steer`, `model`, `work` is invoked
- **THEN** the effect is applied only via the daemon socket, and there is no code path that sends to a backend or appends an agent inbox file directly from the CLI

### Requirement: Writes refuse when the daemon is absent

When orchd is not running, a write command SHALL exit nonzero with a message naming the daemon and the command to start it (`orch daemon start`), and SHALL NOT fall back to a direct herdr/file write.

#### Scenario: Dispatch with daemon down

- **WHEN** `orch dispatch <target> "<prompt>"` runs and orchd is not running
- **THEN** the command exits nonzero, prints a message telling the operator to run `orch daemon start`, and the target agent receives nothing

#### Scenario: Reads still work with daemon down

- **WHEN** `orch status` or `orch events` runs and orchd is not running
- **THEN** the command still succeeds using the presence-file protocol, confirming only writes require the broker

