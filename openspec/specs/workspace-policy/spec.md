# workspace-policy Specification

## Purpose
Enforce shared workspace scoping and write walls across workers, commands, and queue work loops.
## Requirements
### Requirement: Worker peer tools are opt-in
Worker processes SHALL default to `worker_peer_tools = false`, receiving `orch_ask` but not peer discovery or peer messaging tools (`orch_agents`, `orch_send`, or `orch_read`). Those peer tools SHALL be granted only when the setting is explicitly enabled.

#### Scenario: Default worker cannot access peers
- **WHEN** a worker is spawned with `worker_peer_tools` unset or set to `false`
- **THEN** its toolset includes `orch_ask` and excludes `orch_agents`, `orch_send`, and `orch_read`

#### Scenario: Peer tools can be explicitly enabled
- **WHEN** a worker is spawned with `worker_peer_tools = true`
- **THEN** its toolset includes the configured peer discovery and messaging tools

### Requirement: All workspace walls use one shared policy
All workspace identity, scoping, and wall decisions SHALL use the shared workspace policy primitive. Writes targeting a different workspace SHALL be refused unless the explicit `--cross-workspace` override is enabled and permitted by configuration; same-workspace operations SHALL remain allowed.

#### Scenario: Cross-workspace write is refused
- **WHEN** a command attempts to write to a target in a different workspace without `--cross-workspace`
- **THEN** the write is refused with a workspace-boundary reason

#### Scenario: Explicit cross-workspace write is allowed
- **WHEN** a command attempts to write across workspaces with `--cross-workspace` and the configured override permits it
- **THEN** the shared policy allows the write

#### Scenario: Same-workspace write remains allowed
- **WHEN** a command writes to a target in the caller's workspace
- **THEN** the shared policy allows the write without a cross-workspace override

### Requirement: Work loops remain within their origin workspace
The work loop SHALL scope task selection and dispatch to the workspace from which it originated, and SHALL not select or write to agents in another workspace unless the explicit cross-workspace policy override applies.

#### Scenario: Work loop refuses a foreign workspace target
- **WHEN** a work loop originating in one workspace encounters a task or target belonging to another workspace without the cross-workspace override
- **THEN** it excludes or refuses that task or target and continues within its origin workspace

