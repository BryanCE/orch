## 0. Sequencing gate (do not skip)

- [ ] 0.1 Confirm all five behavioral siblings are archived: `openspec list` shows `adapter-control-authority`, `adapter-presence-writers`, `settings-json-config`, `provider-driven-setup-doctor`, and `tmux-backend-completion` no longer under `openspec/changes/`. Do NOT start any phase below until this holds.
- [ ] 0.2 Capture the baseline: run `bun run check` and `bun test` green on the current tree, and record the current doctor check ids (`orch doctor`) so later phases can prove the set is unchanged.

## 1. Phase A — `src/commands.ts` → `src/commands/`

- [x] 1.1 Create `src/commands/target.ts`: move `resolveTarget`, `backendTarget`, `callerWorkspace`, `requirePresenceTarget`, `livePanePresenceEntries`, `targetHost`, `remoteCommandArgs`, `remoteWrite`, and the shared helpers (`die`, `splitOptionFlags`, `parseTargetPrompt`, `firstNonEmptyText`, `resultText`). This is the shared base other command modules import. (2026-07-17: verified on disk — `src/commands/target.ts` exists)
- [x] 1.2 Create `src/commands/status.ts` (view derivation + tables), `spawn.ts`, `control.ts`, `lifecycle.ts`, `panes.ts`, `results.ts`, `events.ts`, `review.ts`, `queue.ts`, `clean.ts`, `daemon.ts`, `setup.ts` per the design D1 mapping — moving each function verbatim (no logic edits) into its domain module, importing narrowed inputs from `target.ts`. (2026-07-17: all 13 domain modules present under `src/commands/`)
- [x] 1.3 Create `src/commands/index.ts` holding ONLY the argv→command dispatch table, `usage`, version read, and first-run detection. It imports command fns from the domain modules and contains no presence I/O, no `adapter.`/`backend.` calls, no `loadConfig`/`resolveTarget`/`resolveBackend`. (2026-07-17: grep confirms zero loadConfig/resolveTarget/resolveBackend in index.ts)
- [x] 1.4 Repoint every importer of `src/commands.ts` (`bin/orch.ts`, `src/daemon/*`, any test) to the new module paths; delete `src/commands.ts`. (2026-07-17: `src/commands.ts` deleted; repo-wide grep finds zero remaining importers)
- [ ] 1.5 Gate: `bun run check` exits 0, `bun run check:bridge` passes (the port-boundary check must stay green — command wrappers must not reintroduce a concrete-adapter import or wire literal), and `bun test` passes (WSL: give CLI-spawning/git-heavy tests 15–30s timeouts). Also run `wc -l src/commands/*.ts` and assert every module is ≤ 700 lines (the tree-wide sweep in task 7.1 still runs). Fix repoints until green.

## 2. Phase B — `extensions/orchestrator-bridge.ts` → `extensions/bridge/`

- [ ] 2.1 Create `extensions/bridge/presence.ts` (backend-neutral key/dir helpers, `atomicWrite`, status/result writers, inbox drain + `ack.jsonl` marker), `herdr-hud.ts` (all `backend === "herdr"` gated code: socket RPC, toasts, pane state, `herdr:blocked`), `daemon-ack.ts` (orchd socket ack transport), `tools.ts` (`orch_*` tool/command registration + pi-event guards), and `index.ts` (the `orchestratorBridgeExtension` composition + default export). Move verbatim.
- [ ] 2.2 Update `src/bridge-bundle.ts` so `extensionSourcePath` resolves the `orchestrator-bridge` entry to `extensions/bridge/index.ts`; keep `PI_EXTENSION_NAMES = ["orchestrator-bridge"]` and the output name `dist/extensions/orchestrator-bridge.js` unchanged.
- [ ] 2.3 Rebuild the bundle: `bun run build:dev`. Run `orch doctor` and confirm the bridge extension-staleness check passes (the hash changes once, then stabilizes).
- [ ] 2.4 Gate: `bun run check` exits 0, `bun run check:bridge` passes, and `bun test` passes.

## 3. Phase C — `src/doctor.ts` → `src/doctor/`

- [ ] 3.1 Create `src/doctor/` modules: `shared.ts` (leaf utils `readJson`/`pidAlive`/`hasErrorCode`/`commandOutput`/`onPath`), one module per check group (`bins`, `presence`, `backends`, `extensions`, `hooks`, `daemon`, `notify`, `remote`, `config`), and `runner.ts` (`runDoctor`, `applyFixes`, `isolated`, shared `CheckResult` type). Move verbatim.
- [ ] 3.2 Repoint every importer of `src/doctor.ts` (`commands/setup.ts`, daemon, tests); delete `src/doctor.ts`.
- [ ] 3.3 Gate: `bun run check` exits 0, `bun run check:bridge` passes, `bun test` passes, and `orch doctor` emits the same set of check ids recorded in task 0.2.

## 4. Phase D — `src/notify.ts` split

- [ ] 4.1 Create `src/notify/sinks.ts` (builtin desktop/webhook/command providers, provider registration) and `src/notify/router.ts` (registry, `notify`, `deliverToSink`, `notificationText`, payload/label helpers). Move verbatim; do NOT re-create the TOML parser (already deleted by `settings-json-config`).
- [ ] 4.2 Repoint importers of `src/notify.ts`; delete it.
- [ ] 4.3 Gate: `bun run check` exits 0, `bun run check:bridge` passes, and `bun test` passes.

## 5. Phase E — pi trust seeding relocation

- [ ] 5.1 Move `TRUST_FILE`, `launchesPi`, `writeTrustEntry` from the (now former) command layer into `src/adapters/pi.ts`; repoint the spawn call site to the pi adapter.
- [ ] 5.2 Gate: `bun run check` exits 0, `bun run check:bridge` passes, `bun test` passes, and `grep -rn "trust.json\|writeTrustEntry\|launchesPi" src/commands/` returns nothing.

## 6. Phase F — module tests and purity audit

- [x] 6.1 Add or relocate direct unit tests so each new module is exercised in isolation (import the module, not the full CLI) — mirror the injectable-liveness style the backend/headless tests already use. (2026-07-17: 14 new `test/commands-*.test.ts` files, one per domain module — target parsing, status derivation, lifecycle fail-fast, result routing, queue round-trip, daemon validation, clean reaping, spawn/setup/events/review/control/panes/index helpers; targeted run 33 pass / 0 fail)
- [ ] 6.2 Audit leaf command modules: confirm no leaf (outside `target.ts` and the resolving command entry) calls `loadConfig`/`resolveTarget`/`resolveBackend` or performs raw `fs` reads/writes against `~/.orch/agents`; narrow any that do.
- [ ] 6.3 Audit function names across the moved modules for banned vague qualifiers (`Standard`/`Default`/`Resolved`/`Generic`/`Common`/`Handle`/`Process`/`Manage`/…); rename offenders and their callers (rename only — no logic change).

## 7. Phase G — verification (run the scenarios, do not self-certify)

- [ ] 7.1 Run the ceiling check `find src extensions -name '*.ts' | xargs wc -l | sort -rn | head` and assert the top count is ≤ 700 and none of the four deleted monolith paths appear.
- [ ] 7.2 Execute every `module-layout` scenario against the tree: domain/bridge/doctor/notify modules exist and are ≤ 700 lines; `extensions/bridge/` herdr grep names only `herdr-hud`; `src/commands/index.ts` has no business logic; deleted paths have zero re-exports (`grep`) and are untracked (`git ls-files`).
- [ ] 7.3 Confirm the change is a pure move: `git log --stat` for the phases shows relocations only, and no behavioral test assertion was modified.
- [ ] 7.4 Final gate: `bun run check` exits 0, `bun run check:bridge` passes, and full `bun test` passes on an idle machine.
