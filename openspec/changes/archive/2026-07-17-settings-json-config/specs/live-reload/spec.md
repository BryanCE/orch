# live-reload Specification

## MODIFIED Requirements

### Requirement: Config hot-reload in long-running commands

`orch events` and `orch work` SHALL detect changes to `$ORCH_DIR/settings.json` while running and re-apply the affected settings — notification sinks for `events --notify`, and `defaults` plus `queue.max_retries` for `work` — before their next iteration, without process restart.

#### Scenario: Sink added while events is streaming

- **WHEN** a `notify` sink is appended to `settings.json` while `orch events --notify` runs
- **THEN** the next qualifying state transition is delivered to the new sink, and a one-line notice ("config reloaded") is printed to stderr

#### Scenario: Invalid config edit does not kill the stream

- **WHEN** `settings.json` is saved in a transiently invalid state (mid-edit, so the JSON does not parse)
- **THEN** the running command keeps its last-good config, prints one warning, and retries on the next change event
