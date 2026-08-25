# Design — fix-audit-findings

## Context

A 2026-07-20 four-way audit (duplication, coupling/walls, SRP, structure) produced a ranked defect list against the binding harness×plexer architecture (`learnings/2026-07-16-harness-plexer-architecture.md`, CLAUDE.md Rules 8/9/10). The layering largely holds — one presence writer, no pair code, caps-gated dispatch on the steer/set-model path, walls enforced at status/steer/peers/queue. The defects are specific leaks, not systemic rot. This design fixes every finding while preserving all observable behavior except where a spec delta says otherwise.

Constraints: node-compatible runtime code only (Rule 6); wire formats in exactly one module per harness (Rule 9); presence protocol writers only in `src/presence/` (Rule 10); no back-compat shims (Rule 8); `SETTINGS_SCHEMA` stays 1; the user runs all gates.

## Goals / Non-Goals

**Goals:**
- Close the `answer` wall bypass and make the dispatcher the provably-only invoker of adapter control strategies.
- Expand `check-bridge` so every breach class found by the audit is statically caught from now on.
- Collapse the four real duplication clusters into node-safe leaf modules.
- Split the five god functions; sweep dead/misplaced modules into self-evident positions.

**Non-Goals:**
- No new capabilities, backends, adapters, or presence-protocol changes.
- No web feature work (queue/events/SSE) and no packaging changes.
- No re-tiling feature to justify `applyLayout` — it is deleted, not wired.

## Decisions

### D1 — `answer` routes through the daemon like every other write verb
`ControlAction` in `src/control/dispatch.ts` gains `{ kind: "answer"; text: string }`, capability-gated on `caps.ask`. `cmdAnswer` keeps its CLI-side UX checks (pending `question.json`, `--force`) but delivery becomes `writeRpc("answer", …)` → orchd `governWrite` (wall + ownership) → `deliverControl`. orchd registers an `answer` method beside `steer`/`set-model`.
- *Why not keep a CLI fast path?* That is the bug: any path that reaches an adapter strategy without `governWrite` is a wall hole. One door (L5) is the architecture.
- *Trade-off:* `answer` now requires the daemon, matching steer/set-model. Accepted; uniformity is the point.

### D2 — check-bridge grows four checks, not a rewrite
1. Scan `packages/*/src/**` for concrete `src/backends/<id>/` and `src/adapters/<id>` imports (allow ports/registry/policy/store/daemon-client imports).
2. Dispatcher-only rule: outside `src/control/dispatch.ts` (and adapter implementations themselves), no `.steer(`, `.answer(`, `.setModel(` member calls on adapter values in `src/` — checked lexically, same style as existing wire-literal checks.
3. Identity-branch check widens from `.id ===` to quoted harness/backend ids in equality and `?? "<id>"` fallback positions.
4. Core-parser rule: `src/commands/**` may not import `parseSession` (or any per-harness parser module) directly; session reads go through the adapter port.
- *Why lexical, not AST?* check-bridge is already regex-based and fast; these violations are lexically distinctive. Consistency beats a parser dependency.

### D3 — Web workspace names come from a backend-neutral seam
`packages/web/src/server/orch.ts` drops `herdrReachable`/`herdrTabs`. The backend registry already resolves the active backend; expose `workspaceNames(): Map<string,string>` on the backend port (herdr implements via tabs; tmux/headless return empty) and let the web server call the resolved backend. This replaces a concrete import with port usage and gives tmux users names for free later.
- *Alternative considered:* web-local herdr probe kept but allow-listed in check-bridge. Rejected — it re-blesses pair code.

### D4 — One transcript leaf, one socket leaf (both node-safe)
- `src/adapters/transcript.ts`: `contentText`, `assistantText`, `lastAssistantFromJsonl` — imports `util.ts` only, so shim bundles can pull it without dragging store/config. The adapter copies and the claude shim copy are deleted; the semantic divergence resolves to the adapter behavior (`part !== undefined`), the stricter of the two reads, and a test pins it.
- `src/presence/socket-client.ts`: `readPortFile(orchDir)` + `requestJsonLine(endpoint, payload, timeoutMs)`. Consumers: `daemon/rpc.ts`, `extensions/pi/daemon-ack.ts`, both dial sites in `backends/herdr/hud.ts`. Herdr method vocabulary stays in hud.ts — transport only moves.
- `extensions/pi/peers.ts` deletes `isPidAlive`, imports `pidAlive` (fixes the EPERM liveness bug); shims share a `parsePid` in `util.ts`.

### D5 — Missing adapter identity is an error, not pi
`resolveAdapter(x ?? "pi")` sites (`control.ts`, `lifecycle.ts` ×2) become: resolve from presence identity; if absent, `die` with the agent key and a remediation hint. Rule 8: a presence record without an agent field is malformed, not implicitly pi.

### D6 — Queue tasks require a workspace
`addTask` rejects a missing workspace; `nextQueuedTask` drops the `undefined`-matches-all arm; the sqlite column stays nullable-typed only until the same change updates writers, then reads treat null as malformed (skip + doctor-visible). No migration — Rule 8 reaps old rows.

### D7 — Splits are moves, not rewrites
- `setup.ts` → `cmdSetup` decomposed into `recordComposition`, `installPrerequisites`, `installAdapterShims`, `wireBinaries`; `cmdSettings` → `commands/settings.ts`, `cmdDoctor` → `commands/doctor.ts`.
- `herdr/hud.ts` → `herdr/pane-socket.ts` (sender + queue + retry), `herdr/pane-state-machine.ts` (desired/publish/idle-hold), `registerPaneStateHud` stays as thin wiring.
- `status.ts` → one `statusRowFromView`; `results.ts` → shared `collectPendingQuestions`; `rpc.ts` → one `framedLineReader` used by all four read loops; `spawn.ts` → `cmdTile` reuses `parseSpawnFlags` + a shared `spawnOneIntoTab`.
- Structure moves: `store.ts` → `src/presence/store.ts` (with `SpawnedRecord` relocated into `store/sqlite.ts`, killing the type cycle); `work.ts` → `daemon/work-loop.ts`; `cmd-lock.ts` → `control/cmd-lock.ts`; `doctor-types.ts` → `src/check-result.ts`. Every import site sweeps in the same task; no re-export shims (Rule: no compat shims).

## Risks / Trade-offs

- [Answer needs daemon] → Same posture as steer/set-model; `orch daemon start` is already the operating baseline. Error message names the remediation.
- [Transcript unification changes claude-shim filtering] → Divergence was a bug; adapter semantics win; a fixture test pins empty-string handling so the change is deliberate, not silent.
- [Backend port gains `workspaceNames` while losing `applyLayout`] → Port churn in one change; acceptable pre-publish (Rule 8, no consumers outside the repo).
- [Many concurrent slices touch shared files (`util.ts`, `check-bridge.ts`, port types)] → Slice boundaries below are file-disjoint except the leaves, which are created first (slice order in tasks.md); the fleet works implementation-only, one gate pass at the end.
- [check-bridge lexical checks can false-positive] → Each new check lands with the existing allowlist mechanism; violations found during implementation are fixed, not allow-listed.

## Migration Plan

Pre-publish: no data migration, no deprecation. Land as one change; the user runs `bun run check` + `bun test` once after all slices merge, then `bun run build:dev` to refresh the installed CLI.

## Open Questions

_None — all decisions above are settled; deviations require reopening this design._
