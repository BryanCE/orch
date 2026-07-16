## MODIFIED Requirements

### Requirement: Notifier setup and doctor validation

`orch setup` SHALL run notifier configuration as a discrete step of its multi-select provider-setup flow, after the selected adapters and backends are installed: it SHALL discover available built-in notifier integrations, present an onboarding pick-list, ask selected adapters only for their declared required configuration fields, and persist selections as `notify` entries in `~/.orch/settings.json` including `id`, `on`, and adapter-specific metadata. A non-interactive or `--yes` run SHALL skip the pick-list and add no notifier entries rather than guessing. The settings file format and writer are owned by the settings capability; setup consumes that writer. `orch doctor` SHALL load those entries, validate required fields, re-run availability checks, and report actionable fixes including WSL/desktop fallback status.

#### Scenario: Configure an available notifier

- **WHEN** `orch setup` finds an available adapter and the operator selects it
- **THEN** setup asks only for that adapter's declared required fields and persists the selection as a `notify` config entry

#### Scenario: Non-interactive setup adds no notifiers

- **WHEN** the operator runs `orch setup` non-interactively or with `--yes`
- **THEN** setup completes the notifier step without prompting and writes no `notify` entries

#### Scenario: Doctor finds a broken notifier configuration

- **WHEN** `orch doctor` checks a configured notifier with missing required fields or unavailable host integration
- **THEN** it reports the actionable configuration or availability fix and distinguishes unavailable from misconfigured
