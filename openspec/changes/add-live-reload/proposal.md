# Proposal: add-live-reload

> **SUPERSEDED 2026-07-13** by `add-orchd-minimal` (operator order): reload/config-watching is daemon behavior; the requirements in this change move into orchd as duties instead of standalone file-signal crutches.

## Why

orch's long-running processes (`orch events`, `orch work`, notification watchers) load config and code once at start and then run stale forever — a config edit or an `orch setup` extension update silently changes nothing until someone remembers to kill and restart each process and pane. pi solved this with `/reload`; orch needs the same ergonomics, plus visibility ("you are running stale code") when a live process predates what's on disk.

## What Changes

- Long-running commands (`orch events`, `orch work`) watch `$ORCH_DIR/config.toml` and re-apply notification sinks and `[defaults]` on change, without restart.
- `orch reload [--all|target...]` (today: in-place pane extension `/reload`) also refreshes orch-side long-running watchers — one command means "everything now runs what's on disk".
- Staleness becomes visible: `orch doctor` gains a check comparing each live pane's loaded extension version (mtime/hash recorded in presence status.json at load time) against the on-disk file, and `orch status` marks stale panes.
- Fresh CLI invocations already pick up src/ changes (stateless process per command) — explicitly out of scope; this change covers ONLY long-running processes and fleet extension reload ergonomics.

## Capabilities

### New Capabilities
- `live-reload`: config hot-reload for long-running orch processes, one-command fleet reload, and staleness detection/reporting for loaded extensions.

### Modified Capabilities
<!-- fleet-steering requirements unchanged; reload semantics are additive -->
