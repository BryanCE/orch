# Tasks — fix-audit-findings

Standing constraints for every task: DO NOT bump `SETTINGS_SCHEMA` (stays 1). No `Bun.*`/`bun:*` in runtime code (node-safe ESM; `bun:sqlite` guarded fallback only). No compat shims or re-exports on renames — sweep every import site in the same task. Implementation only: no test/check/build runs by implementing agents; the user runs the gates once at the end.

## 1. Shared leaf modules (land first — later groups import them)

- [ ] 1.1 Create `src/adapters/transcript.ts` (node-safe, imports `util.ts` only) exporting `contentText`, `assistantText`, `lastAssistantFromJsonl`; semantics follow the adapter copies (`part !== undefined`), with a fixture test pinning empty-string content handling
- [ ] 1.2 Create `src/presence/socket-client.ts` (node-safe) exporting `readPortFile(orchDir)` and `requestJsonLine(endpoint, payload, timeoutMs)` extracted from `src/daemon/rpc.ts:206-245`
- [ ] 1.3 Add `parsePid` to `src/util.ts` (the string→pid parser duplicated in `extensions/claude/index.ts:94-101` and `extensions/codex/index.ts:34-41`)

## 2. Answer becomes a governed control verb (control-dispatch + workspace-policy deltas)

- [ ] 2.1 Add `{ kind: "answer"; text: string }` to `ControlAction` in `src/control/dispatch.ts`, gated on `caps.ask`, routed to the adapter's `answer` mechanism
- [ ] 2.2 Register an `answer` RPC method in `src/daemon/orchd.ts` beside steer/set-model, admitted through `governWrite` (wall + ownership)
- [ ] 2.3 Rewrite `cmdAnswer` (`src/commands/control.ts:107-127`): keep CLI UX checks (pending `question.json`, `--force`), replace the direct `answerAdapter.answer(...)` call with `writeRpc("answer", …)`; remove the CLI-side `caps.ask` check (dispatcher gate owns it)
- [ ] 2.4 Tests: cross-workspace answer refused by the daemon; non-owner answer refused; `caps.ask=false` refusal raised by the dispatcher; happy-path answer delivered end-to-end

## 3. Missing adapter identity is an error (control-dispatch delta)

- [ ] 3.1 Replace `resolveAdapter(x ?? "pi")` at `src/commands/control.ts:122` and `src/commands/lifecycle.ts:64,182` with loud `die` naming the target and missing identity; test each

## 4. One transcript parser (agent-adapters delta)

- [ ] 4.1 `src/adapters/claude.ts`: delete local `contentText`/`assistantText`/`assistantFromTranscript` (47-103), import from `src/adapters/transcript.ts`
- [ ] 4.2 `src/adapters/codex.ts`: delete local copies (111-177 where duplicated), import the leaf; keep codex-only notify parsing in place
- [ ] 4.3 `extensions/claude/index.ts`: delete local copies (29-82), import the leaf; also swap `numericPid` for `util.ts` `parsePid` (with `extensions/codex/index.ts`)
- [ ] 4.4 `orch tail`: replace raw `parseSession` calls in `src/commands/results.ts:223,276` with the resolved adapter's `readSessionView` port surface; error clearly when the adapter declares no `sessionTail`
- [ ] 4.5 Tests: shim and adapter produce identical text for a shared claude fixture (empty-string parts case); `orch tail` against a non-pi target uses that adapter's parser

## 5. One socket client

- [ ] 5.1 `src/daemon/rpc.ts`: consume `socket-client.ts` for port-file read + one-shot dial; extract a single `framedLineReader(socket, onLine)` used by all four read loops (`attachConnection`, `receiveResponse`, `subscribeEvents`, `rpcSubscribe`)
- [ ] 5.2 `extensions/pi/daemon-ack.ts`: delete `daemonAckEndpoint`/dial copy (34-89), use the leaf
- [ ] 5.3 `src/backends/herdr/hud.ts`: replace both dial copies (`sendHerdrMetadata` 62-93, `sendRequestAttempt` 282-301) with the leaf; herdr method vocabulary stays in hud
- [ ] 5.4 `extensions/pi/peers.ts`: delete `isPidAlive` (47-55), import `pidAlive` from `util.ts` (fixes EPERM liveness bug); test pins the EPERM case

## 6. Backend port: workspace names in, applyLayout out (fleet-backends delta)

- [ ] 6.1 Add `workspaceNames(): Map<string, string>` to the backend port; herdr implements via tabs (logic moves from wherever it lives today), tmux/headless return empty
- [ ] 6.2 Remove `applyLayout` from `src/backends/backend.ts` and all three implementations (herdr/tmux real tiling code folds into their spawn paths if still referenced there; headless stub deleted)
- [ ] 6.3 `packages/web/src/server/orch.ts`: drop the `src/backends/herdr/cli.ts` import; resolve names through the registry-resolved backend's `workspaceNames()`
- [ ] 6.4 Tests: port surface returns herdr names / empty for headless; web fleet grouping falls back to ids

## 7. Queue tasks require a workspace (task-queue delta)

- [ ] 7.1 `addTask` rejects a missing workspace; `nextQueuedTask` (`src/queue.ts:103`) drops the `undefined`-matches-all arm and skips null-workspace rows as malformed
- [ ] 7.2 Doctor reports null-workspace task rows as reappable; tests cover reject-at-enqueue and skip-at-claim

## 8. God-function splits (behavior-preserving)

- [ ] 8.1 `src/commands/setup.ts`: decompose `cmdSetup` into `recordComposition`, `installPrerequisites`, `installAdapterShims`, `wireBinaries`; move `cmdSettings` → `src/commands/settings.ts` and `cmdDoctor`/`runInteractiveDoctor` → `src/commands/doctor.ts`; sweep imports
- [ ] 8.2 `src/backends/herdr/hud.ts`: split `registerPaneStateHud` (247-536) into `herdr/pane-socket.ts` (sender/queue/retry) and `herdr/pane-state-machine.ts`; `registerPaneStateHud` remains thin wiring
- [ ] 8.3 `src/commands/status.ts`: one `statusRowFromView` shared by the json branch (155-186) and `localStatusRows` (262-290); decompose `deriveView` fallback chains
- [ ] 8.4 `src/commands/results.ts`: extract shared `collectPendingQuestions` (dedupes 108-157 vs 177-201) and `renderSessionEntry` out of `cmdTail`
- [ ] 8.5 `src/commands/spawn.ts`: `cmdTile` (363-424) reuses `parseSpawnFlags` and a shared `spawnOneIntoTab` also used by `launchAdditionalAgents`/`createSpawnRoot`
- [ ] 8.6 `extensions/pi/presence.ts`: extract model-control block (280-340) to `extensions/pi/model-control.ts`; dedupe glob logic with `config.ts` `allowedModelPatterns` if trivially shareable
- [ ] 8.7 Rename banned-verb functions in `extensions/pi/tools.ts`: `handleToolExecutionStart`→`recordToolStart`, `handleAgentEnd`→`recordAgentEnd`, `handleAgentSettled`→`settleAgentRun`

## 9. Structure sweep (moves + dead code; sweep all imports per move, no re-exports)

- [ ] 9.1 Move `src/store.ts` → `src/presence/store.ts`; relocate `SpawnedRecord` into `src/store/sqlite.ts` (kills the type cycle); update all 25 importers
- [ ] 9.2 Move `src/work.ts` → `src/daemon/work-loop.ts` (only consumer is orchd)
- [ ] 9.3 Move `src/cmd-lock.ts` → `src/control/cmd-lock.ts`
- [ ] 9.4 Rename `src/doctor-types.ts` → `src/check-result.ts`; update the 16 importers
- [ ] 9.5 Delete dead exports: `session.ts` internal types (7), `remote.ts` `RemoteFailure`/`RemoteFailureKind`/`RemoteOptions`/`runRemote` (fold `runRemote` into tests or delete with its tests' agreement), `cmd-lock.ts` `CommandLockOptions`; make `entities.ts` `TargetRef` internal

## 10. check-bridge expansion (last code group — validates the fixed tree; port-boundary-guard delta)

- [ ] 10.1 Scan `packages/*/src/**` for concrete backend/adapter imports from core
- [ ] 10.2 Dispatcher-only rule: flag `.steer(`/`.answer(`/`.setModel(` member calls in `src/` outside `control/dispatch.ts` and adapter implementations
- [ ] 10.3 Widen identity-branch check to quoted provider ids in equality position and `?? "<id>"`/`|| "<id>"` fallbacks feeding adapter/backend resolution
- [ ] 10.4 Forbid per-harness session-parser imports (`parseSession`) under `src/commands/`
- [ ] 10.5 Tests in `test/` (or the script's self-checks) demonstrating each new rule catches a violation fixture and passes the clean tree

## 11. Setup ends green (provider-setup + doctor-config deltas)

- [ ] 11.1 Setup runtime step compares the selection to the installed entrypoint's shebang (reuse doctor's `shebangRuntime`); on mismatch, confront inline naming the installed runtime and `bun run build:dev`, require explicit confirmation to record anyway
- [ ] 11.2 Setup's run offers to reap doctor-classified reappable malformed presence records (default: keep)
- [ ] 11.3 Doctor: `insideSession=false` for an available session-scoped backend becomes WARN naming the situational cause (open a workspace), not FAIL; exit code unaffected by it; a missing binary stays FAIL
- [ ] 11.4 Tests: mismatch confrontation records nothing without confirmation; consistent selection stays silent; doctor severity table covers the WARN case

## 12. Verification (user-run gates)

- [ ] 12.1 All slices report done; tree quiet; user runs `bun run check` (includes expanded check:bridge) and `bun test`, then `bun run build:dev`; fix every reported item until both gates are green
