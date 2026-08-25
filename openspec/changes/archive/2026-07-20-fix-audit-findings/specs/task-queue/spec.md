# task-queue — delta

## ADDED Requirements

### Requirement: Every task carries its origin workspace

A task SHALL be stamped with its origin workspace at enqueue time, and enqueue SHALL reject a task whose origin workspace cannot be determined. A stored task without a workspace is malformed: it SHALL never be claimable by any work loop, and doctor SHALL surface it as reappable. A workspace-less task SHALL NOT be treated as claimable-by-anyone.

#### Scenario: Enqueue stamps the workspace

- **WHEN** the user runs `orch queue add "task"` from a backend-reported workspace
- **THEN** the stored task carries that workspace and only that workspace's work loop can claim it

#### Scenario: A malformed unscoped task is never claimed

- **WHEN** a stored task row has no workspace (malformed by the current schema) and a work loop in any workspace scans for claimable tasks
- **THEN** the task is skipped as malformed rather than dispatched, and doctor reports it as reappable
