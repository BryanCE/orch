# Proposal: notifier-adapters

## Why

orch has three drift-prone notification paths: the `orch events` event-writer line, the sinks in `src/notify.ts`, and the standalone orchestrator bridge's `notifyHerdr` toast, which bypasses the shared formatter with a bare pane key. Their output can disagree, and adding another host integration requires another special case.

## What Changes

- Introduce a `Notifier` / host-integration adapter contract with `id`, human label, `available()`, `deliver(event)`, and metadata describing required configuration fields.
- Ship `herdr`, desktop/WSL, webhook, and command integrations; leave `claude`, `tmux`, `orcha`, and other harnesses for later adapters.
- Make orch own one canonical event model and formatter. The outcome-first line is `STATE + agent + [workspace]` (workspace color) + summary.
- Producers (bridge, daemon events, work loop) emit canonical events; notifier adapters only deliver them.
- Detect available notifiers in the host environment, expose an `orch setup` pick-list, persist selections in `config.toml`, and health-check them through the existing `doctor-config` capability.

This is the third adapter axis in orch, alongside agent adapters (`pi`/`claude`/`codex`) and execution backends (`herdr`/`headless`). Pull views (status/questions/tabs) remain walled to the current workspace. Push alerts (events/toasts) cross workspace walls only with `[workspace]` and color provenance.

## Constraints / Non-Goals

The bridge is standalone and cannot import `../src`. It must either emit presence events for orch to deliver, or duplicate the tiny canonical formatter exactly. This change does not add future host integrations or redesign pull-view scoping.

## Impact

Likely touch points are `src/notify.ts`, event/daemon/work-loop producers, `extensions/orchestrator-bridge.ts`, setup/config wiring, and doctor checks. Existing sink behavior remains available behind adapters; no source implementation is included in this planning artifact.
