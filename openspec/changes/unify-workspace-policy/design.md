# Design: unify-workspace-policy

## The single policy module — `src/policy/workspace.ts`

Pure, no I/O, no imports from the rest of `src/` (so it bundles cleanly into the extension).
It is the ONLY place any workspace/wall decision is made.

```ts
// Identity
export function workspaceOf(id: string | null | undefined): string | null; // "w8:p5" -> "w8"; headless/session -> null
export function sameWorkspace(a: string | null | undefined, b: string | null | undefined): boolean; // both non-null && equal

// Enforcement (one shape, used by every caller)
export interface WallDecision { allowed: boolean; reason?: string; }
export function checkWall(ownKey: string | null, targetKey: string | null, opts: { crossWorkspace: boolean }): WallDecision;

// Scoping a list to the caller's workspace (CLI read views + peer discovery)
export function scopeToWorkspace<T>(items: T[], keyOf: (t: T) => string | null, currentWs: string | null, opts: { all: boolean }): T[];
```

Rules encoded ONCE here:
- `null` current workspace (headless / no herdr) ⇒ unscoped (no wall).
- Cross-workspace is denied unless `opts.crossWorkspace === true`.
- Headless/session keys (no `:`) carry no workspace ⇒ never match a walled scope, never falsely "same".

## Consumers (they hold NO wall logic of their own)

- **CLI target resolution** (`src/entities.ts::resolveTarget`, `scopeEntitiesToWorkspace`,
  read views): call `scopeToWorkspace` / `checkWall`. Delete local `workspaceOf`/scoping.
- **CLI event stream** (`orch events`): wall to current workspace via `scopeToWorkspace` (the
  push channel may still cross WITH identity, but that is the module's decision, not ad-hoc).
- **Bridge peer tools** (`orch_agents`/`orch_send`/`orch_read` in the extension): replace
  `workspaceOf`/`ownWorkspace`/`sameWorkspace`/`workspaceMismatch` with `checkWall`/`scopeToWorkspace`.
  The `cross_workspace`/`all_workspaces` params feed `opts.crossWorkspace`, which is itself
  gated by config (see capabilities).

## Extension bundling (removes the copy-paste constraint)

Root cause of the split: the extension loads via the `~/.pi/agent/extensions` symlink and cannot
resolve `../src`. Fix: build a self-contained artifact.

- `bun build extensions/orchestrator-bridge.ts --target=node --format=esm --outfile dist/extensions/orchestrator-bridge.js`
  (typebox + the shared policy module inlined). Add `scripts.build:ext`.
- `orch setup` symlinks/copies `dist/extensions/orchestrator-bridge.js` (not the raw `.ts`).
- `orch doctor` extends its stale-extension hash check to compare the DEPLOYED bundle against a
  freshly built one; `--fix` rebuilds + redeploys.
- The bridge SOURCE imports `../src/policy/workspace.ts` normally; only the DEPLOYED artifact is bundled.

## Capabilities as policy (`worker_peer_tools`)

- `src/config.ts`: `[defaults] worker_peer_tools: boolean` (default **false**).
- Spawn path (`src/commands.ts`) computes the worker `--tools` list from ONE helper:
  base = `read,write,edit,bash,orch_ask`; add `orch_agents,orch_send,orch_read` ONLY when
  `worker_peer_tools` is true. No hardcoded tool string at the call site.
- Even with peer tools on, `checkWall` still governs cross-workspace — the override is
  config-gated, never agent-chosen.

## Enforcement — fallow

- Add `fallow check` (duplicates + `maxCyclomatic` from `.fallowrc.json`) to `scripts.check`.
- Regenerate `.fallow/dupes-baseline.json` AFTER the dedupe so the baseline reflects the clean state;
  any NEW duplicate (e.g. someone re-copies wall logic into a future adapter) fails `bun check`.

## Extensibility payoff

Any future harness/multiplexer integration (new adapter, new backend, remote muxer) calls
`checkWall`/`scopeToWorkspace` — it cannot invent its own walls. One set of rules, one module,
enforced by build + fallow. That is the whole point.
