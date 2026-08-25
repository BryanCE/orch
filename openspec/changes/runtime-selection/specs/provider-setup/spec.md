## ADDED Requirements

### Requirement: Setup selects the JS runtime as a third axis

`orch setup` SHALL present a runtime selection step alongside the adapter and backend steps, offering exactly the values `node`, `deno`, and `bun`. Setup SHALL pre-select `node` and SHALL record `node` when the operator accepts the presented step without choosing another value. Selecting `bun` SHALL require an explicit, deliberate choice by the operator, and setup SHALL state at the point of selection that bun is a build tool only and is unsupported as the runtime of a published install. Selecting `deno` SHALL likewise be permitted, and setup SHALL label `deno` as UNVERIFIED at the point of selection, because orch does not assert that its harness integrations work under deno. Setup SHALL NOT infer the runtime from what is first on PATH, from the runtime `orch` itself is executing under, or from any adapter's private list; the recorded runtime SHALL be the operator's selection. A value outside `node`/`deno`/`bun` SHALL be rejected and SHALL NOT be recorded.

#### Scenario: Accepting the default records node

- **WHEN** the operator runs `orch setup` and accepts the runtime step without choosing another value
- **THEN** `node` is presented as the pre-selected value, `orch setup` exits 0, and `$ORCH_DIR/settings.json` records the runtime as `node`

#### Scenario: Choosing bun records it without disparagement

- **WHEN** the operator runs `orch setup` and explicitly selects `bun` at the runtime step
- **THEN** setup records the runtime as `bun` and does not state that bun is unsupported
- **AND** `node` remains the pre-selected value, so `bun` is reached only by an explicit choice rather than by accepting the default

#### Scenario: Choosing deno is labelled unverified

- **WHEN** the operator runs `orch setup` and selects `deno` at the runtime step
- **THEN** setup labels `deno` as UNVERIFIED at that step before the choice is taken, and records the runtime as `deno`

#### Scenario: Runtime is not inferred from PATH

- **WHEN** the operator runs `orch setup` on a machine where `bun` resolves ahead of `node` on PATH and the operator accepts the pre-selected runtime
- **THEN** the recorded runtime is `node`, not `bun`, because the value comes from the selection and not from PATH order

#### Scenario: An unknown runtime value is rejected

- **WHEN** `orch setup` is given a runtime value that is not `node`, `deno`, or `bun`
- **THEN** setup reports the value as invalid, names the three permitted values, exits non-zero, and does not write a runtime value into `$ORCH_DIR/settings.json`

### Requirement: The selected runtime is a top-level scalar in the settings file

`orch setup` SHALL persist the selected runtime to `$ORCH_DIR/settings.json` as a single top-level key named `runtime` whose value is one of the three permitted strings. The runtime SHALL NOT be written as a member of the per-spawn defaults, because it is not a per-spawn choice and no single spawn may override it; and it SHALL NOT be written as an installed set with a chosen member, because an installation executes under exactly one runtime rather than several at once. Every completed `orch setup` run SHALL leave the `runtime` key present; a settings file lacking it SHALL be reported by `orch doctor` as malformed with `orch setup` named as the fix, and orch SHALL NOT substitute a value for the absent key.

#### Scenario: Runtime is written at the top level, not under defaults

- **WHEN** the operator completes `orch setup` selecting `node` as the runtime
- **THEN** `$ORCH_DIR/settings.json` contains a top-level `runtime` key with the string value `node`, and contains no runtime key inside the per-spawn defaults and no installed-runtimes set

#### Scenario: Settings without a runtime key are malformed

- **WHEN** `orch doctor` runs against a `$ORCH_DIR/settings.json` that has no top-level `runtime` key
- **THEN** doctor reports the settings file as malformed, names `orch setup` as the fix, exits non-zero, and does not proceed as though a runtime had been selected

## MODIFIED Requirements

### Requirement: Setup records the active default per axis

After installing every selected provider, `orch setup` SHALL record, for each **set-valued** axis — adapters and backends — both the installed set and a single **active default** chosen from that installed set. The active default is the provider used when a later command omits `--agent`/`--backend`; the installed set is every provider whose integration is installed and can be spawned. Setup SHALL persist both to the settings file (whose installed-sets shape and writer are owned by the settings capability). When only one provider is selected on an axis, it SHALL be recorded as both the sole installed member and the active default without a redundant prompt. This requirement SHALL NOT extend to the runtime axis: the runtime is a scalar machine-level fact with neither an installed set nor a per-spawn default, and setup SHALL NOT record an installed-runtimes set or a default runtime alongside the adapter and backend defaults.

#### Scenario: Active default is chosen from the installed set

- **WHEN** the operator selects `pi` and `claude` as adapters and picks `pi` as the active default adapter
- **THEN** setup records the installed adapter set as `{pi, claude}` and the active default adapter as `pi`, and a subsequent spawn without `--agent` uses pi

#### Scenario: Switching the active default installs nothing

- **WHEN** an installation already has `pi` and `claude` installed with `pi` active, and the operator switches the active default adapter to `claude` (by editing the settings file or re-running setup with `claude` as the default)
- **THEN** the active default becomes `claude`, no adapter integration is installed or re-installed, both shims remain present, and setup (if re-run) reports the integrations as already current and exits 0

#### Scenario: The runtime axis gets no set and no default

- **WHEN** the operator completes `orch setup` selecting adapters, backends, and a runtime
- **THEN** the settings file records an installed set and an active default for adapters and for backends, and records the runtime only as a single top-level scalar with no installed-runtimes set and no default-runtime entry

#### Scenario: A spawn cannot override the runtime

- **WHEN** a later command spawns an agent while the settings file declares a runtime
- **THEN** the declared runtime applies to that spawn, and there is no per-spawn flag or defaults entry by which a spawn selects a different runtime

### Requirement: Re-running setup re-pairs idempotently and additively

Re-running `orch setup` SHALL be the whole re-pairing ceremony. Installing a provider's integration SHALL be idempotent and additive: it SHALL NOT remove or disturb another provider's integration. Adding a provider to a selected set SHALL install only the newly-added provider's integration and leave every already-installed provider's integration untouched. A previously installed integration for a provider dropped from the set SHALL remain dormant and self-gating rather than being uninstalled. Re-running setup SHALL likewise record the `runtime` key idempotently: re-running with the same runtime selection SHALL leave the recorded value unchanged and change nothing else about the installation, and re-running with a different runtime selection SHALL replace the single recorded value in place rather than accumulating runtime entries.

#### Scenario: Adding an adapter keeps the existing adapter integration

- **WHEN** an installation has `pi` installed and the operator re-runs setup selecting `pi` and `claude`
- **THEN** setup installs the claude adapter integration, leaves the pi adapter integration installed and unchanged, and does not re-run or tear down the pi adapter's shim

#### Scenario: Re-running setup unchanged makes no destructive change

- **WHEN** the operator re-runs `orch setup` with the same adapters and backends already installed
- **THEN** setup reports the integrations as already current, removes nothing, and exits 0

#### Scenario: Re-running with the same runtime leaves the recorded value unchanged

- **WHEN** an installation records the runtime as `node` and the operator re-runs `orch setup` selecting `node` again
- **THEN** the top-level `runtime` key still reads `node`, exactly one runtime key is present, setup exits 0, and no adapter or backend integration is disturbed

#### Scenario: Re-running with a different runtime replaces the value in place

- **WHEN** an installation records the runtime as `node` and the operator re-runs `orch setup` and explicitly selects `bun`
- **THEN** the top-level `runtime` key reads `bun`, exactly one runtime key is present with no accumulated prior value, and setup exits 0
