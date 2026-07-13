# Proposal: fix-orch-steering-bugs

## Why

A live orchestration session (2026-07-13, Claude driving a 4-pane fleet) hit five real defects in orch's steering surface — a dead event stream, unresolvable tab labels, spawn/model races, an ambiguous no-op message, and metered-model leakage on fresh panes. Each one broke or endangered an automated orchestrator loop, which is orch's primary audience; they should be fixed while the reproduction details are fresh.

## What Changes

- **`orch events` stays alive on an empty fleet** — today the 5s rescan interval is `unref()`d, so `orch events --all` with zero live agent dirs has nothing on the event loop and exits silently and immediately. Orchestrator monitors armed before the first agent boots die without a message. The stream must stay up and pick up agents as they appear.
- **Tab labels become valid targets** — `orch tile notify` fails with `No target matches "notify"` even though `orch tabs` displays that label. Commands that accept a tab (`tile`, `tab`, `move`) will resolve tab labels (unique match) in addition to tab ids and pane targets.
- **`orch model` (and other bridge-dependent commands) wait for the bridge** — running `orch model` right after `orch spawn` dies with `no orchestrator-bridge agent dir` because pi hasn't booted the bridge yet. Bridge-dependent write commands gain a short bounded wait (poll for the agent dir, ~10s default, `--no-wait` to opt out) instead of failing on a race the caller can't avoid.
- **Honest `orch model` acks** — setting a model to its current value prints `(unchanged — bridge may lag or model rejected)`, indistinguishable from a real failure. The command will distinguish: already-set no-op, confirmed change, and genuine unconfirmed/rejected outcomes (nonzero exit only for the last).
- **`orch spawn`/`orch tile` gain `--model`** — fresh panes inherit pi's sticky last-used model (observed: a metered `openrouter/x-ai/grok-4.5`, silently billable). A `--model` flag pins the model as soon as the bridge is ready (reusing the wait from the fix above). Config-driven default models stay in `make-orch-general-purpose` (task 2.2) and are explicitly out of scope here.

**Non-goals / deferrals**: no config-file default model/adapter (belongs to `make-orch-general-purpose` [defaults]); no change to pi's own model persistence; no new backends or adapters; the events keep-alive fix may already land via the `make-orch-general-purpose` notifications task currently in flight — if so, the task here reduces to verifying and spec-covering it.

## Capabilities

### New Capabilities

- `fleet-steering`: reliability contract for the orchestrator-facing steering surface — event-stream liveness on an empty fleet, tab-label target resolution, bounded bridge-readiness waits for write commands, unambiguous model-change acks, and spawn-time model pinning.

### Modified Capabilities

<!-- none — openspec/specs/ is empty; no synced capability specs exist yet -->

## Impact

- **Code**: `bin/orch.ts` only — `cmdEvents` (keep-alive), tab resolution helper shared by `cmdTile`/`cmdTab`/`cmdMove`, a `waitForBridge(paneId, timeout)` helper used by `cmdModel` (and available to other bridge writers), `cmdModel` ack logic, `cmdSpawn`/`cmdTile` `--model` plumbing, help text.
- **State/protocol**: none — presence-dir protocol and `spawned.jsonl` untouched.
- **Coordination**: `bin/orch.ts` is concurrently being edited by the in-flight notifications work (`make-orch-general-purpose` 7.x); implementation must land after that merge to avoid collisions.
