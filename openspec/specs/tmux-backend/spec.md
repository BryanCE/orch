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

### Requirement: Tmux fleet inventory reports only orch panes
The tmux backend SHALL enumerate only orch-spawned panes for fleet listing, and SHALL report each pane's workspace as its tmux session, its group as its tmux window, its display name from the pane's orch name (falling back to the pane title), its agent kind where recorded at spawn, and whether it is focused. Panes the user created SHALL NOT appear in orch fleet output.

#### Scenario: Inventory lists only orch panes inside tmux
- **WHEN** the user is inside a tmux session that holds two orch-spawned agents plus panes they opened themselves, and runs `orch list`
- **THEN** only the two orch agents are listed, each showing its tmux session as workspace and its tmux window as group, and the user's own panes are absent

#### Scenario: Status shows the session, window, and name for a tmux agent
- **WHEN** the user runs `orch status` for a tmux agent
- **THEN** the output identifies the agent by its tmux session workspace, its tmux window, and the display name assigned to its pane

#### Scenario: Close-all closes orch tmux panes and spares the user's
- **WHEN** the user is inside a tmux session holding two orch-spawned agents plus panes they opened themselves, and runs `orch close --all`
- **THEN** the two orch panes are closed — matched by cross-referencing the tmux inventory against the spawn registry — and the user's own panes remain open

### Requirement: Tmux agent status from the presence protocol
The tmux backend SHALL source each agent's status from the presence protocol keyed by the pane's orch presence key, since tmux reports no native agent status, and SHALL surface that status in fleet listing and SHALL support blocking until a target reaches a requested status or a timeout elapses.

#### Scenario: Fleet listing shows a working tmux agent
- **WHEN** a tmux agent is mid-task and the user runs `orch list`
- **THEN** that agent is reported as `working`, matching the state written to its presence `status.json`

#### Scenario: Wait resolves when a tmux agent settles
- **WHEN** the user runs `orch wait <tmux-agent>` and the agent transitions to `done` before the timeout
- **THEN** the command exits zero once the presence status reports `done`

#### Scenario: Wait times out without a status change
- **WHEN** the user runs `orch wait <tmux-agent>` and the requested status is never reported before the timeout
- **THEN** the command exits non-zero

### Requirement: Tmux screen read
The tmux backend SHALL return the last visible lines of an orch pane's screen and SHALL surface a failure to the caller rather than an empty result.

#### Scenario: Peek shows recent tmux pane output
- **WHEN** the user runs `orch peek <tmux-agent>`
- **THEN** the recent visible lines captured from that pane are printed

#### Scenario: Read of an unreadable pane fails
- **WHEN** the user runs `orch read <tmux-agent>` for a pane that can no longer be captured
- **THEN** the command exits non-zero rather than printing empty output

### Requirement: Tmux agent and pane renaming
The tmux backend SHALL rename the display name shown for an orch agent and SHALL rename the pane border title as two distinct operations.

#### Scenario: Rename updates the tmux agent display name
- **WHEN** the user runs `orch rename <tmux-agent> reviewer`
- **THEN** subsequent `orch list` output shows the agent's display name as `reviewer`

### Requirement: Tmux group creation
The tmux backend SHALL create a new tmux window in a target session and report the new group together with its root pane so orch can place agents into it. Creation SHALL surface a failure to the caller (the operation returns the group-and-root-pane result or raises an error) rather than reporting a false success, and the backend's spawn path SHALL be able to place a subsequently spawned agent into that created group.

#### Scenario: A new tmux window is created for a group
- **WHEN** orch creates a group in a tmux session to host a set of agents
- **THEN** a new tmux window exists in that session and `orch workspaces` reports the session containing the newly created group

#### Scenario: An agent is placed into a created group
- **WHEN** orch creates a group in a tmux session and then spawns an agent targeting that group
- **THEN** the agent appears as a pane inside the created group's window rather than in a new separate window

#### Scenario: Group creation failure is surfaced
- **WHEN** orch attempts to create a group in a tmux session and tmux cannot create the window
- **THEN** the failure is raised to the caller rather than reported as a successful empty group

### Requirement: Tmux group and workspace enumeration is orch-scoped
The tmux backend SHALL report as groups only tmux windows that contain at least one orch pane, and as workspaces only tmux sessions that contain at least one orch pane, so orch fleet views show the orch fleet and never the user's unrelated windows or sessions. A reported tmux workspace SHALL carry a null workspace number, since tmux sessions have no stable orch workspace numbering; the fleet view keys off the session name.

#### Scenario: Workspaces list excludes user-only sessions
- **WHEN** the user has one tmux session holding orch agents and another holding only their own work, and runs `orch workspaces`
- **THEN** only the session holding orch agents is reported

### Requirement: Tmux cross-session dispatch uses the shared workspace wall
The tmux backend SHALL enforce cross-session isolation through the shared workspace-wall policy, treating each tmux session as the agent's workspace, so a steer or dispatch to an agent in another tmux session SHALL be refused unless `--cross-workspace` is supplied.

#### Scenario: Cross-session steer is refused without the override
- **WHEN** an orch agent in tmux session `alpha` runs `orch steer <agent-in-session-beta> "..."` without `--cross-workspace`
- **THEN** the command exits non-zero with a workspace-wall message and no text is delivered to the target

#### Scenario: Cross-session steer is allowed with the override
- **WHEN** the same steer is retried with `--cross-workspace`
- **THEN** the text is delivered to the target in session `beta`

