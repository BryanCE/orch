# doctor-config Specification

## MODIFIED Requirements

### Requirement: Config file
orch SHALL read `$ORCH_DIR/settings.json` (JSON) at startup when present, with precedence: CLI flags > `ORCH_*` environment variables > settings file > built-in defaults. The file SHALL carry a numeric `schemaVersion` matching orch's one current schema. Supported keys SHALL be `defaults` (`adapter`, `backend`, `model`, `allowed_models`, `spawn_cap`, `worktree`, `worker_peer_tools`), `installed` (`adapters`, `backends` — each an array of provider ids), `queue.max_retries`, `notify` (array), `hosts.<name>` (`dest`, `orch_dir`, `timeout_ms`), and `workspaces.<id>`. On every load orch SHALL validate loudly: an unknown key, a wrong value type, an unknown adapter/backend id, or a `schemaVersion` that is missing or not current SHALL produce a clear error naming the file path and the offending key/reason (not a stack trace) and exit non-zero. A `settings.json` that is absent while a legacy `$ORCH_DIR/config.toml` is present SHALL be an error directing the user to re-run `orch setup`; when both files are absent orch SHALL use built-in defaults silently. orch SHALL NOT read, migrate, or fall back to `config.toml`, and SHALL NOT accept a `hosts.<name>.ssh` alias.

#### Scenario: Config default is used
- **WHEN** `settings.json` sets `defaults.adapter` to `"claude"` and the user runs `orch spawn 2` with no `--agent` flag
- **THEN** the fleet spawns Claude Code agents

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

### Requirement: Installed provider sets
orch setup SHALL support installing a SET of adapters and a SET of backends per axis, recorded in `settings.json` as `installed.adapters` and `installed.backends` (arrays of provider ids). The active provider on each axis SHALL be whichever `defaults.adapter`/`defaults.backend` names. On every load orch SHALL validate that each id in `installed.adapters`/`installed.backends` is a registry-known provider, and that a set `defaults.adapter`/`defaults.backend` is a member of the corresponding installed set; a `defaults` value that names a provider not in the installed set SHALL be a loud load error naming the offending key and listing the installed set, and exit non-zero. Switching the active provider between two installed providers SHALL be a plain `settings.json` edit that takes effect for subsequent spawns with no reinstall.

#### Scenario: Defaults naming a non-installed provider is rejected
- **WHEN** `settings.json` sets `installed.adapters` to `["pi", "claude"]` and `defaults.adapter` to `"codex"`, and the user runs any command that loads config
- **THEN** orch exits non-zero naming `settings.json` and `defaults.adapter`, and lists the installed adapters (`pi`, `claude`)

#### Scenario: Switching the active provider is a plain edit
- **WHEN** `installed.adapters` is `["pi", "claude"]` with `defaults.adapter` set to `"pi"`, and the user edits `defaults.adapter` to `"claude"` and runs `orch spawn`
- **THEN** the fleet spawns Claude Code agents with no reinstall, and the load produces no config error

### Requirement: Settings inspection
`orch settings` SHALL print the effective value of each resolvable setting together with its provenance — the winning source among flag, `ORCH_*` environment variable, `settings.json`, and built-in default — resolved by the same precedence as the commands that consume it. It SHALL support `--json`, emitting each setting as its value plus source. When a load error would occur (invalid `settings.json`, or a legacy `config.toml` present), `orch settings` SHALL surface that same loud error and exit non-zero rather than printing partial values.

#### Scenario: Provenance shows the settings file
- **WHEN** `settings.json` sets `defaults.model` and no flag or env override is set, and the user runs `orch settings`
- **THEN** the output lists `model` with its value and a source of `settings.json`

#### Scenario: Provenance shows env override
- **WHEN** `ORCH_MODEL` is exported and `settings.json` also sets `defaults.model`, and the user runs `orch settings`
- **THEN** the output lists `model` with the environment value and a source of the environment variable

#### Scenario: Provenance shows built-in default
- **WHEN** a setting is unset in `settings.json`, environment, and flags, and the user runs `orch settings`
- **THEN** the output lists that setting with the built-in default value and a source of default

#### Scenario: JSON output carries value and source
- **WHEN** the user runs `orch settings --json`
- **THEN** the output is valid JSON where each resolvable setting reports both its effective value and its source

#### Scenario: Inspection surfaces a load error
- **WHEN** `settings.json` is invalid and the user runs `orch settings`
- **THEN** orch exits non-zero with the same file-path-and-reason error a normal command would emit, and prints no settings table
