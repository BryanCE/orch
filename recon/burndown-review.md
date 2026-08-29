# Burndown review

## e418a4a (B1): ISSUES

- `src/backends/headless/index.ts:256` — daemon log pruning still writes its warning to `process.stderr` instead of emitting a decision-log record — replace it with `decisionLogger(orchDirectory(orchDir)).warn("retention.sweep-failed", { area: "logs", file, error: errorMessage(error) })`.

## de1e4e7 (B3): ISSUES

- `src/commands/settings.ts:155` — single-setting writes call `spec.write` directly, violating the requirement that settings.ts write only through `writeRegisteredSetting` — call `writeRegisteredSetting(orchDir(), key, parsed.value)` instead.
- `test/settings-command.test.ts:127-128` — the subcommand coverage uses a static source-text assertion rather than spying on the registry write path as required — replace/add it with a registry-spy assertion that records the `writeRegisteredSetting` calls.
