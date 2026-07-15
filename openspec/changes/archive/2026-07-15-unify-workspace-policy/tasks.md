# Tasks: unify-workspace-policy

Ordered so the tree stays green after each group.

## 1. The policy module (source of truth)

- [x] 1.1 Create `src/policy/workspace.ts`: pure `workspaceOf`, `sameWorkspace`, `checkWall`,
  `scopeToWorkspace` (signatures per design). No imports from elsewhere in `src/`. Unit tests
  `test/workspace-policy.test.ts` covering: id extraction, headless/session (null) keys,
  cross-workspace denied without override, override allows, null-current-ws = unscoped.

## 2. CLI consumes the module (delete duplicated logic)

- [x] 2.1 `src/entities.ts`: replace local `workspaceOf` + scoping in `scopeEntitiesToWorkspace`
  and `resolveTarget`'s wall with calls into `src/policy/workspace.ts`. No wall logic remains here.
- [x] 2.2 `orch events` walls to the current workspace via `scopeToWorkspace` (labelled cross rows
  only under `--all`). Golden/smoke updated.
- [x] 2.3 `bun test` + `test/smoke.sh` green.

## 3. Capability policy (worker tools)

- [x] 3.1 `src/config.ts`: add `[defaults] worker_peer_tools` (default false) with validation.
- [x] 3.2 `src/commands.ts`: one `workerTools(config)` helper builds the `--tools` list
  (base `read,write,edit,bash,orch_ask`; peer tools only if enabled). Spawn path uses it; no
  hardcoded tool string. Test: default spawn omits `orch_agents`/`orch_send`.

## 4. Bridge consumes the module + bundling

- [x] 4.1 Add `scripts.build:ext` = `bun build extensions/orchestrator-bridge.ts --target=node --format=esm --outfile dist/extensions/orchestrator-bridge.js`.
- [x] 4.2 `extensions/orchestrator-bridge.ts`: import `../src/policy/workspace.ts`; delete local
  `workspaceOf`/`ownWorkspace`/`sameWorkspace`/`workspaceMismatch`; route peer-tool walls through
  `checkWall`/`scopeToWorkspace`; `cross_workspace` param → `opts.crossWorkspace`. Build must succeed.
- [x] 4.3 `orch setup` deploys the BUNDLED `dist/…` artifact; `orch doctor` stale-extension check
  compares deployed bundle vs the committed bundle, and only `--fix` performs a fresh build before redeploying.
- [x] 4.4 Verify in a real pane: spawn a worker (default config), confirm it CANNOT discover/message
  a foreign-workspace peer (peer tools absent), and same-workspace peer ops still work when enabled.

## 5. Enforce non-duplication

- [x] 5.1 Add `fallow check` to `scripts.check`; regenerate `.fallow/dupes-baseline.json` post-dedupe.
- [x] 5.2 Confirm re-introducing wall logic in a second file fails `bun check` (duplicate gate works).

## 6. Launch + wall hardening (landed this session)

- [x] (a) Spawn launches via `herdr agent start` in `src/commands.ts` `startAgentPane`, replacing pane run plus the deleted readiness/resend band-aids.
- [x] (b) `workspaceOf` regex fixed to base32-alphanumeric pane ids in `src/policy/workspace.ts` (decimal-only matching broke the wall for panes past p9).
- [x] (c) `workspaceName()` added for named workspaces.
- [x] (d) Spawn tab label follows `--name`.

## 7. Post-landing hardening (this session)

- [x] (a) Launch via `herdr agent start`, replacing pane-run launch in `src/commands.ts::startAgentPane`.
- [x] (b) Fix `workspaceOf` for base32 pane ids and add regression coverage.
- [x] (c) Type the herdr boundary with interfaces and generic `herdrJSON<T>` in `src/herdr.ts`.
- [x] (d) Make doctor warn when the extension bundle is absent and build only in the fix path (`src/doctor.ts`).
- [x] (e) `commands.ts` any-typing, catch-block `errorMessage` sweep, and cross-platform test fixes.
