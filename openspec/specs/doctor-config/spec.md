# doctor-config Specification

## Purpose
TBD - created by archiving change make-orch-general-purpose. Update Purpose after archive.
## Requirements
### Requirement: Config file
orch SHALL read `$ORCH_DIR/settings.json` (JSON) at startup, with precedence: CLI flags > `ORCH_*` environment variables > settings file > built-in defaults. The file SHALL carry numeric `schemaVersion` 1 and required `runtime` (`node`, `deno`, or `bun`). Supported keys SHALL be exactly: `installed` (`adapters`, `backends` arrays); `defaults` (`adapter`, `backend`, `model`, `worktree`); `fleet` (`spawn_cap`, `max_agents`, `workspace_caps`, `worker_peer_tools`, `cross_workspace`); `models.allowed`; `queue.max_retries`; `timeouts` (`dispatch_ack_ms`, `wait_ms`, `adapter_command_ms`, `notify_ms`); `notify` (typed entries discriminated only by `id`: `desktop`, `webhook` with an HTTP(S) `url`, `command` with a non-empty `command`, or `herdr`; each has optional `on`, whose values are only `idle`, `working`, `blocked`, `done`, `error`, `aborted`, `exited`, or `unknown`; absent `on` defaults to `blocked` and `error`); `locked_commands`; `hosts.<name>` (`dest`, `orch_dir`, `timeout_ms`); and `workspaces.<id>`. All objects SHALL reject unknown keys. On every load orch SHALL validate loudly: an unknown key, a wrong value type, an unknown adapter/backend id, or a missing or non-current `schemaVersion` SHALL produce a clear error naming the file path and offending key/reason (not a stack trace) and exit non-zero. A missing `settings.json` SHALL be a loud error directing the user to run `orch setup`, whether or not a legacy `$ORCH_DIR/config.toml` exists. orch SHALL NOT read, migrate, or fall back to `config.toml`, and SHALL NOT accept a `hosts.<name>.ssh` alias.

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

#### Scenario: Dead limits key is rejected
- **WHEN** `settings.json` contains the former top-level `limits` key
- **THEN** orch exits non-zero naming `settings.json` and rejecting `limits` as an unknown key, and directs the user to run `orch setup`

#### Scenario: Notify type discriminator is rejected
- **WHEN** a `notify` entry uses the legacy `type` key instead of an `id` discriminator
- **THEN** orch exits non-zero naming `settings.json` and rejecting `notify[].type` as an unknown key

#### Scenario: Wrong value type is rejected
- **WHEN** `settings.json` sets `fleet.spawn_cap` to a string instead of a number
- **THEN** orch exits non-zero naming `settings.json`, the key `fleet.spawn_cap`, the expected type, and what was found

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

#### Scenario: Missing settings requires setup
- **WHEN** `settings.json` does not exist
- **THEN** orch exits non-zero naming the settings file and directing the user to run `orch setup`

#### Scenario: Broken config fails helpfully
- **WHEN** settings.json contains a syntax or schema error
- **THEN** orch exits 1 naming the file and the problem, and suggests `orch doctor`

### Requirement: Doctor diagnostics

`orch doctor` SHALL derive its provider-specific checks from the **installed** adapters and backends (the installed sets recorded at setup) rather than a fixed provider list or only the active default pair. Each installed adapter SHALL self-diagnose through a single polymorphic port call (`diagnoseShim()`), so doctor selects no check by adapter identity. The provider's id IS its probe binary name (the id-is-binary invariant). It SHALL check and report, each with ok/warn/fail and an actionable fix:

- for **every installed adapter**, its binary on PATH and its integration installed and current, obtained by calling that adapter's `diagnoseShim()` — the pi extension bundle, the Claude hooks shim, or the codex notify shim, whichever the adapter declares — with no per-id branch in doctor;
- for **every installed backend**, its availability and, for a session-scoped backend, whether the command runs inside a live session;
- every provider pair still live in the fleet — for each distinct `(adapter, backend)` pair recorded among live agents, that the pair's providers remain resolvable and their integration current, the adapter side verified through the same `diagnoseShim()` call, so a mixed fleet validates each pair independently;
- the provider-neutral checks that apply to every installation: stale/malformed presence dirs, spawn-registry consistency, config/settings validity, worktree gitignore coverage, orchd health, notifier configuration, and the desktop-notification chain.

`orch doctor` SHALL NOT unconditionally require pi, unconditionally run the Claude hooks check, or gate the extension check on pi alone. A provider-specific check for a provider that is neither installed nor live in the fleet SHALL be omitted, not reported. A broken integration for an installed provider SHALL fail doctor even when that provider is not the active default. When loading the settings file throws (unknown provider id, legacy `config.toml` present, or schema-version mismatch), doctor SHALL catch the error and render it as a failing check result naming the file and reason, and SHALL still run and report the provider-neutral checks rather than aborting before any check runs. Exit code SHALL be non-zero when any check fails.

#### Scenario: Detects a missing adapter integration

- **WHEN** claude is among the installed adapters, its hooks shim is missing from the Claude settings file, and `orch doctor` runs
- **THEN** the report shows a failing (or warning) check naming the missing shim with the exact command to fix it, does not show a pi extension check unless pi is also installed, and the exit code is non-zero

#### Scenario: Detects an unlinked extension
- **WHEN** the orchestrator-bridge extension is missing from `~/.pi/agent/extensions` and `orch doctor` runs
- **THEN** the report shows a failing check with the exact command to fix it, and exit code is non-zero

#### Scenario: Flags a broken integration for an installed-but-inactive provider

- **WHEN** the installed adapter set is `{pi, claude}`, the active default adapter is `pi`, and claude's hooks shim is missing
- **THEN** doctor fails the claude integration check even though claude is not the active default, naming the missing claude shim and its fix, and the exit code is non-zero

#### Scenario: No pi noise for a non-pi installation

- **WHEN** the only installed adapter is claude and the only installed backend is tmux, and `orch doctor` runs on a machine without pi
- **THEN** the report contains no `pi` binary requirement and no pi extension row, and does not fail solely because pi is absent

#### Scenario: Validates a live mixed fleet

- **WHEN** the fleet has one live `herdr + pi` agent and one live `tmux + claude` agent and `orch doctor` runs
- **THEN** the report validates the pi extension integration for the pi pair and the claude hooks integration for the claude pair, each verified through that pair's adapter's `diagnoseShim()` and reported against its own pair, and neither pair's absence of the other's integration is a failure

#### Scenario: A declared-but-unresolvable provider is a failing check, not a crash

- **WHEN** the settings file declares an adapter or backend id that no registry resolves and `orch doctor` runs
- **THEN** doctor renders a failing check naming the settings file and the offending id, still runs and reports the provider-neutral checks, and exits non-zero without throwing before checks run

#### Scenario: Healthy system

- **WHEN** all derived checks pass
- **THEN** `orch doctor` prints all-ok and exits 0

### Requirement: Doctor safe auto-fix

`orch doctor --fix` SHALL apply only reversible, non-destructive fixes for the installed and live providers (re-install or re-link an installed adapter's integration, create missing dirs, add gitignore entries, remove presence dirs whose pid is dead, remove stale locks) and SHALL list what it changed. It SHALL NOT install an integration for a provider that is neither installed nor live in the fleet. Anything destructive or ambiguous SHALL remain report-only and unselected by default.

#### Scenario: Fix restores an installed adapter integration only

- **WHEN** `orch doctor --fix` runs with an installed adapter's integration missing and an unrelated destructive item also failing
- **THEN** the installed adapter's integration is restored, no integration is installed for a provider that is not in the installed set, and the destructive item is reported but not performed

#### Scenario: Fix relinks without touching user data

- **WHEN** `orch doctor --fix` runs with a missing extension symlink for an installed pi adapter and an unrelated failing check that would require deleting user files
- **THEN** the symlink is restored, the destructive item is reported but not performed

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

### Requirement: Doctor warns when the running daemon's code is stale against the installed CLI

A running `orchd` whose code hash no longer matches the installed daemon entrypoint means the CLI and the resident daemon disagree about the schema they exchange (the observed CLI↔daemon skew where a newer CLI requires the `runtime` key an older running daemon rejects). `orch doctor` SHALL report this as a WARNING naming `orch daemon reload` as the remediation, not a FAIL, and the warning SHALL NOT by itself make doctor exit non-zero.

#### Scenario: Stale daemon code is a reload warning
- **WHEN** `orchd` is running under a code hash that differs from the installed daemon entrypoint and `orch doctor` runs
- **THEN** the orchd-code check reports a warning naming the lock and disk hashes and directing the user to run `orch daemon reload`, and doctor's exit code is unaffected by it

### Requirement: Daemon code skew guard

When a live `orchd` lock reports a code hash different from the installed daemon entrypoint hash, orch SHALL refuse mutating commands with a non-zero exit. The refusal SHALL name both hashes and direct the user to run `orch daemon reload`. Read-only commands SHALL continue to run. `--stale-ok` SHALL override the refusal for a mutating command. An absent or dead daemon SHALL not be treated as skew: the command SHALL proceed through normal daemon auto-start, which starts a fresh daemon. `orch doctor` SHALL report live daemon skew as a warning only, naming both hashes and `orch daemon reload`; the warning SHALL not make doctor exit non-zero.

#### Scenario: Mutating command refuses daemon skew

- **WHEN** `orchd` is running under a code hash different from the installed daemon entrypoint hash and the user runs a mutating command
- **THEN** orch exits non-zero, names the live and installed hashes, and directs the user to run `orch daemon reload`

#### Scenario: Read-only command proceeds during daemon skew

- **WHEN** `orchd` is running under a code hash different from the installed daemon entrypoint hash and the user runs a read-only command
- **THEN** the command runs without the skew refusal

#### Scenario: Stale override permits mutation

- **WHEN** `orchd` is running under a code hash different from the installed daemon entrypoint hash and the user runs a mutating command with `--stale-ok`
- **THEN** orch does not refuse the command for skew and proceeds with normal command handling

#### Scenario: No running daemon is not skew

- **WHEN** no daemon is running and the user runs a mutating command
- **THEN** orch does not report skew and normal daemon auto-start starts a fresh daemon before handling the command

#### Scenario: Doctor reports skew as a warning

- **WHEN** `orchd` is running under a code hash different from the installed daemon entrypoint hash and `orch doctor` runs
- **THEN** doctor reports a warning naming both hashes and `orch daemon reload`, and exits successfully unless another check fails

### Requirement: Doctor separates broken installs from situational context

`orch doctor` SHALL reserve FAIL for conditions where the installation itself is broken (missing integration, stale daemon code, invalid config, runtime mismatch). A condition that merely reflects where the command was run — a session-scoped backend reporting `insideSession = false` while its binary is available and another installed backend is usable — SHALL be reported as a warning naming the situational cause, not a failure. Doctor's exit code SHALL be non-zero only when a genuine failure is present.

#### Scenario: Outside a herdr session is a warning, not a failure

- **WHEN** herdr is installed and available, the command runs from a shell that is not inside a herdr session, headless is also installed, and `orch doctor` runs
- **THEN** the backend-capability row reports a warning naming the absent session (with the hint to open a herdr workspace), the check is not a FAIL, and doctor's exit code is unaffected by it

#### Scenario: A genuinely unavailable backend still fails

- **WHEN** an installed backend's binary is absent from PATH and `orch doctor` runs
- **THEN** that backend's check is a FAIL with the install fix, and the exit code is non-zero

