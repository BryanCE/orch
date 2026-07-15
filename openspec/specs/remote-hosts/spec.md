# remote-hosts Specification

## Purpose
TBD - created by archiving change make-orch-general-purpose. Update Purpose after archive.
## Requirements
### Requirement: Host declarations
Remote hosts SHALL be declared in config as `[hosts.<name>]` with an `ssh` destination (and optional `orch_dir`). Each remote host runs its own complete orch installation; orch on the local machine federates over `ssh <dest> orch <command> --json` using BatchMode (no interactive prompts).

#### Scenario: Declared host is addressable
- **WHEN** config declares `[hosts.gpu1] ssh = "bryan@gpu1"` and the user runs `orch status`
- **THEN** gpu1's agents appear in the table with a HOST column value `gpu1`

### Requirement: Host-prefixed targets
Any command taking a target SHALL accept `<host>/<target>` (e.g. `gpu1/w6:p3`, `gpu1/pi-2`) and execute against that host's orch over SSH — including `steer`, `answer`, `result`, `dispatch`, `wait`, `tail`, and `queue add --host`. Targets without a host prefix SHALL resolve locally, preserving all existing behavior.

#### Scenario: Steer a remote agent
- **WHEN** the user runs `orch steer gpu1/pi-2 "check the logs"`
- **THEN** the steer is appended to pi-2's inbox on gpu1 and confirmed locally

#### Scenario: Local targets are untouched
- **WHEN** the user runs `orch steer pi-2 "..."` with hosts configured
- **THEN** resolution is local-only; no SSH connection is made

### Requirement: Resilient fan-out
Multi-host reads (`status`, `questions`) SHALL query hosts in parallel with a per-host timeout (default 3s, configurable). An unreachable or slow host SHALL be reported as a warning row, never hanging or failing the whole command. `--local` SHALL skip remote hosts entirely.

#### Scenario: Dead host degrades gracefully
- **WHEN** one of two configured hosts is unreachable and the user runs `orch status`
- **THEN** local and reachable-host agents render normally, the dead host shows one warning line, and exit code is 0

### Requirement: Doctor-driven onboarding and version skew
`orch doctor` SHALL verify each configured host: SSH BatchMode reachability, remote orch installed and on PATH, remote/local orch version and presence-protocol `schema` compatibility, and remote `$ORCH_DIR` initialized — each failure with a copy-paste fix (e.g. the ssh-copy-id or install command). Commands touching a host with a schema mismatch SHALL warn.

#### Scenario: Onboarding a fresh host
- **WHEN** the user adds `[hosts.gpu1]` pointing at a machine without orch and runs `orch doctor`
- **THEN** the gpu1 checks fail with the exact remote install command to run

### Requirement: Machine-readable surface (orchd-readiness)
Every observe and control command in the federation path SHALL support `--json` output and function without a TTY, so a future orchd daemon (HTTP/WS exposure of the presence protocol) can replace the SSH transport without changing any command semantics.

#### Scenario: Scripted remote control
- **WHEN** a script with no TTY runs `orch status --json` and `orch queue add --host gpu1 "task" --json`
- **THEN** both emit valid JSON and exit 0

