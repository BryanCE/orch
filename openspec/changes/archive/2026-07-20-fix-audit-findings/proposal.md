# Fix 2026-07-20 Architecture Audit Findings

## Why

A four-way architecture audit (duplication, coupling/walls, SRP, structure) found that the harness×plexer layering mostly holds, but left a ranked list of real defects: one workspace-wall bypass on a write verb, static-enforcement blind spots that let two coupling breaches land, a pi wire-format leak in core, four genuine duplication clusters (one with already-diverged copies producing different reads of the same file), five god functions, and a set of dead/misplaced modules. Fixing them now — before 0.1.0 — makes the architecture self-defending instead of audit-defended.

## What Changes

- **`orch answer` becomes a governed control verb.** It currently invokes the adapter strategy directly in the CLI (`src/commands/control.ts:107-127`), skipping the daemon's wall + ownership check and the single control dispatcher. It will be modeled as a `ControlAction` and routed through `writeRpc` → `governWrite` → `deliverControl` like steer/set-model. **BREAKING** for any script relying on `orch answer` working without a live daemon.
- **`check-bridge` closes its blind spots:** scans `packages/` for concrete backend/adapter imports; enforces that adapter control strategies (`steer`/`answer`/`setModel`) are invoked only from `src/control/dispatch.ts`; catches string-form identity branches (`=== "pi"` etc.) and `?? "pi"` default-adapter fallbacks; forbids per-harness parser imports in core commands.
- **Web server stops importing a concrete backend.** `packages/web/src/server/orch.ts` drops its direct `src/backends/herdr/cli.ts` import; workspace-name resolution goes through a backend-neutral seam.
- **`orch tail` reads sessions through the adapter port** (`readSessionView`) instead of calling pi's `parseSession` raw, so claude/codex sessions are not misparsed.
- **One transcript parser.** The three diverged copies of `contentText`/`assistantText`/JSONL-tail-scan collapse into a node-safe leaf `src/adapters/transcript.ts` imported by both adapters and both shims.
- **One socket client.** The three hand-rolled orchd/herdr socket dial routines and duplicated `orchd.port` parsers collapse into a node-safe leaf; `extensions/pi/peers.ts` drops its EPERM-broken `isPidAlive` copy for `util.ts`'s `pidAlive` (bug fix: peers owned by another user no longer read as dead).
- **Default-to-pi fallbacks removed.** `resolveAdapter(x ?? "pi")` sites error loudly on a missing adapter identity instead of silently applying pi's strategy.
- **Unscoped queue tasks are malformed** (Rule 8): a task without a workspace is rejected at write and never claimable, instead of claimable by every workspace.
- **`applyLayout` leaves the backend port.** Required by the port, implemented three times, called by nothing. Removed from the port and all three backends.
- **God-function splits** (behavior-preserving): `cmdSetup` decomposed and `settings`/`doctor` commands moved to their own files; `registerPaneStateHud` split into socket-sender, state-machine, and retry-classifier modules; `status.ts` builds its row object once; `rpc.ts` gains one shared line-framing reader; `cmdTile` reuses the shared spawn pipeline and flag parser.
- **Structure sweep**: `src/store.ts` folds into `src/presence/`; `src/work.ts` → `src/daemon/work-loop.ts`; `src/cmd-lock.ts` → `src/control/`; `src/doctor-types.ts` renamed out of lookalike-sibling position; dead exports deleted (`session.ts` internal types, `remote.ts` `RemoteFailure`/`runRemote`, `cmd-lock.ts` `CommandLockOptions`); `handle*` functions in `extensions/pi/tools.ts` renamed to action verbs.
- **Setup ends green.** The wizard confronts a runtime selection that contradicts the installed entrypoint's shebang at selection time (naming the rebuild command) instead of recording it and failing its own closing doctor pass; setup offers to reap reappable malformed presence records during the run; doctor downgrades "session-scoped backend not inside a live session" from FAIL to a situational warning when the install itself is intact.

## Capabilities

### New Capabilities

_None — this change hardens and cleans existing capabilities; it introduces no new user-facing behavior._

### Modified Capabilities

- `control-dispatch`: `answer` becomes a dispatched, capability-gated control action; adapter control strategies are invocable only via the dispatcher.
- `workspace-policy`: the wall covers `answer` (every write verb is now wall-checked server-side; no verb reaches an agent without `governWrite`).
- `port-boundary-guard`: the static guard's coverage expands to `packages/`, dispatcher-only control invocation, string-form identity branches, default-adapter fallbacks, and per-harness parser imports in core.
- `agent-adapters`: each harness's transcript/session wire format is parsed in exactly one shared module behind the adapter port; core commands never import a harness parser directly.
- `task-queue`: tasks must carry a workspace; unscoped tasks are rejected as malformed rather than cross-claimable.
- `fleet-backends`: `applyLayout` leaves the backend port (no requirement referenced it; contract-level removal); the port gains a workspace-display-name surface consumers use instead of concrete backend imports.
- `provider-setup`: setup validates the runtime selection against the installed entrypoint and must end green on a healthy install.
- `doctor-config`: doctor distinguishes broken-install failures from situational warnings (not-inside-session).

## Impact

- `src/commands/control.ts`, `src/control/dispatch.ts`, `src/daemon/orchd.ts`, `src/daemon/rpc.ts` (answer routing + framing reader)
- `scripts/check-bridge.ts` (enforcement expansion)
- `packages/web/src/server/orch.ts` (backend-neutral workspace names)
- `src/adapters/{claude,codex}.ts`, `extensions/claude/index.ts`, new `src/adapters/transcript.ts`
- `extensions/pi/daemon-ack.ts`, `src/backends/herdr/hud.ts`, new socket-client leaf, `extensions/pi/peers.ts`
- `src/commands/{setup,status,results,spawn,lifecycle}.ts`, new `src/commands/{settings,doctor}.ts`
- `src/{store.ts→presence,work.ts→daemon,cmd-lock.ts→control,doctor-types.ts}`, `src/backends/{backend,herdr/index,tmux/index,headless/index}.ts`, `src/queue.ts`, `src/session.ts`, `src/remote.ts`, `extensions/pi/tools.ts`
- Tests for every touched surface updated in the same change; `bun run check` + `bun test` gates run by the user.

## Non-goals / deferred

- Web `/queue` and `/events` pages, SSE push, and web steer wiring (separate 0.1.0 work already tracked).
- package.json/packaging cleanup (deps, engines, LICENSE, files) — separate release chore.
- No new backend or adapter capabilities; no presence-protocol changes; no settings schema changes (`SETTINGS_SCHEMA` stays 1).
