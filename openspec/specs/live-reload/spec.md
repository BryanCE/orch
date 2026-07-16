# live-reload Specification

## Purpose
Keep long-running orch watchers and pane extensions current as config or extension code changes, without restarting the fleet.
## Requirements
### Requirement: Config hot-reload in long-running commands

`orch events` and `orch work` SHALL detect changes to `$ORCH_DIR/settings.json` while running and re-apply the affected settings — notification sinks for `events --notify`, and `defaults` plus `queue.max_retries` for `work` — before their next iteration, without process restart.

#### Scenario: Sink added while events is streaming

- **WHEN** a `notify` sink is appended to settings.json while `orch events --notify` runs
- **THEN** the next qualifying state transition is delivered to the new sink, and a one-line notice ("config reloaded") is printed to stderr

#### Scenario: Invalid config edit does not kill the stream

- **WHEN** settings.json is saved in a transiently invalid state (mid-edit)
- **THEN** the running command keeps its last-good config, prints one warning, and retries on the next change event

### Requirement: One-command fleet reload

`orch reload [--all | <target>...]` SHALL reload pane extensions in place (existing behavior) AND signal orch-side long-running processes to re-read config, so a single command brings the whole fleet — panes and watchers — onto what is currently on disk.

#### Scenario: Reload after orch setup

- **WHEN** `orch setup` updates extension symlinks and the operator runs `orch reload --all`
- **THEN** every registry pane executes an in-place `/reload`, every live orch watcher re-reads config, and the command reports each item as reloaded or failed, outcome-first

### Requirement: Staleness detection for loaded extensions

The bridge SHALL record the loaded extension file's content hash in presence status.json at load time; `orch doctor` SHALL compare it against the on-disk file and report stale panes; `orch status` SHALL mark stale panes visibly.

#### Scenario: Pane running code older than disk

- **WHEN** an extension file changes on disk after a pane loaded it
- **THEN** `orch doctor` lists the pane with a "stale extension — run: orch reload <pane>" failure, and `orch status` marks the pane stale

