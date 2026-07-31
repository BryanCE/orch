# orch bug reports / strange behavior

Running log. Newest entries at the bottom. Format: date, command, expected vs actual, impact.

## 2026-07-31 — `orch status --json` emits a null-name row for non-orch panes

- **Command:** `orch status --json`
- **Actual:** Alongside the three real workers, the output includes the orchestrator's own pane (tab `Fable`, agent `claude`, not orch-spawned) as `{"name": null, "model": "-", "state": "idle", "stateFallback": true, "sessionPath": null, "presenceDir": null, ...}`.
- **Expected:** Either exclude panes orch didn't spawn from the default listing (opt in via a `--all-panes` flag), or give the row an explicit marker like `"managed": false` so scripts can filter it.
- **Impact:** Low but annoying — every scripted fleet-state parse has to special-case a `null` name (prints as `None` through Python), and naive "is anyone idle?" checks miscount because the orchestrator itself shows up as an idle agent.

## 2026-07-31 — pane transitioned to `error` with a fresh 0-turn session after completing its work

- **Sequence:** `review-3` was mid-task (17:00 session), asked a question, got `orch steer`ed, kept working — then the monitor reported `error`, and `orch tail review-3` showed a brand-new session file (17:33) with `turns: 0`, `(no entries)`, cost $0.
- **Actual:** The pane's harness apparently relaunched into an empty session and the error state points at that empty shell; the real session's final result is unreachable via `orch result` (the work itself HAD landed on disk, verified via git diff).
- **Expected:** Steering a working agent shouldn't cause (or coincide with) a session bounce; and if a pane dies after finishing, `error` should reference the session that did the work so `orch result`/`tail` still surface its report.
- **Impact:** Medium — orchestrator loses the worker's final report and has to reconstruct completion state from `git diff`. If the edits had NOT landed, this would look identical to a mid-task crash, forcing a full redispatch.

## 2026-07-31 — daemon bounce deafens pane bridges; dispatch then times out with panes stuck `idle`

- **Sequence:** Daemon restarted (uptime showed 265s while panes were older). `orch reset <pane>` still worked (returned "Cleared session; ready"), but every subsequent `orch dispatch` returned `RPC request timed out` and the pane stayed `idle` with no task.
- **Expected:** Either bridges reconnect after a daemon restart, or `dispatch` fails fast with "pane bridge disconnected — respawn required" instead of a generic RPC timeout after a long hang. The asymmetry (reset works, dispatch times out) makes it look like a prompt problem rather than a dead bridge.
- **Impact:** High confusion cost — two long timeouts and a status round-trip to diagnose. Known workaround (respawn fleet) is documented, but the failure mode is indistinguishable from a slow dispatch.

## 2026-07-31 — `orch close --all` aborts on ambiguous target instead of skipping it

- **Command:** `orch close --all`
- **Actual:** Failed with `Ambiguous target "wE:p3"` and closed nothing; the orch-spawned panes it should have closed stayed registered, which then made `orch spawn 3 --name review` fail with `agent_name_taken` for every name.
- **Expected:** `--all` should enumerate concrete pane IDs itself (never resolve through ambiguous short names), skip anything ambiguous with a warning, and close the rest. A failed bulk close shouldn't leave name reservations that block respawn.
- **Impact:** Medium — daemon-bounce recovery (the one scenario where you MUST respawn) is exactly when close --all needs to work; had to close three panes by ID and fall back to fresh names.

## 2026-07-31 — stale `orch questions` entries from dead panes never expire

- **Command:** `orch questions`
- **Actual:** Questions from `docs-2`, `docs-3`, `verify-1`, `verify-2` (panes closed ~19-20h ago, no longer in `orch status`) still list alongside live questions.
- **Expected:** Questions should be dismissed when their pane is closed/reset, or at least be flagged `(pane gone)`.
- **Impact:** Low — clutters triage; a scripted "answer all open questions" loop would try to steer nonexistent panes.
