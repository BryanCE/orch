## MODIFIED Requirements

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
