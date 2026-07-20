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
All workspace identity, scoping, and wall decisions SHALL use the shared workspace policy primitive and the `workspace` field reported by the selected backend's structured identity `{backend, workspace, handle}`. Policy code MUST NOT parse a herdr `ws:pane` string or any plexer-specific handle format. Writes targeting a different workspace SHALL be refused unless the explicit `--cross-workspace` override is enabled and permitted by the `fleet.cross_workspace` configuration key; same-workspace operations SHALL remain allowed. `fleet.cross_workspace` is the sole configuration key that permits cross-workspace writes. The wall SHALL apply uniformly to herdr, tmux, and headless backends.

#### Scenario: Cross-workspace write is refused
- **WHEN** a command attempts to write to a target in a different backend-reported workspace without `--cross-workspace`
- **THEN** the write is refused with a workspace-boundary reason

#### Scenario: Explicit cross-workspace write is allowed
- **WHEN** a command attempts to write across backend-reported workspaces with `--cross-workspace` and `fleet.cross_workspace` is `true`
- **THEN** the shared policy allows the write

#### Scenario: Same-workspace write remains allowed
- **WHEN** a command writes to a target in the caller's backend-reported workspace
- **THEN** the shared policy allows the write without a cross-workspace override

#### Scenario: Wall is uniform across backends
- **WHEN** the user performs the same cross-workspace write through herdr, tmux, and headless fleets
- **THEN** each backend applies the same refusal or explicitly permitted override based on its reported `workspace` field

### Requirement: Work loops remain within their origin workspace
The work loop SHALL scope task selection and dispatch to the backend-reported workspace from which it originated, and SHALL not select or write to agents in another backend-reported workspace unless `fleet.cross_workspace` is true and the explicit cross-workspace policy override applies. It MUST NOT derive that workspace by parsing a plexer-specific key or handle string.

#### Scenario: Work loop refuses a foreign workspace target
- **WHEN** a work loop originating in one backend-reported workspace encounters a task or target belonging to another workspace without the cross-workspace override
- **THEN** it excludes or refuses that task or target and continues within its origin workspace

### Requirement: Backend identity supplies workspace
The selected backend SHALL report a structured identity containing `backend`, `workspace`, and `handle`, and orch SHALL derive the caller workspace and workspace wall from its `workspace` field for every supported backend.

#### Scenario: Structured identity drives status and policy
- **WHEN** the user runs `orch status --json` for agents on herdr, tmux, or headless
- **THEN** each agent includes a backend-reported workspace, and subsequent wall decisions use that field rather than parsing the displayed key

### Requirement: Every agent-directed write verb passes the daemon-side wall

Every verb that writes to an agent — steer, answer, model, broadcast, pipe delivery, and work-loop dispatch — SHALL pass the daemon's write governance (workspace wall plus ownership check) before any adapter or backend mechanism is invoked. No CLI code path SHALL reach an agent write while skipping governance. Client-side target scoping is a convenience, not the enforcement point.

#### Scenario: Answer is wall-checked like steer

- **WHEN** an orchestrator in workspace A runs `orch answer <workspace-B-target> "yes"` without the cross-workspace override
- **THEN** the daemon refuses the write with a workspace-boundary reason, no answer file is written, and the refusal is identical in kind to a refused cross-workspace steer

#### Scenario: Ownership applies to every write verb

- **WHEN** an agent is owned by another orchestrator and a non-owner runs any write verb (`steer`, `answer`, `model`) against it without stealing ownership
- **THEN** the daemon refuses the write naming the owning orchestrator

### Requirement: Fleet operations are ownership-scoped
The orchestrator SHALL derive its owner token from `ORCH_OWNER`, falling back to `HERDR_PANE_ID`, or remain ownerless when neither is set. A spawn record SHALL stamp that token as its optional `owner` field. Bulk lifecycle operations (`close`, `reset`, `reload`, and `restart` with `--all`) and `broadcast` SHALL act only on records whose owner equals the caller token; an absent owner matches an absent caller token. An explicit single-agent target owned by another orchestrator SHALL fail closed and name the owner, unless `--force` is supplied.

#### Scenario: Bulk operation skips foreign-owned agents
- **WHEN** an orchestrator runs a bulk lifecycle operation or `broadcast --all`
- **THEN** it acts only on agents whose `owner` matches the caller token and leaves foreign-owned agents untouched

#### Scenario: Foreign explicit target fails naming owner
- **WHEN** an orchestrator explicitly targets an agent owned by another orchestrator without `--force`
- **THEN** the operation fails closed and its error names the owning token

#### Scenario: Force overrides the ownership wall
- **WHEN** an orchestrator explicitly targets an agent owned by another orchestrator with `--force`
- **THEN** the operation is allowed to act on that agent

#### Scenario: Absent-owner legacy record matches absent-token caller
- **WHEN** an agent record has no `owner` field and the caller has no owner token
- **THEN** ownership scoping treats the record as owned by that caller for bulk and explicit operations

