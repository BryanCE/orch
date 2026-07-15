# fleet-backends Specification

## Purpose
TBD - created by archiving change make-orch-general-purpose. Update Purpose after archive.
## Requirements
### Requirement: Backend selection
orch SHALL support two fleet backends — `herdr` (agents in herdr panes, current behavior) and `headless` (agents as detached background processes) — selectable via `--backend <id>` on spawn commands and `defaults.backend` in config. The default SHALL be `herdr` when herdr is available (HERDR_ENV set or the herdr CLI responds), else `headless`.

#### Scenario: Explicit headless spawn
- **WHEN** the user runs `orch spawn 3 --backend headless --cwd ~/proj`
- **THEN** three detached agent processes start in `~/proj`, no herdr command is invoked, and their keys appear in `orch status`

#### Scenario: Automatic fallback without herdr
- **WHEN** herdr is not installed and the user runs `orch spawn 2`
- **THEN** orch spawns via the headless backend (with a note) instead of failing

### Requirement: Full fleet operation without herdr
With no herdr binary present, the observe and control surface — `status`, `events`, `questions`, `answer`, `steer` (inbox-capable adapters), `result`, `wait`, `queue`/`work`, `close` — SHALL function against headless agents through the presence protocol alone.

#### Scenario: Headless dispatch round-trip
- **WHEN** the user (on a machine without herdr) enqueues a task, a headless pi agent picks it up, and it settles
- **THEN** `orch status` showed `working` during the run and `orch result <key>` prints the final text afterward

#### Scenario: Herdr-only commands degrade clearly
- **WHEN** the user runs a pane-geometry command (e.g. `orch zoom`, `orch peek`) against a headless agent
- **THEN** orch exits 1 with a message that the command requires the herdr backend

### Requirement: Spawn registry safety invariant across backends
`spawned.jsonl` entries SHALL record backend, handle (pane id or pid), adapter, and cwd for every agent orch creates. `orch close --all` SHALL only terminate handles recorded there — herdr panes by pane close, headless agents by signalling the recorded pid after verifying it still belongs to an orch-spawned agent (presence key match) — and SHALL never touch panes, tabs, or processes orch did not create.

#### Scenario: close --all spares user processes
- **WHEN** the user has their own pi process running plus 2 orch-spawned headless agents, and runs `orch close --all`
- **THEN** only the 2 registered agents are terminated

#### Scenario: Stale pid is not blindly killed
- **WHEN** a registered headless pid has exited and the OS reused the pid for an unrelated process
- **THEN** `orch close --all` skips it (presence key mismatch) rather than signalling the unrelated process

### Requirement: Events stream is backend-agnostic
`orch events` SHALL emit state transitions for agents on any backend, from presence-dir watching alone, with identical output format.

#### Scenario: Mixed-backend event stream
- **WHEN** `orch events` is running while a herdr-pane agent and a headless agent both transition to `done`
- **THEN** both transitions are emitted in the same `<key> <name> <state>` format

