# dispatch-governance Specification

## Purpose
TBD - created by archiving change orchd-central-broker. Update Purpose after archive.
## Requirements
### Requirement: Agent ownership is recorded and enforced

Each agent SHALL record the orchestrator that spawned it as its owner. A write targeting an agent owned by a different orchestrator SHALL be refused with a nonzero exit and a message naming the current owner, unless the caller passes `--steal`, which reassigns ownership to the caller and proceeds.

#### Scenario: Foreign write is refused

- **WHEN** orchestrator A spawned an agent and orchestrator B runs `orch dispatch <that-agent> "..."` without `--steal`
- **THEN** the command exits nonzero and names orchestrator A as the current owner, and the agent is not dispatched

#### Scenario: Steal reassigns ownership

- **WHEN** orchestrator B runs `orch dispatch <that-agent> "..." --steal`
- **THEN** the dispatch proceeds, exit 0, and the agent's recorded owner becomes orchestrator B

### Requirement: Writes respect the workspace wall

A write whose target is in a different workspace than the caller SHALL be refused unless the caller passes `--cross-workspace`. The wall check SHALL use the same policy primitive for every write command.

#### Scenario: Cross-workspace dispatch is refused by default

- **WHEN** a caller in workspace wD runs `orch dispatch <agent-in-wC> "..."` without `--cross-workspace`
- **THEN** the command exits nonzero with a workspace-wall message and the wC agent receives nothing

#### Scenario: Explicit override crosses the wall

- **WHEN** the same caller adds `--cross-workspace`
- **THEN** the dispatch proceeds and exits 0

### Requirement: The work-loop assigns within a task's origin workspace

Each queued task SHALL carry the workspace it was enqueued from, and the daemon work-loop SHALL only assign a task to an idle agent in that same workspace.

#### Scenario: Queued task does not cross workspaces

- **WHEN** a task is enqueued from workspace wC and the only idle agents are in workspace wD
- **THEN** the work-loop leaves the task unassigned rather than dispatching it to a wD agent

