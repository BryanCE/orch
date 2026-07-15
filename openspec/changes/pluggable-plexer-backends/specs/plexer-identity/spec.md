## ADDED Requirements

### Requirement: Backend-owned structured identity
A plexer backend SHALL mint one stable identity containing `backend`, `workspace`, and `handle` for every spawned agent.

#### Scenario: Spawned agent has a namespaced identity
- **WHEN** an agent is spawned through a configured plexer backend
- **THEN** `orch status` displays an identity containing the backend, workspace, and handle for that agent

#### Scenario: Identity remains stable during listing
- **WHEN** `orch list` is run after an agent has been spawned
- **THEN** the agent is shown with the same backend, workspace, and handle identity reported by `orch status`

### Requirement: Filesystem-safe presence key
The system SHALL serialize each identity as a filesystem-safe key namespaced by backend, and SHALL use that key for the agent presence directory under `~/.orch/agents/<key>/`.

#### Scenario: Presence directory uses the serialized key
- **WHEN** an agent is spawned with identity `{backend: tmux, workspace: main, handle: %5}`
- **THEN** a presence directory exists at `~/.orch/agents/tmux/main/%5/` using the backend-namespaced serialized identity

#### Scenario: Backend namespaces prevent collisions
- **WHEN** agents from different backends have equal workspace and handle values
- **THEN** their presence directories use different backend-namespaced keys

### Requirement: Spawn-time identity propagation
The plexer SHALL mint the identity key at spawn and pass it to the agent process through an orch-provided opaque environment variable.

#### Scenario: Agent receives the orch identity key
- **WHEN** an agent is spawned
- **THEN** the agent process receives the minted presence key through an orch-provided environment variable

#### Scenario: Plexer-specific environment is not required
- **WHEN** an agent is spawned outside herdr
- **THEN** its identity and presence directory are created without reading `HERDR_PANE_ID`

### Requirement: Workspace is an explicit identity field
The system SHALL use the identity's `workspace` field for workspace display and wall checks rather than parsing the serialized key.

#### Scenario: Status displays the reported workspace
- **WHEN** `orch status` is run for an agent
- **THEN** it displays the workspace reported in that agent's structured identity

#### Scenario: Wall check uses workspace identity
- **WHEN** a dispatch targets an agent whose identity workspace differs from the dispatch workspace
- **THEN** the dispatch is refused by the workspace wall
