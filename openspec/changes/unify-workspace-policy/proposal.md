# Proposal: unify-workspace-policy

## Why

Workspace-wall enforcement is duplicated across code paths, and the copies have already
diverged into a live security hole. `workspaceOf` / `sameWorkspace` / mismatch logic exists
independently in BOTH `src/entities.ts` (the CLI target-resolution path) and
`extensions/orchestrator-bridge.ts` (the worker peer-tool path: `orch_agents`/`orch_send`/`orch_read`).
The CLI copy was recently hardened to fail closed; the bridge copy was not — and a spawned
worker used its peer tools to reach across the wall into another workspace's fleet and delegate
a task to it (observed live 2026-07-14: `wD` worker → `wC` fleet). This is the SAME class of
breach the project already recorded twice.

The split exists because the bridge extension cannot `import ../src` — it loads through the
`~/.pi/agent/extensions` symlink, where relative imports resolve against `~/.pi/agent` and fail
(change make-orch-general-purpose, task 3.8). The "fix" was to copy the logic. That does not
scale: the end goal is unlimited agent harnesses and multiplexers integrating over time, and
every new integration that re-implements the walls is a new place for them to drift and leak.

## What Changes

- **One authoritative policy module** — `src/policy/workspace.ts` (pure, dependency-free) is the
  single source of truth for workspace identity and wall enforcement: `workspaceOf(id)`,
  `sameWorkspace(a, b)`, `assertSameWorkspace(...)`, `scopeToWorkspace(items, currentWs, opts)`.
  Every wall decision in the entire system routes through it. No workspace/wall logic lives
  anywhere else — not in `entities.ts`, not in the bridge, not in any future adapter.
- **Bundle the extension from source** — add a build step (`bun build extensions/orchestrator-bridge.ts`
  → `dist/extensions/orchestrator-bridge.js`) that inlines the shared policy module into a
  self-contained artifact. `orch setup` symlinks the BUNDLED output. This removes the
  "extensions must be standalone" constraint properly instead of duplicating code, and unblocks
  all future shared-module reuse between `src/` and extensions.
- **Capabilities are policy too** — a worker's tool grant is a policy decision, not a hardcoded
  spawn string. Default worker toolset drops peer discovery/send (`orch_agents`/`orch_send`);
  workers get `orch_ask` (talk up to the orchestrator) only. The grant is declared in
  `~/.orch/config.toml` (`[defaults] worker_peer_tools = false`), never left to the agent.
- **Enforce non-duplication in CI** — wire the already-present `fallow` duplicate check into
  `bun check` so re-copied wall logic (or any new duplication above the baseline) fails the build.

No behavior change for legitimate same-workspace operations. Cross-workspace remains reachable
only through one explicit, config-gated override evaluated in the single policy module.

## Capabilities

### New
- `workspace-policy`: one module enforcing workspace identity + walls for every path (CLI,
  bridge, future harnesses/muxers); config-gated cross-workspace override; capability/tool-grant
  policy; extension bundling so the module is shared, not copied.

## Impact

- **Code:** new `src/policy/workspace.ts`; `src/entities.ts` and `extensions/orchestrator-bridge.ts`
  delete their local wall logic and consume the module; new bundle build + `orch setup` deploy
  change; `src/config.ts` gains `worker_peer_tools`; `bin/orch.ts` spawn path reads it.
- **Build:** one `bun build` step for extensions; `bun check` gains `fallow` duplicate gate.
- **Compatibility:** deployed bridge becomes the bundled artifact; `orch doctor` verifies the
  bundle is current (extends the existing stale-extension check).
