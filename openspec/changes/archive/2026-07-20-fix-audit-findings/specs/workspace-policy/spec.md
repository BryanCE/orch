# workspace-policy — delta

## ADDED Requirements

### Requirement: Every agent-directed write verb passes the daemon-side wall

Every verb that writes to an agent — steer, answer, model, broadcast, pipe delivery, and work-loop dispatch — SHALL pass the daemon's write governance (workspace wall plus ownership check) before any adapter or backend mechanism is invoked. No CLI code path SHALL reach an agent write while skipping governance. Client-side target scoping is a convenience, not the enforcement point.

#### Scenario: Answer is wall-checked like steer

- **WHEN** an orchestrator in workspace A runs `orch answer <workspace-B-target> "yes"` without the cross-workspace override
- **THEN** the daemon refuses the write with a workspace-boundary reason, no answer file is written, and the refusal is identical in kind to a refused cross-workspace steer

#### Scenario: Ownership applies to every write verb

- **WHEN** an agent is owned by another orchestrator and a non-owner runs any write verb (`steer`, `answer`, `model`) against it without stealing ownership
- **THEN** the daemon refuses the write naming the owning orchestrator
