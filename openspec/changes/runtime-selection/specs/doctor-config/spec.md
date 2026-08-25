# doctor-config Delta

## ADDED Requirements

### Requirement: Runtime doctor check

`orch doctor` SHALL report a check with the id `runtime` on every installation, comparing the runtime **declared** in `$ORCH_DIR/settings.json` against the runtime **actually executing** the running `orch` process. The check SHALL determine the executing runtime from the executable that is running orch, not from a shebang alone, so that an entrypoint resolving outside the installed package is still detected.

The verdict SHALL be:

- the declared runtime and the executing runtime agreeing — status `ok`, for every runtime, with no warning attached to any particular choice;
- the declared runtime and the executing runtime differing — status `fail` in either direction, with a detail naming both runtimes and both remedies (rebuild the entrypoint, or re-record the declaration);
- the resolved `orch` entrypoint's shebang naming a runtime other than the declared one — status `fail`, even when the doctor process itself happens to be executing under the declared runtime;
- the declared runtime not present on PATH — status `fail`, naming the declared runtime and that it was not found on PATH;
- executing under a runtime orch does not recognize — status `warn`, naming the observed executable.

The check SHALL NOT report `ok` in any case where the observed runtime is unrecognized or differs from the declared runtime. The shebang of the `orch` entrypoint resolved on PATH SHALL be reported as a secondary signal within the same `runtime` check when it names a runtime other than the declared one; that condition SHALL be at least a `warn` and SHALL name the resolved entrypoint path. `orch doctor` SHALL exit non-zero whenever the `runtime` check fails.

#### Scenario: Declared node running under node is ok

- **WHEN** `settings.json` declares `"runtime": "node"`, the running `orch` process is executing under node, and the user runs `orch doctor`
- **THEN** the report shows a `runtime` check with status `ok` and the exit code is 0 if no other check fails

#### Scenario: Declared node running under bun fails and names the fix

- **WHEN** `settings.json` declares `"runtime": "node"`, the running `orch` process is executing under bun, and the user runs `orch doctor`
- **THEN** the report shows a `runtime` check with status `fail` whose detail names both `node` as declared and `bun` as observed and names `bun run build:dev` as the fix, and the exit code is non-zero

#### Scenario: Declared bun running under bun is clean

- **WHEN** `settings.json` declares `"runtime": "bun"`, the running `orch` process is executing under bun, and the user runs `orch doctor`
- **THEN** the report shows the `runtime` check as `ok`
- **AND** no warning is attached on the grounds that the declared runtime is bun

#### Scenario: Mismatch fails in the bun-declared direction too

- **WHEN** `settings.json` declares `"runtime": "bun"` and the running `orch` process is executing under node
- **THEN** the report shows the `runtime` check as `fail`
- **AND** the detail names both remedies rather than assuming the declaration is the incorrect side

#### Scenario: Declared runtime missing from PATH fails

- **WHEN** `settings.json` declares a runtime whose binary is not present on PATH and the user runs `orch doctor`
- **THEN** the report shows a `runtime` check with status `fail` naming the declared runtime and stating it was not found on PATH, and the exit code is non-zero

#### Scenario: Unrecognized executing runtime warns, never silently passes

- **WHEN** the running `orch` process is executing under an executable whose name matches no runtime orch recognizes and the user runs `orch doctor`
- **THEN** the report shows a `runtime` check with status `warn` whose detail names the observed executable, and the check is not reported as `ok`

#### Scenario: A stale entrypoint shebang is surfaced

- **WHEN** `settings.json` declares `"runtime": "node"`, the `orch` entrypoint resolved on PATH begins with a shebang naming bun, and the user runs `orch doctor`
- **THEN** the `runtime` check reports at least a `warn` naming the resolved entrypoint path and the shebang runtime it declares, and does not report `ok`

### Requirement: Doctor checks assert only what they verified

A check reported by `orch doctor` SHALL NOT be given the status `ok` for an artifact whose existence it did not confirm. When a check's detail text names a file or directory path as evidence of health, that path's existence SHALL have been confirmed on disk before the check is reported. A check whose named artifact is absent SHALL be reported as `fail` (or `warn` where the artifact is optional), naming the missing path and the command that restores it, and SHALL NOT be reported as current, installed, or up to date. This rule SHALL apply uniformly to every adapter integration, shim, bundle, and hook check, with no per-provider exemption.

#### Scenario: A named-but-missing shim is not reported current

- **WHEN** an installed adapter's integration check would describe its shim as current by naming the shim file path, and that file does not exist on disk, and `orch doctor` runs
- **THEN** the check is reported as failing, names the missing path, names the command that reinstalls it, and the exit code is non-zero

#### Scenario: A verified artifact may be reported ok

- **WHEN** an installed adapter's integration check names a shim path in its detail and that file exists on disk with current contents, and `orch doctor` runs
- **THEN** the check is reported `ok` with the verified path in its detail

#### Scenario: The rule holds for every provider

- **WHEN** the installed adapter set contains more than one adapter and each adapter's integration check names a path in its detail, and one of those paths is absent while `orch doctor` runs
- **THEN** only the check whose artifact was confirmed present is reported `ok`, the check whose artifact is absent is reported as failing, and no provider is exempted from the existence check

## MODIFIED Requirements

### Requirement: Config file
orch SHALL read `$ORCH_DIR/settings.json` (JSON) at startup when present, with precedence: CLI flags > `ORCH_*` environment variables > settings file > built-in defaults. The file SHALL carry a numeric `schemaVersion` matching orch's one current schema. Supported keys SHALL be `runtime` (one of `node`, `deno`, `bun`), `defaults` (`adapter`, `backend`, `model`, `allowed_models`, `spawn_cap`, `worktree`, `worker_peer_tools`), `installed` (`adapters`, `backends` — each an array of provider ids), `queue.max_retries`, `notify` (array), `hosts.<name>` (`dest`, `orch_dir`, `timeout_ms`), and `workspaces.<id>`. `runtime` SHALL be a **required** top-level scalar naming the single runtime this installation executes under; it SHALL NOT live under `defaults` or `installed`, and it SHALL NOT be overridable per spawn. A `settings.json` that omits `runtime` SHALL be malformed: orch SHALL produce a loud load error naming the file path and the missing `runtime` key and directing the user to re-run `orch setup`, and `orch doctor` SHALL report it as a failing check naming the same file and key. orch SHALL NOT substitute a default value for an absent `runtime` key, and SHALL NOT infer the runtime from PATH order or from the executing process. Because `runtime` is required, orch's current `schemaVersion` SHALL be a value distinct from the one that preceded this requirement, so a settings file written without `runtime` fails the schema-version check rather than loading. On every load orch SHALL validate loudly: an unknown key, a wrong value type, an unknown adapter/backend id, an unknown or missing `runtime` value, or a `schemaVersion` that is missing or not current SHALL produce a clear error naming the file path and the offending key/reason (not a stack trace) and exit non-zero. A `settings.json` that is absent while a legacy `$ORCH_DIR/config.toml` is present SHALL be an error directing the user to re-run `orch setup`. When `settings.json` is absent orch SHALL NOT operate on implicit built-in defaults: it SHALL either enter first-run setup or exit non-zero directing the user to `orch setup`. orch SHALL NOT select an adapter, a backend, or a runtime that the operator did not record. orch SHALL NOT read, migrate, or fall back to `config.toml`, and SHALL NOT accept a `hosts.<name>.ssh` alias.

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

#### Scenario: No config is not silently tolerated
- **WHEN** neither `settings.json` nor `config.toml` exists
- **THEN** orch does NOT proceed on implicit built-in defaults
- **AND** orch either enters first-run setup or exits non-zero directing the user to `orch setup`
- **AND** no adapter, backend, or runtime is selected that the operator did not record

#### Scenario: Broken config fails helpfully
- **WHEN** settings.json contains a syntax or schema error
- **THEN** orch exits 1 naming the file and the problem, and suggests `orch doctor`

#### Scenario: Missing runtime key is malformed
- **WHEN** `settings.json` is present with the current `schemaVersion` and every other required key but no top-level `runtime` key, and the user runs any command that loads config
- **THEN** orch exits non-zero naming `settings.json` and the missing `runtime` key and directing the user to re-run `orch setup`, and does not assume `node`

#### Scenario: Doctor reports a settings file lacking runtime
- **WHEN** `settings.json` omits the top-level `runtime` key and the user runs `orch doctor`
- **THEN** doctor reports a failing check naming `settings.json` and the missing `runtime` key with `orch setup` as the fix, still runs and reports the provider-neutral checks, and exits non-zero

#### Scenario: Unknown runtime value is rejected
- **WHEN** `settings.json` sets `runtime` to a value that is not `node`, `deno`, or `bun`, and the user runs any command that loads config
- **THEN** orch exits non-zero naming `settings.json`, the key `runtime`, and the supported runtime values

#### Scenario: Runtime under defaults is an unknown key
- **WHEN** `settings.json` places the runtime as `defaults.runtime` instead of a top-level `runtime` key
- **THEN** orch exits non-zero treating `defaults.runtime` as an unknown key and reporting the top-level `runtime` key as missing

#### Scenario: A settings file predating the runtime key fails on schema version
- **WHEN** `settings.json` was written by an earlier `orch setup` with the previous `schemaVersion` and no `runtime` key, and the user runs any command that loads config
- **THEN** orch exits non-zero naming `settings.json` and directing the user to re-run `orch setup`, and does not load any value from the file
