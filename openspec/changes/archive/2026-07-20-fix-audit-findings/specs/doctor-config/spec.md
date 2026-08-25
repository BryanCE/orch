# doctor-config — delta

## MODIFIED Requirements

### Requirement: Config file
orch SHALL read `$ORCH_DIR/settings.json` (JSON) at startup when present, with precedence: CLI flags > `ORCH_*` environment variables > settings file > built-in defaults. The file SHALL carry a numeric `schemaVersion` matching orch's one current schema. Supported keys SHALL be `runtime` (one of `node`, `deno`, `bun` — the JS runtime the install executes under, a required key with no default), `defaults` (`adapter`, `backend`, `model`, `allowed_models`, `spawn_cap`, `worktree`, `worker_peer_tools`), `installed` (`adapters`, `backends` — each an array of provider ids), `queue.max_retries`, `notify` (array), `hosts.<name>` (`dest`, `orch_dir`, `timeout_ms`), and `workspaces.<id>`. On every load orch SHALL validate loudly: an unknown key, a wrong value type, an unknown adapter/backend id, or a `schemaVersion` that is missing or not current SHALL produce a clear error naming the file path and the offending key/reason (not a stack trace) and exit non-zero. A `settings.json` that is absent while a legacy `$ORCH_DIR/config.toml` is present SHALL be an error directing the user to re-run `orch setup`; when both files are absent orch SHALL use built-in defaults silently. orch SHALL NOT read, migrate, or fall back to `config.toml`, and SHALL NOT accept a `hosts.<name>.ssh` alias.

#### Scenario: Config default is used
- **WHEN** `settings.json` sets `defaults.adapter` to `"claude"` and the user runs `orch spawn 2` with no `--agent` flag
- **THEN** the fleet spawns Claude Code agents

#### Scenario: Runtime key is a recognized key
- **WHEN** `settings.json` sets a top-level `runtime` to `"node"`, `"deno"`, or `"bun"` with the current `schemaVersion`
- **THEN** orch loads the effective settings and runs the command without treating `runtime` as an unknown key

#### Scenario: Flag beats config
- **WHEN** the same `settings.json` is present and the user passes `--agent pi`
- **THEN** pi agents spawn

#### Scenario: Valid settings load
- **WHEN** `settings.json` contains the current `schemaVersion` with only known keys and correct types
- **THEN** orch loads the effective settings and runs the command without any config error

#### Scenario: Unknown key is rejected
- **WHEN** `settings.json` contains a key not in the schema (for example `defaults.harness`)
- **THEN** orch exits non-zero naming `settings.json` and the offending key `defaults.harness`, and suggests `orch doctor`

#### Scenario: Wrong value type is rejected
- **WHEN** `settings.json` sets `defaults.spawn_cap` to a string instead of a number
- **THEN** orch exits non-zero naming `settings.json`, the key `defaults.spawn_cap`, the expected type, and what was found

#### Scenario: Unknown adapter id is rejected
- **WHEN** `settings.json` sets `defaults.adapter` to an id orch does not recognize
- **THEN** orch exits non-zero naming `settings.json`, `defaults.adapter`, and lists the supported adapter ids

#### Scenario: Wrong schema version is rejected
- **WHEN** `settings.json` is present with a `schemaVersion` that is missing or not orch's current version
- **THEN** orch exits non-zero naming `settings.json` and directs the user to re-run `orch setup`

#### Scenario: Legacy config.toml is an error
- **WHEN** `$ORCH_DIR/config.toml` exists and `$ORCH_DIR/settings.json` does not
- **THEN** orch exits non-zero explaining settings now live in `settings.json` and directs the user to re-run `orch setup`, and does not read the `config.toml` values

#### Scenario: Legacy ssh alias is rejected
- **WHEN** a `hosts.<name>` entry in `settings.json` uses the key `ssh` instead of `dest`
- **THEN** orch exits non-zero treating `ssh` as an unknown key under that host

#### Scenario: No config is fine
- **WHEN** neither `settings.json` nor `config.toml` exists
- **THEN** orch runs on built-in defaults with no config error

#### Scenario: Broken config fails helpfully
- **WHEN** settings.json contains a syntax or schema error
- **THEN** orch exits 1 naming the file and the problem, and suggests `orch doctor`

## ADDED Requirements

### Requirement: Doctor warns when the running daemon's code is stale against the installed CLI

A running `orchd` whose code hash no longer matches the installed daemon entrypoint means the CLI and the resident daemon disagree about the schema they exchange (the observed CLI↔daemon skew where a newer CLI requires the `runtime` key an older running daemon rejects). `orch doctor` SHALL report this as a WARNING naming `orch daemon reload` as the remediation, not a FAIL, and the warning SHALL NOT by itself make doctor exit non-zero.

#### Scenario: Stale daemon code is a reload warning
- **WHEN** `orchd` is running under a code hash that differs from the installed daemon entrypoint and `orch doctor` runs
- **THEN** the orchd-code check reports a warning naming the lock and disk hashes and directing the user to run `orch daemon reload`, and doctor's exit code is unaffected by it

### Requirement: Doctor separates broken installs from situational context

`orch doctor` SHALL reserve FAIL for conditions where the installation itself is broken (missing integration, stale daemon code, invalid config, runtime mismatch). A condition that merely reflects where the command was run — a session-scoped backend reporting `insideSession = false` while its binary is available and another installed backend is usable — SHALL be reported as a warning naming the situational cause, not a failure. Doctor's exit code SHALL be non-zero only when a genuine failure is present.

#### Scenario: Outside a herdr session is a warning, not a failure

- **WHEN** herdr is installed and available, the command runs from a shell that is not inside a herdr session, headless is also installed, and `orch doctor` runs
- **THEN** the backend-capability row reports a warning naming the absent session (with the hint to open a herdr workspace), the check is not a FAIL, and doctor's exit code is unaffected by it

#### Scenario: A genuinely unavailable backend still fails

- **WHEN** an installed backend's binary is absent from PATH and `orch doctor` runs
- **THEN** that backend's check is a FAIL with the install fix, and the exit code is non-zero
