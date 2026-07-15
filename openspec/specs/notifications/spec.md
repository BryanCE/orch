# notifications Specification

## Purpose
TBD - created by archiving change make-orch-general-purpose. Update Purpose after archive.
## Requirements
### Requirement: Configurable notification sinks
Notification sinks SHALL be declared in config as `[[notify]]` entries with a `type` (`desktop`, `webhook`, `command`) and an `on` filter (subset of agent states, default `["blocked","error"]`). Multiple sinks SHALL be supported simultaneously.

#### Scenario: Webhook on error only
- **WHEN** config declares a webhook sink with `on = ["error"]` and an agent transitions to `done`
- **THEN** no webhook fires; when a later transition hits `error`, a POST is sent

### Requirement: Transitions trigger notifications
When notifications are active (`orch events --notify`, or automatically during `orch work`), each agent state transition matching a sink's filter SHALL deliver a notification containing agent key, name, state, task summary, and cost where known. Webhook and command sinks SHALL receive this as JSON.

#### Scenario: Blocked agent finds the user
- **WHEN** an agent asks a blocking question while `orch events --notify` runs with a desktop sink
- **THEN** a desktop notification appears naming the agent and the question summary

#### Scenario: Command sink receives JSON
- **WHEN** a `command` sink is configured and an agent errors
- **THEN** the configured command runs with a JSON payload on stdin including `key`, `state = "error"`, and the error text

### Requirement: WSL-compatible desktop delivery
The `desktop` sink SHALL deliver via the first working mechanism in order: herdr's notification command (inside herdr), `notify-send` (Linux desktop), or a WSL bridge to Windows toast notifications. `orch doctor` SHALL verify which tier is functional.

#### Scenario: Desktop notification from WSL
- **WHEN** orch runs under WSL2 without herdr and a desktop sink fires
- **THEN** a Windows toast notification is shown via the WSL bridge

### Requirement: Sink failures never disrupt the fleet
A sink that errors (unreachable webhook, missing binary) SHALL log a warning and be skipped; agent dispatch, steering, and the events stream SHALL be unaffected.

#### Scenario: Dead webhook, healthy fleet
- **WHEN** the configured webhook endpoint is down during a burst of transitions
- **THEN** warnings are logged, other sinks still fire, and all fleet commands behave normally

