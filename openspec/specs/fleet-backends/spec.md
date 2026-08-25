# fleet-backends Specification

## Purpose
TBD - created by archiving change make-orch-general-purpose. Update Purpose after archive.
## Requirements
### Requirement: Backend selection
orch SHALL support registered fleet backends — including `herdr`, `headless`, and `tmux` — selectable via `--backend <id>` on spawn commands and `[defaults] backend = "<id>"` in config. The backend factory SHALL resolve the configured or explicit id through the registry, and call sites MUST NOT hard-code per-backend branching. The selected backend SHALL be the identity authority: it MUST mint each agent handle, report the agent's workspace, and probe `isAvailable` and `isInsideSession`. The backend port SHALL be agent-agnostic and MUST NOT reference `pi`, `claude`, or `codex`.

#### Scenario: Configured tmux backend
- **WHEN** the user sets `[defaults] backend = "tmux"` and runs `orch spawn 2 --cwd ~/proj`
- **THEN** orch selects the registered tmux backend through the factory, the backend mints handles and reports workspaces for both agents, and no call site-specific backend branch is required

#### Scenario: Explicit headless spawn
- **WHEN** the user runs `orch spawn 3 --backend headless --cwd ~/proj`
- **THEN** three detached agent processes start in `~/proj`, no herdr command is invoked, and their keys appear in `orch status`

#### Scenario: Explicit unavailable backend
- **WHEN** the user runs `orch spawn 1 --backend tmux` and the tmux backend reports `isAvailable = false`
- **THEN** orch exits non-zero with a message that the tmux backend is unavailable

#### Scenario: Automatic fallback without herdr
- **WHEN** herdr is not installed and the user runs `orch spawn 2` with no backend configured
- **THEN** orch selects the registered headless backend after its capability probes instead of failing

#### Scenario: Backend port is agent-agnostic
- **WHEN** the user runs `orch spawn 1 --backend tmux --agent claude`
- **THEN** the backend handles only fleet placement and identity, while the selected agent adapter handles Claude Code without the backend port naming or branching on `claude`

### Requirement: Full fleet operation without herdr
With no herdr binary present, the observe and control surface — `status`, `events`, `questions`, `answer`, `steer` (inbox-capable adapters), `result`, `wait`, `queue`/`work`, `close` — SHALL function against headless agents through the presence protocol alone.

#### Scenario: Headless dispatch round-trip
- **WHEN** the user (on a machine without herdr) enqueues a task, a headless pi agent picks it up, and it settles
- **THEN** `orch status` showed `working` during the run and `orch result <key>` prints the final text afterward

#### Scenario: Herdr-only commands degrade clearly
- **WHEN** the user runs a pane-geometry command (e.g. `orch zoom`, `orch peek`) against a headless agent
- **THEN** orch exits 1 with a message that the command requires the herdr backend

### Requirement: Spawn registry safety invariant across backends
`spawned.jsonl` entries SHALL record the selected backend, its minted handle, the agent adapter, and cwd for every agent orch creates. Each presence key SHALL use the backend identity `{backend, workspace, handle}`. `orch close --all` SHALL only terminate handles recorded there — herdr panes by pane close, tmux panes by tmux close, and headless agents by signalling the recorded pid after verifying it still belongs to an orch-spawned agent (presence key match) — and SHALL never touch panes, tabs, or processes orch did not create.

#### Scenario: close --all spares user processes
- **WHEN** the user has their own pi process running plus 2 orch-spawned headless agents, and runs `orch close --all`
- **THEN** only the 2 registered agents are terminated

#### Scenario: Stale pid is not blindly killed
- **WHEN** a registered headless pid has exited and the OS reused the pid for an unrelated process
- **THEN** `orch close --all` skips it (presence key mismatch) rather than signalling the unrelated process

#### Scenario: Backend identity is persisted
- **WHEN** the user runs `orch spawn 1 --backend tmux --cwd ~/proj` and then `orch status --json`
- **THEN** the registry and status identify the agent with a filesystem-safe backend-namespaced key containing the backend, reported workspace, and minted handle

### Requirement: Events stream is backend-agnostic
`orch events` SHALL emit state transitions for agents on any backend, from presence-dir watching alone, with identical output format.

#### Scenario: Mixed-backend event stream
- **WHEN** `orch events` is running while a herdr-pane agent and a headless agent both transition to `done`
- **THEN** both transitions are emitted in the same `<key> <name> <state>` format

### Requirement: Backend capability probes
Each registered backend SHALL expose availability and current-session probes through the backend port, and orch MUST use those probes before selecting an implicit backend or starting a spawn.

#### Scenario: Current session is required
- **WHEN** the configured backend reports `isAvailable = true` but `isInsideSession = false` for a session-bound spawn
- **THEN** orch exits non-zero with an actionable message naming the missing backend session

### Requirement: Implicit tmux selection inside a live tmux session
When no backend is selected via `--backend` or `defaults.backend`, orch SHALL select the tmux backend when tmux is available and the process is inside a live tmux session, choosing it after the herdr-inside-session probe and before the headless fallback. Selection SHALL rely on the backend's own availability and current-session probes, not on hard-coded per-backend branching at the call site.

#### Scenario: Inside tmux with no configured backend
- **WHEN** the user is inside a live tmux session, herdr is not the current session, and runs `orch spawn 2 --cwd ~/proj` with no backend configured
- **THEN** orch selects the tmux backend and the two agents appear as panes in the tmux session

#### Scenario: Outside any session falls back to headless
- **WHEN** the user is not inside herdr or tmux and runs `orch spawn 2` with no backend configured
- **THEN** orch selects the headless backend instead of tmux

### Requirement: Session-scoped backend validation fails fast
When a backend is selected via `--backend` or `defaults.backend`, orch SHALL verify at validation time that the backend reports itself inside a live session, and SHALL exit non-zero with an actionable message naming the missing session when it does not — before any spawn is attempted. A backend that has no session concept SHALL always pass this check.

#### Scenario: Configured tmux outside a session fails at validation
- **WHEN** the user sets `defaults.backend = "tmux"` (or passes `--backend tmux`) and runs `orch spawn 1` from outside any tmux session
- **THEN** orch exits non-zero with a message that a tmux session is required, and no pane is created

#### Scenario: Headless is never rejected for lack of a session
- **WHEN** the user runs `orch spawn 1 --backend headless` from outside any multiplexer session
- **THEN** validation passes and the headless agent starts

#### Scenario: Configured herdr outside a herdr session fails at validation
- **WHEN** the user sets `defaults.backend = "herdr"` (or passes `--backend herdr`) and runs `orch spawn 1` from outside any herdr session
- **THEN** orch exits non-zero at validation with a message that a herdr session is required, and no pane is created — the uniform session check applies to every session-scoped backend, not only tmux

### Requirement: The backend port reports workspace display names

The backend port SHALL expose a workspace-name surface returning a mapping from workspace id to human display name for the workspaces the backend can enumerate. A backend with no name concept (headless) SHALL return an empty mapping. Consumers (CLI status, web server) SHALL resolve display names only through this port surface — never by importing a concrete backend module — and SHALL fall back to the workspace id when no name is returned.

#### Scenario: Herdr names resolve through the port

- **WHEN** the herdr backend is active with named workspaces and a consumer (web fleet view or `orch status`) renders workspace labels
- **THEN** the labels come from the backend port's workspace-name surface, and the consumer contains no herdr-specific import

#### Scenario: A nameless backend falls back to ids

- **WHEN** the headless backend is active and a consumer renders workspace labels
- **THEN** the port returns an empty mapping and the consumer displays workspace ids without error

