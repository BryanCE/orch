## MODIFIED Requirements

### Requirement: Filesystem-safe presence key
The system SHALL serialize each identity as a filesystem-safe key namespaced by backend, and SHALL use that key as a single flat directory segment for the agent presence directory under `~/.orch/agents/<key>/`. The key SHALL NOT introduce nested path separators; each identity part percent-escapes `~`, `%`, `:`, and `/` so the serialized key is exactly one path segment.

#### Scenario: Presence directory uses the flat serialized key
- **WHEN** an agent is spawned with identity `{backend: tmux, workspace: main, handle: %5}`
- **THEN** a presence directory exists at `~/.orch/agents/tmux~main~%255/`, one flat segment where the handle's `%` is escaped to `%25`, and no nested `~/.orch/agents/tmux/main/` path is created

#### Scenario: Backend namespaces prevent collisions
- **WHEN** agents from different backends have equal workspace and handle values
- **THEN** their presence directories use different backend-namespaced keys
