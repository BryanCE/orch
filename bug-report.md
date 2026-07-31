# orch bug reports / strange behavior

Running log. Newest entries at the bottom. Format: date, command, expected vs actual, impact.

## 2026-07-31 — `orch status --json` emits a null-name row for non-orch panes

- **Command:** `orch status --json`
- **Actual:** Output includes the orchestrator's own pane (tab `Fable`, agent `claude`, not orch-spawned) as `{"name": null, "model": "-", "state": "idle", "stateFallback": true, ...}`.
- **Expected:** Exclude panes orch didn't spawn (opt in via `--all-panes`), or mark them `"managed": false` so scripts can filter.
- **Impact:** Low — every scripted parse special-cases a null name; idle-agent counts are wrong.

## 2026-07-31 — pane transitioned to `error` with a fresh 0-turn session after completing its work

- **Sequence:** `review-3` was mid-task, got steered, kept working — then the monitor reported `error` and `orch tail review-3` showed a brand-new session (turns: 0, no entries, $0). The real session's result was unreachable via `orch result`; the work HAD landed on disk (verified via git diff).
- **Expected:** Steering shouldn't bounce the session; if a pane dies after finishing, `error` should reference the session that did the work.
- **Impact:** Medium — completion state had to be reconstructed from git diff; a mid-task crash would look identical.

## 2026-07-31 — daemon bounce deafens pane bridges; dispatch times out with panes stuck `idle`

- **Sequence:** Daemon restarted underneath a live fleet. `orch reset <pane>` still worked, but every `orch dispatch` returned `RPC request timed out` and panes stayed `idle` with no task.
- **Expected:** Bridges reconnect, or dispatch fails fast with "bridge disconnected — respawn required" instead of a long generic timeout. Reset-works-dispatch-fails misleads.
- **Impact:** High confusion cost mid-incident; workaround (respawn fleet) only obvious if you notice the daemon uptime.

## 2026-07-31 — `orch close --all` aborts on ambiguous target instead of skipping it

- **Command:** `orch close --all`
- **Actual:** Failed on `Ambiguous target "wE:p3"` and closed nothing; the stale registrations then made `orch spawn --name review` fail with `agent_name_taken`.
- **Expected:** `--all` should enumerate concrete pane IDs, skip ambiguous ones with a warning, close the rest; failed bulk close must not hold name reservations.
- **Impact:** Medium — broke daemon-bounce recovery exactly when it was needed; had to close by pane ID and use fresh names.

## 2026-07-31 — `orch spawn` reports success + tiling but panes never register (persists after CLI rebuild + daemon restart)

- **Sequence:** `orch spawn 3 --name triage` printed pane IDs and a tiling layout; `orch status`/`orch panes` showed nothing; `orch dispatch triage-1` → `No target matches`. Reproduced after CLI rebuild AND a fresh daemon pid with `orch spawn 1 --name breakup` (still ghost 16s later).
- **Expected:** Spawn is transactional — pane exists and is addressable, or the command fails loudly. Success output for nonexistent panes is the worst case.
- **Impact:** High — fleet delegation fully blocked; fell back to built-in subagents during a critical fire.

## 2026-07-31 — stale `orch questions` entries from dead panes never expire

- **Command:** `orch questions`
- **Actual:** Questions from panes closed ~19-20h earlier (no longer in `orch status`) still list alongside live ones.
- **Expected:** Dismiss on pane close/reset, or flag `(pane gone)`.
- **Impact:** Low — clutters triage; scripted answer-all loops would steer nonexistent panes.

## 2026-07-31 — post-rebuild spawn now registers the pane but bridge never comes up (`STALLED ... no bridge dir`)

- **Command:** `orch spawn 1 --name review` (after CLI rebuild; new failure mode vs the earlier silent ghost)
- **Actual:** Pane spawns and tiles, then `STALLED wE:p4H review-1 — no bridge dir; try: orch restart review-1`, and the model pin fails with `no presence dir for pi inbox delivery`.
- **Expected:** Bridge dir/presence created before spawn reports success; pin retried once bridge registers.
- **Impact:** High — fleet delegation still blocked; progressed from silent ghost to loud stall, but still unusable.

## 2026-07-31 — fresh-daemon spawn still stalls; pane untargetable so the suggested fix can't run

- **Sequence:** Daemon freshly restarted (23s uptime, RPC answering). `orch spawn 1 --name review` → pane tiles, then `STALLED wE:p4K review-1 — no bridge dir`, pin fails with `control target herdr~wE~8gvfjl4yy6 does not resolve to a presence identity`, `orch status --json` returns `[]`, and the suggested `orch restart review-1` fails `No target matches "review-1"` — the stall message recommends a command that cannot address the pane it names.
- **Expected:** Spawn transactional; if stalled, the pane must still be addressable by the name the error itself prints.
- **Impact:** High — delegation via orch fully blocked even on a clean daemon; visible pane exists on screen but is orphaned from the registry.

## 2026-07-31 — `orch doctor -y` reports every check OK while spawn registration is fully broken

- **Sequence:** Immediately after the untargetable-stall above, `orch doctor -y` → all OK/SKIP (runtime, spawn limits, orchd presence/code/lock/socket). Yet every spawn stalls with no bridge dir and `orch status --json` is `[]`.
- **Expected:** Doctor should include a spawn round-trip smoke test (spawn → bridge dir appears → addressable → close). Health checks that don't exercise the one broken path give false confidence.
- **Impact:** Medium — doctor can't be trusted as a "fleet is usable" signal.

## 2026-07-31 — this bug report file was found truncated to 0 bytes

- **Sequence:** This file held the first five entries above (written via normal file edits, confirmed on disk). After the orch CLI rebuild + daemon restart window, it was 0 bytes.
- **Expected:** Nothing in the orch toolchain should touch repo files.
- **Impact:** Unknown cause — noting the timing correlation only; entries reconstructed from session context.
