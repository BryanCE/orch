## Context

Four files hold most of orch's control plane and every one is far over a maintainable size:

| file | lines | over ~700 budget |
|---|---|---|
| `src/commands.ts` | 3,275 | ~5× |
| `extensions/pi/index.ts` (was `extensions/orchestrator-bridge.ts`) | 1,868 | ~2.7× |
| `src/doctor.ts` | 876 | ~1.2× |
| `src/notify.ts` | 702 | at the line |

`src/daemon/rpc.ts` (549) and everything else are already ≤ ~550 lines and are left alone. The reorg is a **pure code move**: the logic inside each function is unchanged; the change is which file it lives in and, for leaf functions, that they receive narrowed inputs instead of re-resolving them.

This lands after five behavioral siblings (`adapter-control-authority`, `adapter-presence-writers`, `settings-json-config`, `provider-driven-setup-doctor`, `tmux-backend-completion`). By then the monoliths already contain those changes' new code (the control dispatcher, presence writers, the settings loader replacing the TOML parser, provider-driven doctor checks, tmux port methods). This change files that code into its final home. The dead TOML config parser in `notify.ts` and the pi-only branches the siblings delete are gone before this change runs, so they are never re-split.

## Goals / Non-Goals

**Goals:**
- No source file over ~700 lines; the ceiling applied only where cohesion demands, not as a mechanical sweep.
- One nameable responsibility per module; leaf modules take resolved, narrowed inputs (adapter/backend/entity), I/O pushed to store/adapter edges.
- Every new module directly unit-testable in isolation.
- The CLI dispatch entrypoint is routing only — argv token → command function — with zero business logic.
- Old monolith paths deleted; nothing re-exports from them; all importers repointed.

**Non-Goals:**
- Any behavior change (owned by the five siblings).
- Splitting files already under the ceiling.
- A standing CI line-count guard (verification is one-shot here).

## Decisions

### D1 — `src/commands.ts` → `src/commands/` by domain

The 3,275-line file becomes one module per command domain plus a routing entrypoint. Domains are drawn along the seams the review named; commands the review did not enumerate are placed by the same single-responsibility rule rather than dumped in a catch-all.

| module | owns (representative functions) |
|---|---|
| `commands/status.ts` | view derivation + tables: `deriveView` (already de-pi'd by adapter-presence-writers; moved verbatim), `cmdStatus`, `cmdStatusLocal`, `localStatusRows`, `warningStatusRow`, `formatWorkspace`, `displayWorkspace` |
| `commands/spawn.ts` | spawn/tile: `parseSpawnFlags`, `readSpawnFlag`, `resolveSpawnSettings`, `resolveSpawnWorkspace`, `createSpawnRoot`, `executeHeadlessSpawn`, `launchAdditionalAgents`, `reportSpawnResults`, `executeSpawn`, `cmdSpawn`, `cmdTile`, `resolveAgentSettings`, `adapterCommand`, `workerTools`, `workerPrompt`, `WORKER_*`, `awaitBridgeRegistration`, `printLayout`, `paneLayout` |
| `commands/control.ts` | thin steer/model/answer/broadcast/pipe/dispatch command wrappers ONLY: `cmdSteer`, `cmdBroadcast`, `cmdPipe`, `cmdAnswer`, `cmdModel`, `setAgentModel`, `pinModels`, `cmdDispatch`, `parseDispatchFlags`, `resolveDispatchSettings`. Each wrapper parses argv and brokers to the daemon-side dispatcher `deliverControl` (`src/adapters/registry.ts` is the composition root that `adapter-control-authority` introduced) — it holds NO routing, NO caps-gating, and NO wire I/O of its own. |
| `commands/lifecycle.ts` | new/reset/reload/restart/close/abort/wait: `cmdNew`, `cmdReload`, `cmdRestart`, `doReload`, `doHardRestart`, `touchReloadSignal`, `paneForeground`, `cmdClose`, `cmdAbort`, `cmdRename`, `cmdWait` |
| `commands/panes.ts` | pure Backend-port geometry: `cmdPanes`, `cmdFocus`, `cmdZoom`, `cmdMove`, `cmdPeek`, `cmdKeys`, `cmdTabs`, `cmdTab`, `cmdWs`, `selectedGroups`, `resolveTab`, `requirePaneTarget` |
| `commands/results.ts` | result/questions harvest via `adapter.extractResult`: `cmdResult`, `cmdQuestions`, `cmdQuestionsLocal`, question helpers, `cmdTail`, `cmdSession`, `toolCallSummary`, `hms` |
| `commands/events.ts` | event stream: `cmdEvents`, `cmdNotify`, `parseEventsOptions`, `eventsSinks`, `presenceMetadata`, `eventsItems`, `eventWriter`, `seedEventStates`, `startEventsTransport`, `isNotifyEvent`, `sinkLabel` |
| `commands/review.ts` | worktree review: `cmdReview`, `cmdReviewInteractive`, `reviewItems`, `findReviewItem`, `reviewTarget` |
| `commands/queue.ts` | task queue: `cmdQueue`, `renderQueueTasks`, `writeQueueTask` |
| `commands/clean.ts` | `cmdClean`, `cleanWorktrees`, `cleanOneWorktree`, `liveWorktreeOwner`, `removeDeadAgentDirs`, `validateCleanArgs` |
| `commands/daemon.ts` | daemon client control: `cmdDaemon`, `startDaemon`, `stopDaemon`, `statusDaemon`, `reloadDaemon`, `ensureDaemon`, `waitForDaemon`, `fetchDaemonStatus`, `daemonEntrypoint`, `daemonLockPid`, `validDaemonStatus`, `writeRpc`, `parseGovernance` |
| `commands/setup.ts` | wizard + doctor command surface, keyed off configured adapter+backend (post `provider-driven-setup-doctor`): `cmdSetup`, `cmdDoctor`, `runInteractiveDoctor`, `resolveSetupSelection`, `validateSetupFlag`, `readValueFlag`, install helpers, `installClaudeHooks`, shim-prune helpers |
| `commands/target.ts` | shared identity/target plumbing: `resolveTarget`, `backendTarget`, `callerWorkspace`, `requirePresenceTarget`, `livePanePresenceEntries`, `targetHost`, `remoteCommandArgs`, `remoteWrite`, plus small shared helpers (`die`, `splitOptionFlags`, `parseTargetPrompt`, `firstNonEmptyText`, `resultText`) |
| `commands/index.ts` | dispatch table ONLY: `runCommand`, `usage`, version read, first-run detection. Maps argv → command fn; imports command modules; contains no presence I/O, no adapter/backend method calls, no config resolution. |

pi trust seeding (`TRUST_FILE`, `launchesPi`, `writeTrustEntry`) leaves the command layer entirely and moves to `src/adapters/pi.ts` — it is pi launch behavior, not command logic.

**Sibling-introduced CORE modules survive untouched — they are NOT folded into `src/commands/`.** `adapter-control-authority` already carved the control plane out of `commands.ts` into two core modules that this change does not move, split, or re-fold: `src/control/dispatch.ts` (`deliverControl` — the single daemon-side control dispatcher that owns routing, caps-gating, and adapter-command execution) and `src/adapters/registry.ts` (`resolveAdapter`/`allAdapters` — the sole legal importer of concrete adapter modules, the L4 composition root). Both keep their pre-reorg location and content. What lands in `commands/control.ts` is only the thin CLI wrappers (`cmdSteer`/`cmdAnswer`/`cmdModel`/`cmdBroadcast`/`cmdPipe`) that broker to `deliverControl`; the dispatcher and the registry stay in core. Phase A's only interaction with the registry is a repoint: the inline `resolveAdapter` was already relocated by the sibling, so any command module that resolves an adapter imports it from `src/adapters/registry.ts`.

**Alternative considered:** a flat set of ~8 files matching the review's exact list, folding events/review/queue/clean/daemon into the eight. Rejected: it would push `spawn.ts` and `control.ts` back over the ceiling and blend unrelated responsibilities (queue rendering next to spawn flags). The review's list was representative, not exhaustive; one-responsibility-per-file is the binding rule.

### D2 — `extensions/pi/index.ts` → four modules, with herdr code leaving entirely

**The directory move already landed** (see D6): the pi bridge now lives at `extensions/pi/index.ts`, per the CLAUDE.md Rule 10 layout — every harness's shipped code under `extensions/<harness>/`, named for that harness. What remains is splitting that 1,868-line entrypoint.

The split is **four** modules, not five. The former `herdr-hud` module is not one of them: everything gated on `AGENT_IDENTITY?.backend === "herdr"` is **backend**-gated, not **agent**-gated, so filing it under a harness directory would encode exactly the harness×plexer pair code Rule 9 forbids. It moves to `src/backends/herdr/hud.ts` instead.

| module | owns |
|---|---|
| `extensions/pi/presence.ts` | pi's binding to the shared writer: `computeKey`, `extractText`, `truncate`, and the pi-side status/result/inbox calls. The writer primitives themselves live in `src/presence/` (D6) and are imported, not redefined |
| `extensions/pi/daemon-ack.ts` | orchd socket ack transport: `daemonAckEndpoint`, the ack socket connect/write, `ackedMessageIds` dedupe (the socket half; the presence `ack.jsonl` fallback is the shared writer's) |
| `extensions/pi/tools.ts` | `orch_*` tool + command registration on the `ExtensionAPI`, and the pi-event guards those handlers consume |
| `extensions/pi/index.ts` | the `orchestratorBridgeExtension(pi)` composition root — wires presence + daemon-ack + tools; the single default export bundled to `dist/extensions/orchestrator-bridge.js` |
| `src/backends/herdr/hud.ts` | **leaves the harness dir**: `sendHerdrMetadata`, `nextMetadataSeq`, `bridgeWorkspace*`, `bridgeNotificationText`, `notifyHerdr`, `registerHerdrPaneState`, the `herdr:blocked` handlers, socket RPC over `HERDR_SOCKET_PATH`, `herdr notification`/`pane list` shell-outs |

`EXTENSION_HASH`/`hashExtensionFile` must keep hashing the bridge entry file and stay byte-consistent with `computeCodeHash` in `src/daemon/lifecycle.ts` (doctor compares them). The hash now covers the bundled output, not the source file, so the bundle path is what doctor already inspects — no behavior change, but the entrypoint move is verified against the doctor staleness check.

**`src/bridge-bundle.ts` (done):** `PI_EXTENSION_NAMES` stays `["orchestrator-bridge"]` and the bundle output name is unchanged. `extensionSourcePath` now resolves through a `PI_EXTENSION_SOURCE_DIR` name→dir map (`"orchestrator-bridge" → "pi"`) rather than deriving the path from the name — this deliberately decouples the shipped artifact name from the source directory, so renaming a harness dir can never rename an artifact the installed tree and doctor already know. `bun build` walks the new import graph and emits the same single ESM file, so every consumer (herdr loader, doctor staleness check, `check:bridge`) is unaffected.

### D3 — `src/doctor.ts` → `src/doctor/` one check-group per file

`doctor/bins.ts`, `doctor/presence.ts`, `doctor/backends.ts`, `doctor/extensions.ts`, `doctor/daemon.ts`, `doctor/notify.ts`, `doctor/remote.ts`, `doctor/config.ts` (config + spawned-registry + orch-dir-location + gitignore), plus `doctor/runner.ts` (`runDoctor`, `applyFixes`, `isolated`, shared `CheckResult` type) and `doctor/shared.ts` for the leaf utilities (`readJson`, `pidAlive`, `hasErrorCode`, `commandOutput`, `onPath`). The runner composes the check groups; which checks run is selected by the resolved adapter+backend (post `provider-driven-setup-doctor`), not a fixed list — that behavior arrives with the sibling, this change only relocates it.

### D4 — `src/notify.ts` split

Three modules, layered `format ← sinks ← router`, fully acyclic:

`notify/format.ts` — the pure formatter leaf: `notificationText`, `oneLine`, `payload`, the label helpers, `NotifyEvent`. Imports nothing from the notify family.
`notify/sinks.ts` — builtin sink providers (desktop, webhook, command): `createBuiltinNotifiers`, `deliverDesktop`, `windowsToast`, `desktopAvailable`, `commandAvailable`, `run`, `commandOnPath`, `registerSinkProvider`, `providerNotifier`, the provider map.
`notify/router.ts` — routing/registry: `createNotifierRegistry`, `notify`, `deliverToSink`, `entryFromSink`, `timeoutResult`.

**The formatter is a leaf because the layering requires it.** Backends import `sinks.ts` at load time to call `registerSinkProvider`. Were the formatter to live in `router.ts`, `sinks.ts` would import `router.ts`, forcing `router.ts` to evaluate first — and its module-initialization `createBuiltinNotifiers()` calls `allSinkProviders()` against a provider `Map` still in its temporal dead zone, a hard `ReferenceError` at import. Keeping the formatter below both consumers removes the edge entirely and satisfies this change's import-in-isolation scenario. The hand-rolled TOML parser (`parseToml`/`parseConfig`/`loadNotifierEntries`/`loadSinks`) is already deleted by `settings-json-config` before this change runs; sinks load from the settings loader, so there is no TOML code to split.

### D5 — Purity and boundary rules (enforced structurally, not just stylistically)

- Leaf command modules receive resolved, narrowed inputs — an already-resolved `AgentAdapter`/`Backend`/`Entity` — and never re-run `loadConfig`/`resolveTarget`/`resolveBackend` inside a leaf. The caller (the command entry or `commands/target.ts`) owns the gate.
- All presence file reads/writes stay in `src/store.ts` and the adapter modules; command modules compose those, they do not `fs.*` the presence dir directly.
- No function name uses a banned vague qualifier (`Standard`/`Default`/`Resolved`/`Generic`/`Handle`/`Process`/`Manage`/…). Names are relocated as-is; the monoliths already largely comply, and any that don't are renamed at their callers during the move (a rename is not a behavior change).
- Cyclomatic ≤ 12 per function is preserved — moving a function does not raise its complexity; no function is merged during the split.

### D6 — Harness layout, and one shared presence writer

**The layout rule (CLAUDE.md Rule 10).** Every harness's shipped in-process code lives under `extensions/<harness>/`, named for that harness — never a generic name, never parked in `scripts/`. Already landed: `extensions/orchestrator-bridge.ts`→`extensions/pi/index.ts`, `scripts/claude-hooks.ts`→`extensions/claude/index.ts`, `scripts/codex-notify.ts`→`extensions/codex/index.ts`, `src/presence-schema.ts`→`src/presence/schema.ts`, with `package.json` build entries and `src/bridge-bundle.ts` repointed and every bundle OUTPUT name preserved.

**The rule's intent is about harness-SPECIFIC code, not shared code.** Anything specific to one harness is handled in that harness's directory and nowhere else. Anything shared across harnesses gets exactly ONE implementation — the rule is not a license to triplicate.

**Today it is triplicated.** `atomicWrite` + presence-dir creation + `status.json`/`result.json` writing is implemented three separate times:

| file | `atomicWrite` | mkdir presence dir | `status.json` | `result.json` |
|---|---|---|---|---|
| `extensions/pi/index.ts` | :391 | :1132 | :782 | :1361 |
| `extensions/claude/index.ts` | :140 | :178 | :248 | :232 |
| `extensions/codex/index.ts` | :60 | :101 | :135 | :138 |

All three share only `parseIdentity` and `PRESENCE_SCHEMA` — the schema is centralized while the writer, which carries the tmp-write-then-rename atomicity subtlety, is not. That is backwards.

**Resolution:** `src/presence/writer.ts` (`atomicWrite`, presence dir helpers, status/result writers) and `src/presence/inbox.ts` (drain + `ack.jsonl` marker). All three harness artifacts import them. Presence is **core, not an integration**: it is the protocol orch defines and harnesses conform to, which is why it sits beside `src/policy/` and `src/store/` rather than under `src/adapters/`.

**Constraint:** the claude and codex shims run under whichever of node/deno/bun is on the user's PATH (`claudeHookCommand`). The shared modules must stay node-safe and dependency-light per Rule 6 — no `Bun.*`, no heavy transitive graph.

**Guard decision — `ADAPTER_WIRE_LITERALS` loses the two pi entries.** `scripts/check-bridge.ts` currently bans `"inbox.jsonl"` and `"answer.json"` from core as pi-owned wire format, which would fail `src/presence/inbox.ts` on sight. That classification is wrong and already inconsistent: `"status.json"` and `"result.json"` are not on the list and core names them 14 times (`store.ts`, `doctor.ts`, `daemon/events.ts`, `commands/lifecycle.ts`, `commands/control.ts`).

The correct test is **who defines the string**. Codex's `turn.completed` and Claude's `SessionStart` are foreign — third parties define them and orch conforms, so they stay banned. `inbox.jsonl` and `answer.json` are files **orch invented** for its own protocol; pi is merely the only harness that implements the mid-run half today. They are orch vocabulary, same as `status.json`.

So: remove those two entries, and define all four filenames as exported constants in `src/presence/`. The guard keeps its teeth by banning the raw quoted strings **outside** `src/presence/` — one definition site, and core still cannot hard-code a presence filename ad hoc. Rejected alternatives: `CORE_SCOPE_ALLOWLIST` (it means "known violation awaiting a fix", not a permanent decision, and its exact-line keys break on any edit) and exempting `src/presence/` from the core scan wholesale (far broader than the problem — it would also exempt concrete-adapter imports and identity branching).

## Risks / Trade-offs

- **[Import churn breaks a caller silently]** → every phase ends with `bun run check` (typecheck+build) and full `bun test`; a missed repoint fails the build, not runtime. Phases are per-monolith so a break is localized.
- **[Bridge bundle changes byte output and trips the doctor staleness hash]** → the bundle is rebuilt (`bun run build:dev`) as the final step of the bridge phase and `orch doctor` is run to confirm the extension-staleness check passes; the hash is expected to change once (new file layout) and stabilize.
- **[This change collides with an unfinished sibling]** → hard sequencing: it does not start until all five siblings are archived. Stated in tasks as a gate-zero precondition.
- **[The presence dedup is not a pure move and could break a shim silently]** → collapsing three `atomicWrite` copies into one changes what executes inside the claude and codex shims, which run under node/deno/bun outside any test harness. This is why step 6 is a separate phase with its own gate: a real spawn under each installed harness must be observed writing `status.json`/`result.json`, not just a green `bun test`. The pure-move claim (and task 7.3's reviewer check) covers phases 1–5 ONLY; phase 6 is explicitly excluded from it.
- **[A "pure move" smuggles in a behavior change]** → the two non-trivial moves have different owners. The deriveView `isPi` fix is owned by a sibling (`adapter-presence-writers`): it has already de-pi'd `deriveView` before this change runs, so here the function moves verbatim and no behavior is touched. The trust-seeding relocation (`TRUST_FILE`/`launchesPi`/`writeTrustEntry` → `src/adapters/pi.ts`) is owned by THIS change (Phase E) — no sibling performs it; it is a location-only move of unchanged logic. Reviewer checks the diff is move-only via `git log --stat` + no test assertions changed.

## Migration Plan

Phased, one monolith per phase, shippable after each (proposal Non-goals: no long broken intermediate state). Rollback for any phase is `git revert` of that phase's commits — no data or schema is touched.

0. **Gate:** confirm all five siblings archived (`openspec list` shows them gone from `changes/`). Do not proceed otherwise.
1. `src/commands.ts` → `src/commands/*`; repoint `bin/orch.ts`, `src/daemon/*`, tests; delete `commands.ts`. Gate: `bun run check` + `bun test`.
2. `extensions/pi/index.ts` → four modules (presence, daemon-ack, tools, index); herdr HUD out to `src/backends/herdr/hud.ts`; `bun run build:dev`; `orch doctor`. Gate: check + test + doctor extension check green. (The directory move and `bridge-bundle.ts` repoint are already done — D6.)
3. `src/doctor.ts` → `src/doctor/*`; repoint. Gate: check + test.
4. `src/notify.ts` → `notify/*`; repoint. Gate: check + test.
5. Move pi trust seeding into `src/adapters/pi.ts`; repoint. Gate: check + test.
6. **Presence dedup (NOT a pure move — its own gate):** `src/presence/{writer,inbox}.ts`; all three harness artifacts import them; drop the two pi entries from `ADAPTER_WIRE_LITERALS` and ban the raw filenames outside `src/presence/`. Gate: check + test + a real spawn under each installed harness confirming `status.json`/`result.json` still land.
7. **Verification:** run the `module-layout` scenarios and the ceiling check `find src extensions -name '*.ts' | xargs wc -l | sort -rn | head` — assert no file > 700; `grep` proves no re-export from deleted paths.

## Open Questions

- Final grouping of the doctor `config`/`presence`/`remote` check clusters may shift by ±1 file once the sibling `provider-driven-setup-doctor` fixes which checks exist — resolved at implementation time against the then-current `runDoctor`, ceiling permitting.
- Whether `commands/target.ts` shared helpers (`die`, `splitOptionFlags`) warrant a separate `commands/shared.ts` — decided by line count at move time; both stay under ceiling either way.
