# spawn-limits Specification

## Purpose
TBD - created by archiving change agent-spawn-limits. Update Purpose after archive.
## Requirements
### Requirement: Settings declare agent spawn limits
`$ORCH_DIR/settings.json` SHALL accept an optional `limits` section with `maxAgents` (positive integer, machine-wide cap on concurrently live orch-spawned agents) and `workspaces` (map of workspace id → positive-integer cap for that workspace). The section is an optional field on the one live settings schema (version stays 1, no legacy acceptance); invalid values fail the load loudly naming the file and key.

#### Scenario: Valid limits load
- **WHEN** settings.json contains `"limits": { "maxAgents": 12, "workspaces": { "wD": 4 } }`
- **THEN** the settings load succeeds and consumers see both caps

#### Scenario: Invalid limit value is refused
- **WHEN** settings.json contains `"limits": { "maxAgents": 0 }` or a negative or non-integer value
- **THEN** the load fails with an error naming the file and the `limits` key

#### Scenario: Omitted limits mean unlimited
- **WHEN** settings.json has no `limits` section
- **THEN** spawns are not capped and behave exactly as before

### Requirement: Global cap bounds all workspaces at spawn time
When `limits.maxAgents` is set, a spawn request SHALL be refused (exit 1, nothing spawned) if the machine-wide count of live orch-spawned agents plus the full requested count would exceed the cap. The refusal message SHALL name the live count, the requested count, the cap, and the `limits.maxAgents` settings key. The check covers the whole request — no partial fleet is spawned.

#### Scenario: Request exceeding the global cap is refused whole
- **WHEN** `limits.maxAgents` is 6, five live orch-spawned agents exist across workspaces, and `orch spawn 2` runs
- **THEN** the command exits non-zero naming 5 live + 2 requested against cap 6 and `limits.maxAgents`, and zero agents are spawned

#### Scenario: One workspace may use the full global allotment
- **WHEN** only `limits.maxAgents` is set (no per-workspace entries) and one workspace spawns up to the cap
- **THEN** every spawn succeeds until the global cap is reached, with no per-workspace fencing

### Requirement: Workspace cap bounds its own workspace
When `limits.workspaces` has an entry for the target workspace, a spawn request into that workspace SHALL be refused (exit 1, nothing spawned) if that workspace's live orch-spawned count plus the full requested count would exceed its cap, regardless of remaining global headroom. Workspace attribution SHALL come from the identity `workspace` field, never from parsing serialized key text.

#### Scenario: Workspace cap refuses despite global headroom
- **WHEN** `limits.maxAgents` is 12, `limits.workspaces.wD` is 4, workspace wD has 3 live orch-spawned agents, and `orch spawn 2` targets wD
- **THEN** the command exits non-zero naming 3 live + 2 requested against cap 4 and `limits.workspaces.wD`, and zero agents are spawned

#### Scenario: Uncapped workspace is bounded only globally
- **WHEN** `limits.workspaces` has no entry for the target workspace
- **THEN** spawns into it are checked against `limits.maxAgents` alone

### Requirement: Only orch-spawned live agents count against limits
The live count SHALL be the cross-reference of the spawn registry with live presence (live pid), the same join the close-all path uses. Foreign panes and dead/stale records SHALL NOT count.

#### Scenario: Dead agents free capacity
- **WHEN** a registered agent's presence pid is no longer alive
- **THEN** it does not count against any limit

#### Scenario: Foreign panes never count
- **WHEN** the user has non-orch terminal panes open in a workspace
- **THEN** they do not count against any limit

### Requirement: Doctor surfaces unsatisfiable limit configurations
`orch doctor` SHALL report (report-only, no fix, non-failing) when a `limits.workspaces` entry exceeds `limits.maxAgents`, naming both keys.

#### Scenario: Workspace cap above global cap is flagged
- **WHEN** `limits.maxAgents` is 4 and `limits.workspaces.wX` is 8
- **THEN** doctor emits a warning naming `limits.workspaces.wX` and `limits.maxAgents`, and exits as it otherwise would

