# Tasks — fix-audit-findings

Standing constraints for every task: DO NOT bump `SETTINGS_SCHEMA` (stays 1). No `Bun.*`/`bun:*` in runtime code (node-safe ESM; `bun:sqlite` guarded fallback only). No compat shims or re-exports on renames — sweep every import site in the same task. Implementation only: no test/check/build runs by implementing agents; the user runs the gates once at the end.

## 1. Shared leaf modules (land first — later groups import them)

- [x] 1.1 Create `src/adapters/transcript.ts` (node-safe, imports `util.ts` only) exporting `contentText`, `assistantText`, `lastAssistantFromJsonl`; semantics follow the adapter copies (`part !== undefined`), with a fixture test pinning empty-string content handling
- [x] 1.2 Create `src/presence/socket-client.ts` (node-safe) exporting `readPortFile(orchDir)` and `requestJsonLine(endpoint, payload, timeoutMs)` extracted from `src/daemon/rpc.ts:206-245`
- [x] 1.3 Add `parsePid` to `src/util.ts` (the string→pid parser duplicated in `extensions/claude/index.ts:94-101` and `extensions/codex/index.ts:34-41`)

## 2. Answer becomes a governed control verb (control-dispatch + workspace-policy deltas)

- [x] 2.1 Add `{ kind: "answer"; text: string }` to `ControlAction` in `src/control/dispatch.ts`, gated on `caps.ask`, routed to the adapter's `answer` mechanism
- [x] 2.2 Register an `answer` RPC method in `src/daemon/orchd.ts` beside steer/set-model, admitted through `governWrite` (wall + ownership)
- [x] 2.3 Rewrite `cmdAnswer` (`src/commands/control.ts:107-127`): keep CLI UX checks (pending `question.json`, `--force`), replace the direct `answerAdapter.answer(...)` call with `writeRpc("answer", …)`; remove the CLI-side `caps.ask` check (dispatcher gate owns it)
- [x] 2.4 Tests: cross-workspace answer refused by the daemon; non-owner answer refused; `caps.ask=false` refusal raised by the dispatcher; happy-path answer delivered end-to-end

## 3. Missing adapter identity is an error (control-dispatch delta)

- [x] 3.1 Replace `resolveAdapter(x ?? "pi")` at `src/commands/control.ts:122` and `src/commands/lifecycle.ts:64,182` with loud `die` naming the target and missing identity; test each

## 4. One transcript parser (agent-adapters delta)

- [x] 4.1 `src/adapters/claude.ts`: delete local `contentText`/`assistantText`/`assistantFromTranscript` (47-103), import from `src/adapters/transcript.ts`
- [x] 4.2 `src/adapters/codex.ts`: delete local copies (111-177 where duplicated), import the leaf; keep codex-only notify parsing in place
- [x] 4.3 `extensions/claude/index.ts`: delete local copies (29-82), import the leaf; also swap `numericPid` for `util.ts` `parsePid` (with `extensions/codex/index.ts`)
- [x] 4.4 `orch tail`: replace raw `parseSession` calls in `src/commands/results.ts:223,276` with the resolved adapter's `readSessionView` port surface; error clearly when the adapter declares no `sessionTail`
- [x] 4.5 Tests: shim and adapter produce identical text for a shared claude fixture (empty-string parts case); `orch tail` against a non-pi target uses that adapter's parser

## 5. One socket client

- [x] 5.1 `src/daemon/rpc.ts`: consume `socket-client.ts` for port-file read + one-shot dial; extract a single `framedLineReader(socket, onLine)` used by all four read loops (`attachConnection`, `receiveResponse`, `subscribeEvents`, `rpcSubscribe`)
- [x] 5.2 `extensions/pi/daemon-ack.ts`: delete `daemonAckEndpoint`/dial copy (34-89), use the leaf
- [x] 5.3 `src/backends/herdr/hud.ts`: replace both dial copies (`sendHerdrMetadata` 62-93, `sendRequestAttempt` 282-301) with the leaf; herdr method vocabulary stays in hud
- [x] 5.4 `extensions/pi/peers.ts`: delete `isPidAlive` (47-55), import `pidAlive` from `util.ts` (fixes EPERM liveness bug); test pins the EPERM case

## 6. Backend port: workspace names in, applyLayout out (fleet-backends delta)

- [x] 6.1 Add `workspaceNames(): Map<string, string>` to the backend port; herdr implements via tabs (logic moves from wherever it lives today), tmux/headless return empty
- [x] 6.2 Remove `applyLayout` from `src/backends/backend.ts` and all three implementations (herdr/tmux real tiling code folds into their spawn paths if still referenced there; headless stub deleted)
- [x] 6.3 `packages/web/src/server/orch.ts`: drop the `src/backends/herdr/cli.ts` import; resolve names through the registry-resolved backend's `workspaceNames()`
- [x] 6.4 Tests: port surface returns herdr names / empty for headless; web fleet grouping falls back to ids

## 7. Queue tasks require a workspace (task-queue delta)

- [x] 7.1 `addTask` rejects a missing workspace; `nextQueuedTask` (`src/queue.ts:103`) drops the `undefined`-matches-all arm and skips null-workspace rows as malformed
- [x] 7.2 Doctor reports null-workspace task rows as reappable; tests cover reject-at-enqueue and skip-at-claim

## 8. God-function splits (behavior-preserving)

- [x] 8.1 `src/commands/setup.ts`: decompose `cmdSetup` into `recordComposition`, `installPrerequisites`, `installAdapterShims`, `wireBinaries`; move `cmdSettings` → `src/commands/settings.ts` and `cmdDoctor`/`runInteractiveDoctor` → `src/commands/doctor.ts`; sweep imports
- [x] 8.2 `src/backends/herdr/hud.ts`: split `registerPaneStateHud` (247-536) into `herdr/pane-socket.ts` (sender/queue/retry) and `herdr/pane-state-machine.ts`; `registerPaneStateHud` remains thin wiring
- [x] 8.3 `src/commands/status.ts`: one `statusRowFromView` shared by the json branch (155-186) and `localStatusRows` (262-290); decompose `deriveView` fallback chains
- [x] 8.4 `src/commands/results.ts`: extract shared `collectPendingQuestions` (dedupes 108-157 vs 177-201) and `renderSessionEntry` out of `cmdTail`
- [x] 8.5 `src/commands/spawn.ts`: `cmdTile` (363-424) reuses `parseSpawnFlags` and a shared `spawnOneIntoTab` also used by `launchAdditionalAgents`/`createSpawnRoot`
- [x] 8.6 `extensions/pi/presence.ts`: extract model-control block (280-340) to `extensions/pi/model-control.ts`; dedupe glob logic with `config.ts` `allowedModelPatterns` if trivially shareable
- [x] 8.7 Rename banned-verb functions in `extensions/pi/tools.ts`: `handleToolExecutionStart`→`recordToolStart`, `handleAgentEnd`→`recordAgentEnd`, `handleAgentSettled`→`settleAgentRun`

## 9. Structure sweep (moves + dead code; sweep all imports per move, no re-exports)

- [x] 9.1 Move `src/store.ts` → `src/presence/store.ts`; relocate `SpawnedRecord` into `src/store/sqlite.ts` (kills the type cycle); update all 25 importers
- [x] 9.2 Move `src/work.ts` → `src/daemon/work-loop.ts` (only consumer is orchd)
- [x] 9.3 Move `src/cmd-lock.ts` → `src/control/cmd-lock.ts`
- [x] 9.4 Rename `src/doctor-types.ts` → `src/check-result.ts`; update the 16 importers
- [x] 9.5 Delete dead exports: `session.ts` internal types (7), `remote.ts` `RemoteFailure`/`RemoteFailureKind`/`RemoteOptions`/`runRemote` (fold `runRemote` into tests or delete with its tests' agreement), `cmd-lock.ts` `CommandLockOptions`; make `entities.ts` `TargetRef` internal

## 10. check-bridge expansion (last code group — validates the fixed tree; port-boundary-guard delta)

- [x] 10.1 Scan `packages/*/src/**` for concrete backend/adapter imports from core
- [x] 10.2 Dispatcher-only rule: flag `.steer(`/`.answer(`/`.setModel(` member calls in `src/` outside `control/dispatch.ts` and adapter implementations
- [x] 10.3 Widen identity-branch check to quoted provider ids in equality position and `?? "<id>"`/`|| "<id>"` fallbacks feeding adapter/backend resolution
- [x] 10.4 Forbid per-harness session-parser imports (`parseSession`) under `src/commands/`
- [x] 10.5 Tests in `test/` (or the script's self-checks) demonstrating each new rule catches a violation fixture and passes the clean tree

## 11. Setup ends green (provider-setup + doctor-config deltas)

- [x] 11.1 Setup runtime step compares the selection to the installed entrypoint's shebang (reuse doctor's `shebangRuntime`); on mismatch, confront inline naming the installed runtime and `bun run build:dev`, require explicit confirmation to record anyway
- [x] 11.2 Setup's run offers to reap doctor-classified reappable malformed presence records (default: keep)
- [x] 11.3 Doctor: `insideSession=false` for an available session-scoped backend becomes WARN naming the situational cause (open a workspace), not FAIL; exit code unaffected by it; a missing binary stays FAIL
- [x] 11.4 Tests: mismatch confrontation records nothing without confirmation; consistent selection stays silent; doctor severity table covers the WARN case

## 12. Live-found control-plane defects (2026-07-20 dogfood session; identity fix already hand-applied)

- [x] 12.1 ONE key per agent: pane spawn paths no longer re-mint a second identity from the backend pane handle — env `ORCH_AGENT_KEY`, registry row, presence dir, and daemon ack all join on the name-based key minted before launch (`src/commands/spawn.ts` root/additional/tile paths; doc fixed in `src/backends/identity.ts`). Applied by hand mid-session; tests still needed: a spawn-path test asserting registry key === env key, and resolveTarget no longer yielding two candidates per agent
- [x] 12.2 Daemon-event resilience — PREMISE CORRECTED during implementation: the pi bridge has NO orchd socket subscription; inbox/steer/model delivery is file-based (inbox.jsonl poll + fs.watch in extensions/pi/presence.ts) and already survives daemon restarts. The live "agents deaf to dispatch" symptom was fully explained by 12.1 (identity-key mismatch) + the settings schema skew. Hardened the `subscribeEvents` primitive in src/daemon/rpc.ts anyway (reconnect-with-backoff 250ms→5s, fresh port-file read per dial, `since: 0` on reconnect, close() stops the loop, unref'd timers) so any future daemon-event consumer is restart-proof; `orch events` keeps its intentional die-on-disconnect. Test: test/orchd-rpc-reconnect.test.ts
- [x] 12.3 `mintIdentity` port audit: with the pane paths fixed, `mintIdentity` has one legitimate caller (headless detached). Decide wire-in or removal from the port alongside 6.2's `applyLayout` removal
- [x] 12.4 Doctor/setup spec drift: the doctor-config spec's supported-keys list omits the `runtime` key the code requires — sync the spec delta; the CLI↔daemon schema-skew incident (CLI requires `runtime`, older running daemon rejects it) becomes a doctor check: daemon code hash mismatch against the installed CLI must WARN with a `orch daemon reload` hint before any write is attempted
- [x] 12.5 Setup end-to-end smoke (extends group 11): setup's closing pass performs one real spawn+dispatch+result round-trip (headless, trivial prompt) and fails loudly if the write path is broken — "setup completed" must mean "orch can actually deliver work"
- [x] 12.6 Interactive launches carry the model: `pi.interactiveCmd`/`restrictedInteractiveCmd` and `claude.interactiveCmd` dropped `opts.model` while every headless variant passed it — pane workers always launched on the harness's own saved default, ignoring orch's settings/flags. Fixed by hand; tests still needed asserting every adapter's interactive command includes the resolved model
- [x] 12.7 Bridge model-apply rejects a registry-present model: in-agent set-model failed with "Model not in registry (session still booting?)" for `openai-codex/gpt-5.6-luna:medium` even though `pi --list-models` lists it — diagnose the bridge's model-registry lookup in `extensions/pi` model-control (pattern matching? registry snapshot taken before provider auth loads?) and add a retry-after-registry-ready path
- [x] 12.8 Worker extension hygiene: bare worker launches load the user's full extension set (session-viewer's sqlite hit SQLITE_BUSY with 4 concurrent workers) — workers should launch with the minimal extension set the adapter declares (bridge + HUD), not every user extension

- [x] 12.9 SessionView port grows an optional `entries` surface (per-turn user/assistant/tool items) each adapter populates from its OWN parser — restores `orch tail`/`orch session` rich per-entry rendering lost when tail was routed through the port (4.4), without re-importing any per-harness parser into `src/commands/`

## 13. Verification (user-run gates)

- [x] 13.1 All slices report done; tree quiet; user runs `bun run check` (includes expanded check:bridge) and `bun test`, then `bun run build:dev`; fix every reported item until both gates are green
