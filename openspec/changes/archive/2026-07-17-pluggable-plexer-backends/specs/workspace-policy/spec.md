# workspace-policy Specification

## MODIFIED Requirements
### Requirement: All workspace walls use one shared policy
All workspace identity, scoping, and wall decisions SHALL use the shared workspace policy primitive and the `workspace` field reported by the selected backend's structured identity `{backend, workspace, handle}`. Policy code MUST NOT parse a herdr `ws:pane` string or any plexer-specific handle format. Writes targeting a different workspace SHALL be refused unless the explicit `--cross-workspace` override is enabled and permitted by configuration; same-workspace operations SHALL remain allowed. The wall SHALL apply uniformly to herdr, tmux, and headless backends.

#### Scenario: Cross-workspace write is refused
- **WHEN** a command attempts to write to a target in a different backend-reported workspace without `--cross-workspace`
- **THEN** the write is refused with a workspace-boundary reason

#### Scenario: Explicit cross-workspace write is allowed
- **WHEN** a command attempts to write across backend-reported workspaces with `--cross-workspace` and the configured override permits it
- **THEN** the shared policy allows the write

#### Scenario: Same-workspace write remains allowed
- **WHEN** a command writes to a target in the caller's backend-reported workspace
- **THEN** the shared policy allows the write without a cross-workspace override

#### Scenario: Wall is uniform across backends
- **WHEN** the user performs the same cross-workspace write through herdr, tmux, and headless fleets
- **THEN** each backend applies the same refusal or explicitly permitted override based on its reported `workspace` field

### Requirement: Work loops remain within their origin workspace
The work loop SHALL scope task selection and dispatch to the backend-reported workspace from which it originated, and SHALL not select or write to agents in another backend-reported workspace unless the explicit cross-workspace policy override applies. It MUST NOT derive that workspace by parsing a plexer-specific key or handle string.

#### Scenario: Work loop refuses a foreign workspace target
- **WHEN** a work loop originating in one backend-reported workspace encounters a task or target belonging to another workspace without the cross-workspace override
- **THEN** it excludes or refuses that task or target and continues within its origin workspace

## ADDED Requirements
### Requirement: Backend identity supplies workspace
The selected backend SHALL report a structured identity containing `backend`, `workspace`, and `handle`, and orch SHALL derive the caller workspace and workspace wall from its `workspace` field for every supported backend.

#### Scenario: Structured identity drives status and policy
- **WHEN** the user runs `orch status --json` for agents on herdr, tmux, or headless
- **THEN** each agent includes a backend-reported workspace, and subsequent wall decisions use that field rather than parsing the displayed key
