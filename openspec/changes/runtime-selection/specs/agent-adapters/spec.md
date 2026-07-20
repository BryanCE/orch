# agent-adapters Specification

## ADDED Requirements

### Requirement: Shims run under the declared runtime, never an inferred one

No adapter SHALL infer the JS runtime its shim runs under. The pi extension shim, the Claude Code hook shim, and the codex notify shim SHALL each be installed to execute under the single runtime declared in `$ORCH_DIR/settings.json`, and `orch setup` SHALL write command strings into every host tool's configuration file that name that declared runtime. Scanning `PATH` for the first available runtime, or otherwise selecting a runtime by any means other than reading the declared setting, SHALL NOT occur. When the declared runtime is not present on `PATH`, `orch setup` SHALL fail with a non-zero exit and a message naming the declared runtime, rather than falling back to another runtime.

#### Scenario: Claude hook command names the declared runtime, not the first on PATH

- **WHEN** `$ORCH_DIR/settings.json` declares runtime `node`, both `bun` and `node` are on `PATH`, and the user runs `orch setup`
- **THEN** the hook command string written into the Claude Code settings file invokes the shim with `node`, and contains no reference to `bun`

#### Scenario: All three shims agree on the runtime

- **WHEN** `$ORCH_DIR/settings.json` declares runtime `deno` and the user runs `orch setup` with the pi, claude, and codex adapters installed
- **THEN** the pi extension entry, the Claude Code hook commands, and the codex notify command written into their respective host configuration files all invoke their shim under `deno`, with no host configuration naming a different runtime

#### Scenario: Missing declared runtime is a hard failure

- **WHEN** `$ORCH_DIR/settings.json` declares a runtime that is not present on `PATH` and the user runs `orch setup`
- **THEN** orch exits non-zero with a message naming the declared runtime, and does not write shim command strings naming a different runtime

### Requirement: The runtime-to-invocation mapping is shared across adapters

The vocabulary of allowed runtimes (`node`, `deno`, `bun`) and the mapping from a runtime to the command that invokes a JS file under it SHALL be one shared definition consumed by every adapter, not a private constant of any one adapter. Under `deno` the shim SHALL be invoked as `deno run --allow-all <shim path>`; under `node` and `bun` the shim SHALL be invoked by the bare runtime name followed by the shim path. This SHALL be identical for the pi, claude, and codex shims.

This is a deliberate, bounded narrowing of the containment rule that an adapter's private wire format lives only in that adapter. The declared runtime is not a foreign tool's wire format — it is orch's own composition setting, machine-wide and identical for every adapter, so sharing it is required rather than permitted. A foreign tool's own protocol shape — such as the JSON structure of a Claude Code hook entry, or pi's `inbox.jsonl` — remains private to its adapter and SHALL NOT be shared or relocated by this requirement.

#### Scenario: deno invocation form is identical across all three host configs

- **WHEN** the declared runtime is `deno` and `orch setup` has installed all three shims
- **THEN** each shim's command string in its host tool's configuration file begins with `deno run --allow-all` followed by that shim's path

#### Scenario: node and bun are invoked by bare name

- **WHEN** the declared runtime is `node` (or `bun`) and `orch setup` has installed all three shims
- **THEN** each shim's command string is the bare runtime name followed by the shim path, with no `run` subcommand and no permission flags

#### Scenario: Host-tool config shape stays adapter-private

- **WHEN** the declared runtime changes and `orch setup` is re-run
- **THEN** only the runtime portion of each host tool's command string changes, while the surrounding configuration structure each host tool requires — the Claude Code hook entry's JSON shape, the codex notify entry, the pi extension entry — is unchanged and continues to be produced solely by its own adapter

## MODIFIED Requirements

### Requirement: Claude Code adapter
orch SHALL ship a Claude Code adapter whose shim (hook scripts installed through the adapter's shim installation step) writes presence protocol files for session start, blocked/notification states, and final results on stop. The shim SHALL be installable without affecting the user's other Claude Code hooks. The adapter SHALL NOT select its own hook runtime; the hook command it installs SHALL name the runtime declared in `$ORCH_DIR/settings.json`. Claude presence granularity SHALL be documented honestly as coarse: `working` on session start, `blocked` on a notification, and `done`/`idle` on stop, with no mid-run tool, token, or cost transitions. Whether Claude's `settings.json` hooks fire under headless print mode (`claude -p`) SHALL be verified against the targeted Claude Code version, not assumed. If they fire, headless claude presence works as specified above. If they do NOT fire, claude result harvest SHALL fall back to `extractResult` over the recorded headless `-p` log (per the headless log-path requirement), and the see/steer capabilities SHALL surface as loud, documented gaps in `-p` mode — an explicit status such as `no presence in -p mode` and a non-zero exit on a steer attempt — never a silent `-`.

The Claude shim diagnostic reported by `orch doctor` SHALL confirm that the shim file named in its output exists on disk before reporting the shim current or healthy. Registration of the hook in the host tool's settings file SHALL NOT by itself satisfy that diagnostic. When the hook is registered but the shim file it points at is absent, the diagnostic SHALL report a failure naming the missing path and the build command that produces it, matching the existence check the codex shim diagnostic already performs.

#### Scenario: Claude agent lifecycle is visible
- **WHEN** a claude agent spawned by orch starts working on a prompt and later finishes
- **THEN** its `status.json` shows `working` during the run and `done` after, and `result.json` contains the final text

#### Scenario: Setup installs the shim additively
- **WHEN** the user runs `orch setup` with an existing Claude Code hooks configuration
- **THEN** orch's hooks are merged in without removing or overwriting unrelated user hooks

#### Scenario: Mid-run granularity is coarse, not misreported
- **WHEN** a claude agent is between session start and stop, invoking tools
- **THEN** its `status.json` state remains `working` and does not claim per-tool or per-token transitions it cannot observe

#### Scenario: Headless claude presence is verified, its gaps loud
- **WHEN** a claude agent is run headless with `claude -p`, where hook firing under print mode has been checked against the targeted version
- **THEN** if the hooks fire, its `status.json` reflects `working`/`done` as specified; and if they do not, `orch result` still returns the final text via the adapter parsing the recorded `-p` log, while a steer/see attempt reports an explicit unsupported-in-`-p` status and exits non-zero rather than showing a silent `-`

#### Scenario: Registered hook pointing at a missing shim is not reported current
- **WHEN** orch's hooks are registered in the Claude Code settings file but the shim file they invoke has not been built, and the user runs `orch doctor`
- **THEN** the Claude shim check reports a failure naming the missing shim path and the build command that produces it, and does not print that the hooks are current

#### Scenario: Claude shim check passes only with the file on disk
- **WHEN** orch's hooks are registered and the shim file they invoke exists on disk, and the user runs `orch doctor`
- **THEN** the Claude shim check reports `ok` and its detail names the path that was confirmed to exist

#### Scenario: Hook runtime comes from settings, not from PATH order
- **WHEN** `$ORCH_DIR/settings.json` declares runtime `node`, `bun` appears earlier on `PATH` than `node`, and the user runs `orch setup`
- **THEN** the Claude hook command written into the Claude Code settings file invokes the shim under `node`
