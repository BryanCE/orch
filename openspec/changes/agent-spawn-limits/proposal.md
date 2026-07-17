# Proposal: agent-spawn-limits

## Why

An uncapped multi-orchestrator session can spawn enough concurrent agents to exhaust the machine — this happened today: several fleets stacked across workspaces ate CPU/RAM and dragged the whole computer down. orch has no resource ceiling; every `spawn` succeeds until the OS starves.

## What Changes

- Add a `limits` section to `$ORCH_DIR/settings.json`: a global maximum of concurrently live orch-spawned agents across ALL workspaces, plus optional per-workspace maximums.
- Enforce the limits at spawn time in the command layer: a spawn that would exceed the applicable limit fails fast with an actionable error naming the limit, the current live count, and the settings key to raise it. Partial fleets are not spawned silently — the requested count is checked up front as a whole.
- If only the global max is set, any single workspace may consume the full allotment (no implicit per-workspace fencing). A per-workspace entry is an explicit cap for that workspace; the global cap still applies across the sum of all workspaces.
- No limits configured = unlimited (current behavior preserved by omission, not by a legacy shim).

## Capabilities

### New Capabilities
- `spawn-limits`: user-configurable ceilings on concurrently live orch-spawned agents — global and per-workspace — enforced at spawn time from `settings.json`.

### Modified Capabilities

<!-- none — enforcement composes onto the existing spawn path; no existing capability's requirements change -->

## Impact

- `src/config.ts`: extend the one settings.json schema (bump the shared schema constant per Rule 8; no legacy acceptance) with the `limits` shape.
- `src/commands/spawn.ts`: count live orch-spawned agents (registry ∩ live presence, the same cross-reference `orch close --all` uses) and gate the spawn before any pane is created.
- `orch doctor` (`doctor-config`): optionally surfaces a nonsensical configuration (per-workspace entries summing above the global max) as a warning — report-only, no fix.
- Tests: schema validation cases plus spawn-gate unit tests (global cap, per-workspace cap, unset = unlimited, whole-request check).
