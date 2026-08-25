## Why

The tmux backend is a runnable skeleton: it implements the required Backend port (spawn/deliver/focus/sendKeys/close/list/identity) but omits the entire optional surface (`inventory`, `groups`, `workspaces`, `read`, `waitAgentStatus`, `renameAgent`, `createGroup`). Every fleet-visibility feature walks those methods and sees nothing — a user can launch and steer tmux agents but cannot observe them. Worse, `list()` returns every pane in every session (not just orch agents), auto-detection never consults `tmux.isInsideSession()` (a user inside tmux silently gets headless), and `--backend tmux` outside a session validates and then blows up at spawn instead of failing fast. This closes the gap so tmux is a first-class visible backend on par with herdr, and finishes the partially-done cross-session workspace wall (pluggable-plexer-backends task 6.4).

## What Changes

- Implement the optional Backend port surface on `TmuxBackend`, each method a real tmux call (never a stub returning false):
  - `inventory()` — per-target metadata (workspace = session, group = window, groupLabel = window name, name from pane title, agent kind where derivable, focused, status), enumerating **only orch-spawned panes**.
  - `groups()` — tmux windows as backend groups; `workspaces()` — tmux sessions as backend workspaces.
  - `read(handle, lines)` — last visible lines via `capture-pane`.
  - `waitAgentStatus(handle, status, timeoutMs)` — poll capture/presence until the status is observed or the deadline passes.
  - `renameAgent` / `renamePane` — pane title / window name.
  - `createGroup({workspace, cwd, label})` — `new-window` returning the group and its root pane handle.
- Fix `list()` to enumerate only orch-spawned panes, filtered via the pane user option `@orch_agent_key` (per D1 — env vars set with `new-window -e` are NOT readable in `list-panes` format strings; the readable marker is the pane user option), never every pane in every session.
- Auto-detection: `resolveBackend` probes tmux — inside a live tmux session (`tmux.isInsideSession()`), tmux is selected before the headless fallback (the herdr-inside-session probe stays first).
- Validation: `validateBackend` gains a uniform `isInsideSession()` check for any selected backend, so an explicit/configured tmux backend fails fast with an actionable message when run outside a tmux session instead of erroring at spawn. **BREAKING (behavior):** this same check now also rejects `--backend herdr` (or `defaults.backend = "herdr"`) selected from outside a herdr session — herdr previously validated on `isAvailable()` alone and only failed later. This is intended (session-scoped backends should fail fast uniformly), but it is a declared behavior change: a herdr backend chosen outside a herdr session now exits non-zero at validation. Verified safe because no existing flow selects herdr while outside a herdr session (implicit selection already requires `herdrBackend.isInsideSession()` at `registry.ts:38`; explicit `--backend herdr` outside a session was already a spawn-time error, now a clearer validation-time error). A test asserts herdr's new fail-fast.
- Finish pluggable-plexer-backends task 6.4 by **fixing the currently-broken cross-session wall wiring**, not merely re-asserting it. Today a cross-session pane steer never reaches the wall: `resolveTarget` gets no cross-workspace opt, the foreign fallback passes a bare pane id into `checkWall` (so `workspaceOf` returns null and the wall silently allows), and execution then dies "No target matches" instead of printing the wall message — so neither wall scenario is reachable (see design D6). This change passes the serialized identity into `checkWall`, threads `--cross-workspace` into `resolveTarget` pool-widening, so a cross-session steer/dispatch is genuinely refused without `--cross-workspace` and genuinely delivered with it.
- Extend `test/backend-tmux.test.ts` and `test/cli-backends-tmux.test.ts` to cover the new surface (hermetic tmux stubs; CLI-spawning tests carry explicit 15–30s timeouts per the WSL note).

## Capabilities

### New Capabilities
<!-- none: this change extends the existing tmux-backend and fleet-backends capabilities -->

### Modified Capabilities
- `tmux-backend`: adds requirements for tmux fleet visibility (orch-only inventory, group/workspace enumeration), screen read + status wait, agent/pane renaming, group creation, and ownership enforced through the shared workspace-wall policy.
- `fleet-backends`: adds implicit tmux selection inside a live tmux session and fail-fast validation for session-scoped backends selected outside a session.

## Impact

- Code: `src/backends/tmux/index.ts` (optional port methods, filtered `list()`, `spawn` honoring `opts.group`/`opts.split` so agents land in created groups), `src/backends/tmux/cli.ts` (any new best-effort tmux queries), `src/backends/registry.ts` (`resolveBackend` tmux auto-probe, `validateBackend` uniform inside-session check), `src/entities.ts` (`resolveTarget` gains a `crossWorkspace` opt that widens the pool and is passed into `checkWall`; the foreign-fallback wall check passes `foreign.key` not `foreign.paneId`), `src/commands.ts` (`cmdSteer` and the local-resolve dispatch/run paths thread `gov.crossWorkspace` into `resolveTarget`).
- Tests: `test/backend-tmux.test.ts`, `test/cli-backends-tmux.test.ts`.
- Sequencing: this change's scenario run of tmux steer against a real pane is gated on `adapter-control-authority` landing (its daemon `deliverBackend`/dispatcher rewrite owns the pane-delivery path); it coordinates the `herdrStatus`→`backendStatus` field rename with `adapter-presence-writers`; and its archive is gated on `plexer-base-sync` syncing the pluggable-plexer-backends base spec into the main specs first.
- Constraints preserved: Rule 6 node-safe (`node:child_process` execFile only, no `Bun.*`), Rule 8 no back-compat shims, capability convention (real method or omitted — never a stub returning false), files stay within the 500–700 line ceiling.

## Non-goals

- No adapter behavior changes (pi/claude/codex adapters are untouched).
- No tmux HUD or toast/notification surface in this change.
- No file splits or refactors beyond what the new methods require.
- No changes to the herdr or headless backends.
