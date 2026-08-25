# orchd-daemon Delta

## MODIFIED Requirements

### Requirement: Command behavior with orchd absent

Read-only orch commands (`orch status`, `orch result`, `orch doctor`) SHALL keep working with orchd absent via the existing file-protocol paths. `orch events` SHALL require orchd unconditionally: it SHALL subscribe to the daemon over RPC and SHALL NOT provide any file-watch mode, flag-gated or otherwise. Presence files SHALL be read as event ingress by orchd only; no client command SHALL derive state transitions from them. When the subscription is dropped by the daemon, `orch events` SHALL exit non-zero with a message naming `orch daemon start`, and SHALL NOT degrade to watching presence files. A caller-initiated shutdown of the subscription SHALL NOT be reported as a disconnect.

Write commands (`orch dispatch`, `orch run`, `orch steer`, `orch model`, `orch work`) SHALL require the broker: with orchd absent they SHALL refuse with a nonzero exit and a message to run `orch daemon start`, and SHALL NOT fall back to a direct herdr or inbox-file write. `orch doctor` SHALL report whether orchd is running, stale, or absent.

#### Scenario: Events requires the daemon

- **WHEN** orchd is not running and the user runs `orch events`
- **THEN** the command exits non-zero with a message naming `orch daemon start`, and no presence file watcher is armed

#### Scenario: No offline escape hatch

- **WHEN** the user runs `orch events --offline`
- **THEN** `--offline` is not recognized as a flag by `orch events`, and no read-only file-watch mode is entered

#### Scenario: A daemon that dies mid-stream exits rather than falling back

- **WHEN** `orch events` is streaming from a live daemon and the daemon exits
- **THEN** the subscription's close handler fires once, the command exits non-zero naming `orch daemon start`, and no transition is emitted from a presence file after the drop

#### Scenario: A clean client shutdown is not a disconnect

- **WHEN** a caller stops an event subscription itself
- **THEN** the disconnect handler does not fire

#### Scenario: Status remains file-readable without the daemon

- **WHEN** orchd is not running and the user runs `orch status --offline`
- **THEN** the command reads presence files and reports agent state, unchanged by this delta
