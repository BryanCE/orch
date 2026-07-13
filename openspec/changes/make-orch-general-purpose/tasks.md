# Tasks: make-orch-general-purpose

Ordered so orch is shippable after every group. Group 1 is a pure refactor gate; features follow the agreed priority order (adapters → backends → queue → worktrees/review → notifications → doctor/config → remote hosts). Config loading is pulled early (group 2) because later features consume it.

## 1. Refactor to src/ with a store boundary (no behavior change)

- [x] 1.1 Write a smoke-test script (`test/smoke.sh` + golden `--json` outputs) covering `orch status --json`, `panes`, `help`, `questions` against a fake `$ORCH_DIR` fixture — run it green on current main before refactoring
- [x] 1.2 Extract `src/store.ts` (all `$ORCH_DIR` reads/writes: presence, spawned registry, atomic write helpers), `src/session.ts`, `src/herdr.ts`, `src/entities.ts` (buildEntities/resolveTarget), `src/table.ts`; `bin/orch.ts` becomes command wiring only *(2026-07-13: commands live in `src/commands.ts`; splitting that further rides with groups 3-4)*
- [x] 1.3 Grep-verify no `fs.` / `ORCH_DIR` access outside `src/store.ts`; smoke tests green (version bumps happen only at publish, task 10.2)

## 2. Config file

- [x] 2.1 Implement `src/config.ts`: TOML load from `$ORCH_DIR/config.toml` (Bun TOML; vendored fallback), precedence flags > env > config > defaults, schema validation with helpful errors
- [x] 2.2 Wire `[defaults]` (adapter, backend, model, spawn cap, worktree) into spawn/dispatch paths; document config in README
- [x] 2.3 Smoke tests for precedence (config-set default overridden by flag) *(2026-07-13: spawn_cap fixture; config/flag/env/flag-over-env/default goldens, fake herdr)*

## 3. Agent adapters

- [x] 3.1 Define `src/adapters/adapter.ts` (interface + caps from design D4); extract current pi behavior into `src/adapters/pi.ts` with zero behavior change (smoke tests green) *(2026-07-13: modules + tests done; commands.ts consumes presence directly until 3.2 wiring)*
- [x] 3.2 Plumb `--agent` through spawn/tile/dispatch and record adapter in spawned registry; `orch status` shows adapter id for registry-spawned agents; unknown adapter errors with the supported list *(2026-07-13: presence agent field preferred, registry fallback; also shipped the orch status `‡` stale-extension marker deferred from orchd 3.4)*
- [x] 3.3 Add `agent` + `schema` fields to presence status.json (bridge bump to schema 2, reader tolerates 1) *(2026-07-13: typed PresenceStatus, mixed-schema tests; consumers audited: entities, work, adapters/pi, commands, daemon/events)*
- [ ] 3.4 Claude Code adapter: hooks shim (SessionStart/Stop/Notification → presence writes), `orch setup` merges hooks additively, interactive + headless commands, steer via keys fallback with warning
- [ ] 3.5 Verify claude adapter end-to-end in a herdr pane: spawn, dispatch, status transitions, result extraction
- [x] 3.6 Codex spike (time-boxed): pick state-detection mechanism (notify hook vs session tail vs wrapper), record decision in design.md Open Questions *(2026-07-13: decision recorded in design.md — notify hook primary, resume-based steering, layered result extraction; 3.7 first experiment spelled out there)*
- [ ] 3.7 Codex adapter per spike outcome, with honest caps (coarse states acceptable, `stateFallback` marker)

- [ ] 3.9 STRICT WORKSPACE WALLS (OPERATOR ORDER 2026-07-13, restated twice — this is a hard product principle): agents/orchestrators operate ONLY within their workspace, and EVERY read surface defaults to the current workspace — `orch status`, `questions`, `events`, `tabs`, `result`, all of it shows current-workspace rows only, `--all` opt-in for cross-workspace views; bridge peer tools `orch_agents`/`orch_send`/`orch_read` same-workspace only with explicit override; queue/work-engine idle-agent selection workspace-scoped. Any row or payload that DOES cross the wall (`--all` views, toasts) must carry unmistakable workspace identity — name prefix + per-workspace color — so nothing from two fleets is ever visually confusable. **EXCEPTION — notifications (toasts) DO cross workspaces**: the user wants every fleet's toasts, but each must be color-coded and carry the origin workspace/agent name so provenance is obvious at a glance. Observed live twice: a w8 worker sent its completion report to a w1 pane (foreign turn burned), and the daemon work loop assigned a w8-queued task to idle w1:p1K (orchd live-verify, 2026-07-13). Also found: lifecycle `logPath()` falls back to `process.cwd()` instead of ORCH_DIR — daemon log lands in whatever dir started it; fix alongside
- [ ] 3.10 **Agent-teams is NOT an orch feature** (operator ruling 2026-07-13, final): pi agent-teams is a separate project, not prod-ready, and orch agents were only using it because pi auto-discovers global extensions — worker panes inherited it and self-delegated into invisible in-process children (no pane/presence/status/toast visibility, unattributable cost, sleep-poll babysitter parents, cross-workspace team-config leakage). **Disabled globally 2026-07-13** (moved to ~/.pi/agent/extensions-disabled/). Durable product fix: `orch spawn` launches workers with an explicit extension ALLOWLIST (bridge + herdr-agent-state + approved set) instead of trusting global discovery, so nothing installed later can silently enter worker panes. If agent-teams ever returns, it needs its own openspec change meeting the 3.9 walls + full presence visibility first
- [x] 3.8 (CLOSED won't-do 2026-07-13) Dedupe extension↔src utility clones (atomicWrite, socket-finish shape) into a shared module both import — **PREMISE DISPROVEN 2026-07-13 (later same day): the earlier probe used a direct repo path, but the LIVE deployment loads extensions through the `~/.pi/agent/extensions` symlink, where relative `../src` imports resolve against `~/.pi/agent` and fail** ("Cannot find module ../src/daemon/lifecycle.ts", broke every bridge reload). Extensions MUST stay standalone until dedupe goes through a build/bundle step or the loader realpaths before resolving

## 4. Headless backend

- [x] 4.1 Define `src/backends/backend.ts`; extract herdr spawn/close/list into `src/backends/herdr.ts` (no behavior change) *(2026-07-13: commit 72bcd78)*
- [x] 4.2 Implement `src/backends/headless.ts`: detached processes from `adapter.headlessCmd` (generalizing pif), registry records `{backend, handle, adapter}` *(2026-07-13: commit 72bcd78; test/backend-headless.test.ts)*
- [x] 4.3 Enforce close-safety in core: `close --all` reaps only registry handles; headless kill verifies presence-key/pid match before signalling *(2026-07-13: cmdClose reaps spawnedPanes() only; HeadlessBackend.close() refuses missing/mismatched pid+key — routing close through backend selection rides with 4.4)*
- [ ] 4.4 Backend auto-selection (herdr when present, else headless) + `--backend` flag; herdr-only commands (zoom/peek/keys/move/focus) fail with clear message on headless agents
- [ ] 4.5 Verify full no-herdr loop on a PATH without herdr: spawn → status → steer → result → close; `orch events` streams transitions for headless agents

## 5. Task queue

- [x] 5.1 Implement `src/queue.ts`: append-only `queue/queue.jsonl` events + replay; `orch queue add|list|cancel [--json]`
- [x] 5.2 Implement `orch work [--once]`: idle detection from presence, FIFO assignment honoring task constraints, atomic O_EXCL claim files, post-dispatch working-state verification with unclaim on failure *(2026-07-13; includes settlement pass for claims that finish after the ack window)*
- [x] 5.3 Retry-on-error up to `queue.max_retries`, terminal `failed` state with last error *(done 2026-07-13)*; `orch queue history [--json]`
- [x] 5.4 Two-runner race test (spawn two `orch work --once` against one queued task; exactly one dispatch) *(2026-07-13: test/work-race.test.ts, claim-side invariant)*

## 6. Worktree isolation + review

- [x] 6.1 `orch spawn --worktree` / queue `--worktree`: worktree + `orch/<name>` branch creation, registry records worktree+branch, non-repo error, doctor-checkable gitignore entry *(2026-07-13: completed gaps over pre-existing src/worktree.ts; doctor gitignore check with copy-paste fix)*
- [x] 6.2 `orch review list [--json]` (done agents with commits ahead of base) and plumbing `approve`/`reject -m` (merge ff-preferred else merge-commit; conflict aborts safely; reject re-dispatches feedback into same worktree via adapter) *(2026-07-13: git plumbing lives in src/worktree.ts helpers; hermetic temp-repo tests)*
- [ ] 6.3 Interactive `orch review` (a/r/s loop with diff display) as sugar over the plumbing
- [x] 6.4 `orch clean --worktrees`: remove merged/empty orphans, report unmerged with `--force` requirement *(2026-07-13: hermetic temp-repo tests; plain clean unchanged)*
- [ ] 6.5 End-to-end: 2 worktree agents, one approve (merged + cleaned), one reject → iterate → approve

## 7. Notifications

- [x] 7.1 Implement `src/notify.ts`: `[[notify]]` config parsing, sinks (desktop chain herdr→notify-send→WSL bridge, webhook POST, command w/ JSON stdin), per-sink `on` filters, best-effort with warnings
- [ ] 7.2 Ship the WSL toast bridge script; wire `orch events --notify` and auto-attach in `orch work` *(bridge script + `events --notify` done 2026-07-13; remaining: auto-attach — blocked on 5.2 `orch work`)*
- [x] 7.3 Verify on WSL2: blocked agent produces a Windows toast; dead webhook logs a warning without disrupting dispatch
- [x] 7.4 Event payloads carry real context (operator order 2026-07-13): agent name, tab, model, state transition old→new, task summary, lastError text — in `orch events` output, `--json`, and every sink payload; a bare "state changed" line is a bug
- [x] 7.5 herdr-alert sink: when the herdr backend is active, deliver notifications through herdr's native alert/notify channel as a first-class `[[notify]]` sink type (auto-registered when backend=herdr); stays completely absent on headless
- [x] 7.6 Outcome-first notification titles (operator order 2026-07-13): every sink title/first-line leads with the terminal state + agent — `DONE w-2: <task summary>`, `ERROR w-2: <lastError>`, `BLOCKED w-2: <question>` — one state per notification, never a mixed label like "completion/error"

## 8. Doctor

- [ ] 8.1 Implement `src/doctor.ts` checks: bins, extension symlinks/currency, claude hooks shim currency, stale presence dirs, registry consistency, herdr version, config validity, worktree gitignore, desktop-notification chain; non-zero exit on failure *(module + tests + `orch doctor` CLI done 2026-07-13, verified green live; remaining: claude-hooks check — blocked on task 3.4)*
- [x] 8.2 `orch doctor --fix` for reversible fixes only, listing every change made
- [ ] 8.3 Replace `orch setup`'s ad-hoc checks with doctor calls where they overlap

## 9. Remote hosts (SSH federation)

- [x] 9.1 Implement `src/remote.ts`: `[hosts.<name>]` config, `ssh -o BatchMode=yes <dest> orch <cmd> --json` executor with timeout; host-prefix target grammar `<host>/<target>` in resolution *(2026-07-13: typed failures dead-host/timeout/non-JSON; hermetic recorded-fake-ssh tests; command fan-out wiring rides with 9.2)*
- [ ] 9.2 Parallel fan-out for `status`/`questions` with HOST column, warning rows for dead hosts, `--local` flag; route write commands (steer/answer/dispatch/queue add --host) through host prefix
- [ ] 9.3 Doctor host onboarding checks (reachability, remote orch + version/schema match, remote ORCH_DIR) with copy-paste fixes
- [ ] 9.4 Audit: every observe/control command supports `--json` and runs TTY-free (orchd-readiness gate); fix any stragglers
- [ ] 9.5 End-to-end against a second machine (or localhost-as-host): remote spawn headless, merged status, remote steer/result, doctor all green

## 10. Ship

- [ ] 10.1 README rewrite: adapters, backends, queue, review, notifications, config reference, remote hosts, orchd roadmap note
- [ ] 10.2 Full smoke suite green on WSL2 and a herdr-less Linux box; version bump to 0.2.0 and npm publish
