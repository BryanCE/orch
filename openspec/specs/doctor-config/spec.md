# doctor-config Specification

## Purpose
TBD - created by archiving change make-orch-general-purpose. Update Purpose after archive.
## Requirements
### Requirement: Config file
orch SHALL read `$ORCH_DIR/config.toml` (TOML) at startup when present, with precedence: CLI flags > `ORCH_*` environment variables > config file > built-in defaults. Supported sections SHALL include `[defaults]` (adapter, backend, model, spawn cap, worktree), `[queue]`, `[[notify]]`, and `[hosts.<name>]`. An invalid config SHALL produce a clear parse error naming the offending key/line, not a stack trace; a missing config SHALL be silently fine.

#### Scenario: Config default is used
- **WHEN** config sets `defaults.adapter = "claude"` and the user runs `orch spawn 2` with no `--agent` flag
- **THEN** the fleet spawns Claude Code agents

#### Scenario: Flag beats config
- **WHEN** the same config is present and the user passes `--agent pi`
- **THEN** pi agents spawn

#### Scenario: Broken config fails helpfully
- **WHEN** config.toml contains a syntax error
- **THEN** orch exits 1 naming the file and the problem, and suggests `orch doctor`

### Requirement: Doctor diagnostics
`orch doctor` SHALL check and report, each with ok/warn/fail and an actionable fix: required binaries (bun, plus the configured adapter CLIs and herdr when the herdr backend is default), pi extensions symlinked and current, Claude hooks shim installed and current (when the claude adapter is configured), stale presence dirs, spawn-registry consistency, herdr version compatibility, config validity, worktree gitignore coverage, and the desktop-notification chain. Exit code SHALL be non-zero when any check fails.

#### Scenario: Detects an unlinked extension
- **WHEN** the orchestrator-bridge extension is missing from `~/.pi/agent/extensions` and `orch doctor` runs
- **THEN** the report shows a failing check with the exact command to fix it, and exit code is non-zero

#### Scenario: Healthy system
- **WHEN** all checks pass
- **THEN** `orch doctor` prints all-ok and exits 0

### Requirement: Doctor safe auto-fix
`orch doctor --fix` SHALL apply only reversible, non-destructive fixes (re-link extensions, create missing dirs, install the hooks shim, add gitignore entries, remove presence dirs whose pid is dead) and SHALL list what it changed. Anything destructive or ambiguous SHALL remain report-only.

#### Scenario: Fix relinks without touching user data
- **WHEN** `orch doctor --fix` runs with a missing extension symlink and an unrelated failing check that would require deleting user files
- **THEN** the symlink is restored, the destructive item is reported but not performed

