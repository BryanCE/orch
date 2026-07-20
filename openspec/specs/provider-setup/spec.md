# provider-setup Specification

## Purpose
TBD - created by archiving change provider-driven-setup-doctor. Update Purpose after archive.
## Requirements
### Requirement: Setup selects a set of providers per axis

`orch setup` SHALL let the operator select a *set* of agent adapters and a *set* of execution backends — multiple adapters and multiple backends may be chosen in one run. For **every** selected adapter, setup SHALL install that adapter's integration; for **every** selected backend, setup SHALL probe its prerequisite. Setup SHALL NOT require exactly one adapter or exactly one backend, and MUST NOT branch on any provider's identity: adding a new adapter or backend SHALL NOT require editing the setup command.

#### Scenario: Operator installs two adapters in one run

- **WHEN** the operator runs setup and selects both `pi` and `claude` as adapters
- **THEN** setup installs the pi adapter's integration and the claude adapter's integration, each through the same per-adapter provider call, records both in the installed adapter set, and reports both as installed

#### Scenario: A new adapter needs no setup edit

- **WHEN** an adapter is added to the adapter registry and the operator selects it in `orch setup`
- **THEN** setup installs that adapter's declared integration through the same provider call used for every adapter, with no adapter-specific branch in the setup command

### Requirement: Setup records the active default per axis

After installing every selected provider, `orch setup` SHALL record, for each axis, both the installed set and a single **active default** chosen from that installed set. The active default is the provider used when a later command omits `--agent`/`--backend`; the installed set is every provider whose integration is installed and can be spawned. Setup SHALL persist both to the settings file (whose installed-sets shape and writer are owned by the settings capability). When only one provider is selected on an axis, it SHALL be recorded as both the sole installed member and the active default without a redundant prompt.

#### Scenario: Active default is chosen from the installed set

- **WHEN** the operator selects `pi` and `claude` as adapters and picks `pi` as the active default adapter
- **THEN** setup records the installed adapter set as `{pi, claude}` and the active default adapter as `pi`, and a subsequent spawn without `--agent` uses pi

#### Scenario: Switching the active default installs nothing

- **WHEN** an installation already has `pi` and `claude` installed with `pi` active, and the operator switches the active default adapter to `claude` (by editing the settings file or re-running setup with `claude` as the default)
- **THEN** the active default becomes `claude`, no adapter integration is installed or re-installed, both shims remain present, and setup (if re-run) reports the integrations as already current and exits 0

### Requirement: Setup installs each selected adapter's own integration

`orch setup` SHALL assemble a working installation by asking each selected adapter to install its own integration through the adapter port, with no `harness ===`/`backend ===` branch in the setup command. When a selected adapter declares an integration to install (its shim/hooks/extension), setup SHALL install it; an adapter that declares neither an install nor a diagnose surface SHALL be treated as needing no adapter-side integration rather than as an error. An adapter that declares a diagnose surface but no installer SHALL be reported as a loud, named gap — its expected integration cannot be installed — rather than silently skipped.

#### Scenario: Claude + tmux setup installs no pi integration

- **WHEN** the operator runs setup selecting `claude` as the only adapter and `tmux` as the only backend
- **THEN** setup installs the claude adapter's integration, does not report `pi MISSING`, does not build or link any pi extension, records `adapter = claude` and `backend = tmux`, and exits 0

#### Scenario: Expected-but-unbuildable adapter integration is loud

- **WHEN** the operator selects an adapter that exposes a diagnose surface (declaring it has an integration) but has no installer implementation available
- **THEN** setup warns loudly, names the adapter and the missing installer, and does not silently complete as if the adapter had no integration

### Requirement: Prerequisites are scoped to the selected providers by id

`orch setup` SHALL probe only the prerequisites of the selected providers, and MUST NOT report an unselected provider's absence as a missing prerequisite. The provider's id IS its probe binary name (the id-is-binary invariant): setup probes whether each selected adapter's and backend's id is an executable on PATH. A prerequisite required solely by a selected provider's install path (such as `bun` for pi's installer) SHALL be surfaced as that provider's declared dependency, not as an unconditional orch requirement.

#### Scenario: Unselected adapter is not probed

- **WHEN** the operator runs setup selecting `claude` and `headless` on a machine without pi installed
- **THEN** the prerequisite report lists the claude binary and the headless backend, does not list pi, and does not offer to install pi

#### Scenario: Missing selected binary is reported by its id

- **WHEN** the operator selects an adapter whose id is not an executable on PATH
- **THEN** setup reports that id as missing with its install command (or docs URL) and does not report any unselected provider

#### Scenario: bun is a provider dependency, not an orch requirement

- **WHEN** the operator selects only adapters and backends whose install paths do not need bun
- **THEN** setup does not probe `bun` or report it as missing, because bun is declared only as pi's install dependency

### Requirement: Prerequisite installers are keyed by real provider id with a declared dependency shape

`orch setup` SHALL resolve each prerequisite's install action from a table keyed by real provider id. Each entry SHALL carry exactly one of a real install command or a documentation URL, plus an optional ordered list of prerequisite provider ids (`needs`) that SHALL be installed first, in the declared order. Ordering of dependencies SHALL come from the explicit `needs` list, never from implicit array position. A provider with no automatic installer SHALL map to a documentation URL and be reported as "install manually". Every selectable provider — including `codex` — SHALL have an entry, so no selection resolves to a missing install action. No entry SHALL use a placeholder URL or an id absent from the provider registries.

#### Scenario: Installing pi installs its declared dependency first

- **WHEN** the operator selects `pi` and neither pi nor bun is on PATH
- **THEN** setup installs the providers listed in pi's `needs` (`bun`) before running pi's install command, in the declared order

#### Scenario: Codex selection resolves to an install action

- **WHEN** the operator selects `codex` on a machine without codex installed
- **THEN** setup resolves codex's installer-table entry and prints its real install command or documentation URL, and does not report a missing or placeholder entry

#### Scenario: Backend without an installer prints its docs URL

- **WHEN** a selected backend has no automatic installer and its binary is absent
- **THEN** setup prints a manual-install hint with the backend's documentation URL and does not attempt an automated install

#### Scenario: No placeholder installer entries exist

- **WHEN** `orch setup` runs for any selected provider
- **THEN** every install action it offers is a real command or a documentation URL, and none references `example.invalid` or an id absent from the provider registry

### Requirement: Re-running setup re-pairs idempotently and additively

Re-running `orch setup` SHALL be the whole re-pairing ceremony. Installing a provider's integration SHALL be idempotent and additive: it SHALL NOT remove or disturb another provider's integration. Adding a provider to a selected set SHALL install only the newly-added provider's integration and leave every already-installed provider's integration untouched. A previously installed integration for a provider dropped from the set SHALL remain dormant and self-gating rather than being uninstalled.

#### Scenario: Adding an adapter keeps the existing adapter integration

- **WHEN** an installation has `pi` installed and the operator re-runs setup selecting `pi` and `claude`
- **THEN** setup installs the claude adapter integration, leaves the pi adapter integration installed and unchanged, and does not re-run or tear down the pi adapter's shim

#### Scenario: Re-running setup unchanged makes no destructive change

- **WHEN** the operator re-runs `orch setup` with the same adapters and backends already installed
- **THEN** setup reports the integrations as already current, removes nothing, and exits 0

### Requirement: Setup refuses to record a runtime the installed entrypoint contradicts

When the operator selects a runtime, `orch setup` SHALL compare the selection against the installed orch entrypoint's shebang runtime before recording it. When they disagree, setup SHALL say so at selection time — naming the installed runtime, the selected runtime, and the exact rebuild command that would make the selection true — and SHALL NOT silently record a declaration its own closing doctor pass will immediately fail. Recording the mismatching selection is allowed only with an explicit operator confirmation that acknowledges the required rebuild.

#### Scenario: Selecting bun on a node-built install is confronted inline

- **WHEN** the installed `orch` entrypoint has a node shebang and the operator selects `bun` in the setup wizard
- **THEN** setup states the installed entrypoint is a node build, names `bun run build:dev` as the command that would produce a bun install, and either records `node` or — on explicit confirmation — records `bun` while printing the pending-rebuild consequence

#### Scenario: A consistent selection records silently

- **WHEN** the installed entrypoint's shebang matches the selected runtime
- **THEN** setup records it with no warning and the closing doctor pass reports the runtime check ok

### Requirement: Setup ends green on a healthy install

The doctor pass that `orch setup` runs at completion SHALL NOT fail for conditions setup itself just created or could have resolved: a runtime declaration setup recorded, a reappable malformed presence record setup could offer to reap, or missing state setup just wrote. On a machine where every integration setup installed is intact, setup's closing doctor pass SHALL end with zero failing checks attributable to setup's own output.

#### Scenario: Setup offers to reap a malformed presence record

- **WHEN** `orch setup` runs on an install with a malformed presence record that doctor classifies as reappable
- **THEN** setup surfaces the record and offers the reap during the run (defaulting to not deleting), rather than completing and immediately reporting it as a post-setup failure

#### Scenario: A clean setup run reports no self-inflicted failures

- **WHEN** the operator completes `orch setup` with consistent selections on a machine with all selected providers installed
- **THEN** the closing doctor pass shows no FAIL rows caused by the selections setup just recorded

