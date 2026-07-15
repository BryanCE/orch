# notifier-adapters Specification

## Purpose
TBD - created by archiving change notifier-adapters. Update Purpose after archive.
## Requirements
### Requirement: Pluggable notifier adapter contract
orch SHALL provide a third pluggable adapter axis for notifier integrations, alongside agent adapters and execution backends. Each notifier SHALL expose an id, human-readable label, availability probe, delivery operation, and metadata declaring its required configuration fields. The built-in notifier ids SHALL be `herdr`, `desktop`, `webhook`, and `command`.

#### Scenario: Built-in notifier registry
- **WHEN** orch initializes its notifier registry
- **THEN** it registers the herdr, desktop, webhook, and command adapters with their declared metadata and availability probes

#### Scenario: Unavailable adapter
- **WHEN** a notifier availability probe reports that its host integration is unavailable
- **THEN** orch reports that adapter as unavailable without preventing other notifier adapters from operating

### Requirement: Canonical notification event fan-out
orch SHALL own one serializable canonical notification event and formatter for state transitions and push alerts. The formatted outcome-first line SHALL include state, agent, `[workspace]`, and summary, with stable workspace color and state-specific error or blocked details. The bridge, daemon event stream, and work loop SHALL emit canonical events to one event path, which SHALL format once and fan out to configured notifier adapters. Producers SHALL NOT call host commands directly.

#### Scenario: Shared event delivery
- **WHEN** a daemon event or work-loop transition qualifies for notification
- **THEN** the event path formats the canonical event once and delivers it through the configured notifier fan-out

#### Scenario: Workspace provenance
- **WHEN** a push event or toast is rendered for any workspace
- **THEN** its rendered line and structured payload include the workspace name and stable color so its provenance is unambiguous

### Requirement: Built-in notifier delivery
The built-in adapters SHALL preserve the existing integration behavior behind the adapter boundary: herdr native alerts, desktop/WSL fallback delivery, webhook POST delivery, and command delivery with canonical JSON on stdin. Delivery SHALL be timed, isolated, best-effort, and failures SHALL warn without blocking producers.

#### Scenario: Failed adapter isolation
- **WHEN** one configured notifier fails or times out while delivering an event
- **THEN** orch warns about that adapter and continues producing and delivering through the remaining notification path

#### Scenario: Command adapter payload
- **WHEN** the command notifier delivers a canonical event
- **THEN** it supplies the canonical JSON event on the command's standard input

### Requirement: Notifier setup and doctor validation
`orch setup` SHALL discover available built-in notifier integrations, present an onboarding pick-list, ask selected adapters only for their declared required configuration fields, and persist selections as `[[notify]]` entries in `~/.orch/config.toml` including `id/type`, `on`, and adapter-specific metadata. `orch doctor` SHALL load those entries, validate required fields, re-run availability checks, and report actionable fixes including WSL/desktop fallback status.

#### Scenario: Configure an available notifier
- **WHEN** `orch setup` finds an available adapter and the operator selects it
- **THEN** setup asks only for that adapter's declared required fields and persists the selection as a `[[notify]]` config entry

#### Scenario: Doctor finds a broken notifier configuration
- **WHEN** `orch doctor` checks a configured notifier with missing required fields or unavailable host integration
- **THEN** it reports the actionable configuration or availability fix and distinguishes unavailable from misconfigured

