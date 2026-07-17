# tmux-backend Specification

## Purpose
TBD - created by archiving change pluggable-plexer-backends. Update Purpose after archive.
## Requirements
### Requirement: Tmux spawn and lifecycle
The tmux backend SHALL make `orch spawn --backend tmux` launch an agent in a tmux window or pane and SHALL let `orch close` and `orch list` manage and report that agent.

#### Scenario: Spawn an agent in tmux
- **WHEN** `orch spawn --backend tmux` is run inside an available tmux session
- **THEN** an agent appears in a tmux window or pane and `orch list` reports it as a tmux agent

#### Scenario: Close a tmux agent
- **WHEN** `orch close <agent>` is run for a tmux agent
- **THEN** the corresponding tmux window or pane is closed and the agent is no longer reported by `orch list`

### Requirement: Tmux layout
The tmux backend SHALL apply a tiling layout to tmux panes created for orch agents.

#### Scenario: Multiple panes are tiled
- **WHEN** two or more orch agents run in the same tmux window
- **THEN** the tmux window has a tiling layout and each agent remains visible in a distinct pane

### Requirement: Tmux capability reporting
The tmux backend SHALL report whether the tmux binary is present as `isAvailable` and whether the process is inside a tmux session as `isInsideSession`.

#### Scenario: Tmux is available inside a session
- **WHEN** tmux is installed and `$TMUX` is set
- **THEN** the backend reports `isAvailable=true` and `isInsideSession=true` through the relevant `orch` command output

#### Scenario: Tmux cannot be used outside a session
- **WHEN** `$TMUX` is unset or the tmux binary is absent
- **THEN** the backend reports the corresponding false capability and `orch spawn --backend tmux` exits non-zero

### Requirement: Tmux session identity and workspace walls
The tmux backend SHALL derive each agent's identity and workspace from its tmux session, and SHALL refuse a dispatch across tmux-session workspace walls unless an explicit override is supplied.

#### Scenario: Status shows tmux session workspace
- **WHEN** `orch status` is run for an agent in a tmux session
- **THEN** it displays the tmux backend identity and the workspace corresponding to that tmux session

#### Scenario: Cross-session dispatch is refused
- **WHEN** a dispatch targets a pane in another tmux session without an override
- **THEN** the dispatch is refused with a non-zero exit code

