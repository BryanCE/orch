# Tasks: make-orch-general-purpose

Ordered so orch is shippable after every group. Group 1 is a pure refactor gate; features follow the agreed priority order (adapters → backends → queue → worktrees/review → notifications → doctor/config → remote hosts). Config loading is pulled early (group 2) because later features consume it.

## 1. Refactor to src/ with a store boundary (no behavior change)

- [x] 1.1 Write a smoke-test script (`test/smoke.sh` + golden `--json` outputs) covering `orch status --json`, `panes`, `help`, `questions` against a fake `$ORCH_DIR` fixture — run it green on current main before refactoring
- [ ] 1.2 Extract `src/store.ts` (all `$ORCH_DIR` reads/writes: presence, spawned registry, atomic write helpers), `src/session.ts`, `src/herdr.ts`, `src/entities.ts` (buildEntities/resolveTarget), `src/table.ts`; `bin/orch.ts` becomes command wiring only
- [ ] 1.3 Grep-verify no `fs.` / `ORCH_DIR` access outside `src/store.ts`; smoke tests green; bump patch version

## 2. Config file

- [x] 2.1 Implement `src/config.ts`: TOML load from `$ORCH_DIR/config.toml` (Bun TOML; vendored fallback), precedence flags > env > config > defaults, schema validation with helpful errors
- [ ] 2.2 Wire `[defaults]` (adapter, backend, model, spawn cap, worktree) into spawn/dispatch paths; document config in README
- [ ] 2.3 Smoke tests for precedence (config-set default overridden by flag)

## 3. Agent adapters

- [ ] 3.1 Define `src/adapters/adapter.ts` (interface + caps from design D4); extract current pi behavior into `src/adapters/pi.ts` with zero behavior change (smoke tests green)
- [ ] 3.2 Plumb `--agent` through spawn/tile/dispatch and record adapter in spawned registry; `orch status` shows adapter id for registry-spawned agents; unknown adapter errors with the supported list
- [ ] 3.3 Add `agent` + `schema` fields to presence status.json (bridge bump to schema 2, reader tolerates 1)
- [ ] 3.4 Claude Code adapter: hooks shim (SessionStart/Stop/Notification → presence writes), `orch setup` merges hooks additively, interactive + headless commands, steer via keys fallback with warning
- [ ] 3.5 Verify claude adapter end-to-end in a herdr pane: spawn, dispatch, status transitions, result extraction
- [ ] 3.6 Codex spike (time-boxed): pick state-detection mechanism (notify hook vs session tail vs wrapper), record decision in design.md Open Questions
- [ ] 3.7 Codex adapter per spike outcome, with honest caps (coarse states acceptable, `stateFallback` marker)

## 4. Headless backend

- [ ] 4.1 Define `src/backends/backend.ts`; extract herdr spawn/close/list into `src/backends/herdr.ts` (no behavior change)
- [ ] 4.2 Implement `src/backends/headless.ts`: detached processes from `adapter.headlessCmd` (generalizing pif), registry records `{backend, handle, adapter}`
- [ ] 4.3 Enforce close-safety in core: `close --all` reaps only registry handles; headless kill verifies presence-key/pid match before signalling
- [ ] 4.4 Backend auto-selection (herdr when present, else headless) + `--backend` flag; herdr-only commands (zoom/peek/keys/move/focus) fail with clear message on headless agents
- [ ] 4.5 Verify full no-herdr loop on a PATH without herdr: spawn → status → steer → result → close; `orch events` streams transitions for headless agents

## 5. Task queue

- [x] 5.1 Implement `src/queue.ts`: append-only `queue/queue.jsonl` events + replay; `orch queue add|list|cancel [--json]`
- [ ] 5.2 Implement `orch work [--once]`: idle detection from presence, FIFO assignment honoring task constraints, atomic O_EXCL claim files, post-dispatch working-state verification with unclaim on failure
- [ ] 5.3 Retry-on-error up to `queue.max_retries`, terminal `failed` state with last error; `orch queue history [--json]`
- [ ] 5.4 Two-runner race test (spawn two `orch work --once` against one queued task; exactly one dispatch)

## 6. Worktree isolation + review

- [ ] 6.1 `orch spawn --worktree` / queue `--worktree`: worktree + `orch/<name>` branch creation, registry records worktree+branch, non-repo error, doctor-checkable gitignore entry
- [ ] 6.2 `orch review list [--json]` (done agents with commits ahead of base) and plumbing `approve`/`reject -m` (merge ff-preferred else merge-commit; conflict aborts safely; reject re-dispatches feedback into same worktree via adapter)
- [ ] 6.3 Interactive `orch review` (a/r/s loop with diff display) as sugar over the plumbing
- [ ] 6.4 `orch clean --worktrees`: remove merged/empty orphans, report unmerged with `--force` requirement
- [ ] 6.5 End-to-end: 2 worktree agents, one approve (merged + cleaned), one reject → iterate → approve

## 7. Notifications

- [x] 7.1 Implement `src/notify.ts`: `[[notify]]` config parsing, sinks (desktop chain herdr→notify-send→WSL bridge, webhook POST, command w/ JSON stdin), per-sink `on` filters, best-effort with warnings
- [ ] 7.2 Ship the WSL toast bridge script; wire `orch events --notify` and auto-attach in `orch work` *(bridge script + `events --notify` done 2026-07-13; remaining: auto-attach — blocked on 5.2 `orch work`)*
- [x] 7.3 Verify on WSL2: blocked agent produces a Windows toast; dead webhook logs a warning without disrupting dispatch

## 8. Doctor

- [ ] 8.1 Implement `src/doctor.ts` checks: bins, extension symlinks/currency, claude hooks shim currency, stale presence dirs, registry consistency, herdr version, config validity, worktree gitignore, desktop-notification chain; non-zero exit on failure *(module + tests done 2026-07-13, verified green on live env; remaining: `orch doctor` CLI wiring + claude-hooks check — blocked on bin/orch.ts ownership and task 3.4)*
- [ ] 8.2 `orch doctor --fix` for reversible fixes only, listing every change made
- [ ] 8.3 Replace `orch setup`'s ad-hoc checks with doctor calls where they overlap

## 9. Remote hosts (SSH federation)

- [ ] 9.1 Implement `src/remote.ts`: `[hosts.<name>]` config, `ssh -o BatchMode=yes <dest> orch <cmd> --json` executor with timeout; host-prefix target grammar `<host>/<target>` in resolution
- [ ] 9.2 Parallel fan-out for `status`/`questions` with HOST column, warning rows for dead hosts, `--local` flag; route write commands (steer/answer/dispatch/queue add --host) through host prefix
- [ ] 9.3 Doctor host onboarding checks (reachability, remote orch + version/schema match, remote ORCH_DIR) with copy-paste fixes
- [ ] 9.4 Audit: every observe/control command supports `--json` and runs TTY-free (orchd-readiness gate); fix any stragglers
- [ ] 9.5 End-to-end against a second machine (or localhost-as-host): remote spawn headless, merged status, remote steer/result, doctor all green

## 10. Ship

- [ ] 10.1 README rewrite: adapters, backends, queue, review, notifications, config reference, remote hosts, orchd roadmap note
- [ ] 10.2 Full smoke suite green on WSL2 and a herdr-less Linux box; version bump to 0.2.0 and npm publish
