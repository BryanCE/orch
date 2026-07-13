# Design: fix-orch-steering-bugs

## Context

All five defects live in `bin/orch.ts` (~2,200 lines, pre-refactor). They were observed live on 2026-07-13 while an orchestrator drove a 4-pane fleet:

- `cmdEvents` ends with `safety = setInterval(scan, 5000); safety.unref?.()`. With `--all` and zero live agent dirs there are no `fs.watch` handles, so the unref'd interval leaves the event loop empty and the process exits 0 with no output.
- `cmdTile` resolves its positional target via a tab-id regex (`/:t[0-9a-zA-Z]+$/`) or `resolveTarget()` (panes/names). Tab *labels* shown by `orch tabs` are not consulted.
- `cmdModel` calls the bridge's agent-dir immediately; a pane spawned seconds earlier hasn't written it yet, so the command dies (`no orchestrator-bridge agent dir`) on a race the caller cannot avoid except by sleeping.
- `cmdModel` verifies the change by re-reading `status.json`; when old == new it prints `(unchanged — bridge may lag or model rejected)` — a no-op and a failure produce the same line and exit 0.
- pi persists the last-used model per install, so a fresh pane can boot on a metered provider until someone runs `orch model`.

The in-flight `make-orch-general-purpose` notifications work is concurrently editing `cmdEvents` (adding `--notify` and removing the `unref`), so this change must rebase on that landing.

## Goals / Non-Goals

**Goals:**
- An orchestrator can arm `orch events --all` before any agent exists and trust it for the whole session.
- Every identifier a user can see in orch output (`orch tabs` LABEL column included) is a valid target where a tab is accepted.
- The spawn → configure sequence is race-free without caller-side sleeps.
- `orch model` output distinguishes no-op / confirmed / unconfirmed, with exit codes to match.
- A pane can be born on the intended model.

**Non-Goals:**
- Config-file defaults (`[defaults] model`) — `make-orch-general-purpose` task 2.2.
- Changing pi's own model persistence or the bridge protocol.
- General retry logic for every command; only bridge-dependent writes get the readiness wait.

## Decisions

- **Keep-alive by dropping `unref`** (not a `ref()`d sentinel timer): the scan interval must run anyway to pick up new agents; letting it hold the loop is the smallest correct fix. Ctrl-C/SIGTERM handlers already exist. Alternative considered — exiting with an error when the fleet is empty — rejected: arming the monitor before the fleet boots is the primary orchestrator pattern.
- **Label resolution inside a shared `resolveTab(target)` helper** used by `cmdTile`/`cmdTab`/`cmdMove`: try tab-id regex, then exact unique label match against `herdr tab list` (case-sensitive first, then case-insensitive), then fall through to `resolveTarget()`. Ambiguous labels die listing candidates, mirroring `ambiguous()` for panes. Alternative — teaching `resolveTarget()` about tabs — rejected: panes and tabs are different arities (many commands need a pane, not a tab).
- **`waitForBridge(paneKey, timeoutMs = 10_000)`**: poll for the agent presence dir (and `status.json` readable) every 250ms until deadline; on timeout, die with the current message plus how long we waited. `--no-wait` restores today's immediate failure for scripts that manage their own timing. Applied to `cmdModel` first; the helper is exported-in-file for other bridge writers (`steer`, `dispatch` already have their own nudge logic — untouched).
- **Three-way model ack**: read current model *before* writing. If already equal → `already <model> (no-op)`, exit 0. After write, poll briefly for the bridge to reflect the change: reflected → `old → new`, exit 0; not reflected within the window → `requested new (bridge did not confirm; was old)`, exit 1. Alternative — keep exit 0 on unconfirmed — rejected: orchestrators need the failure signal (a metered-model routing mistake is expensive).
- **`--model` on spawn/tile pins post-boot** rather than injecting a CLI flag into the `pi` command line: pi's flag surface for model selection isn't guaranteed stable, while `orch model`'s bridge path is already the supported mechanism. Implementation: after `runAndName`, `waitForBridge` then reuse `cmdModel`'s core; failures warn per pane but don't abort the remaining spawns.

## Risks / Trade-offs

- [Concurrent edits to `bin/orch.ts` from the notifications work] → land this change after `make-orch-general-purpose` 7.x merges; if the `unref` removal already landed there, the keep-alive task becomes verify + spec coverage only.
- [`--model` on `spawn <N>` serializes N bridge waits, slowing multi-pane spawns] → waits run after all panes are created, polled concurrently; worst case adds one timeout window, not N.
- [Label matching against user-controlled tab labels can be ambiguous] → unique-match-or-die with candidate list; ids always work as the unambiguous escape hatch.
- [Longer default wait could mask a genuinely dead pane] → 10s bound with a message that names the wait; `--no-wait` for callers that know better.

## Migration Plan

Pure CLI behavior fixes, no state or protocol changes; ships in a patch release. Rollback = revert the commit. Only behavioral delta a script could notice: `orch model` now exits 1 on unconfirmed changes (previously 0) — called out in the changelog.

## Open Questions

- None blocking. (Whether `steer`/`answer` should also adopt `waitForBridge` is deferred until a race is actually observed there.)
