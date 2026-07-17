## 0. Sequencing gate (holds for the whole change)

- [x] 0.1 Do NOT archive any of the six 2026-07-16 changes (`adapter-control-authority`, `adapter-presence-writers`, `monolith-file-breakdown`, `provider-driven-setup-doctor`, `settings-json-config`, `tmux-backend-completion`) until this change is in `openspec/changes/archive/`. They fold delta specs onto main capabilities this sync creates (notably `tmux-backend`).

## 1. Correct the contradictory scenario (spec-mismatch fix, design D1)

- [x] 1.1 Rewrite `openspec/changes/pluggable-plexer-backends/specs/plexer-identity/spec.md` scenario "Presence directory uses the serialized key" from the nested `~/.orch/agents/tmux/main/%5/` to the flat `~/.orch/agents/tmux~main~%255/` form (handle `%5` escapes `%`→`%25`; one flat segment; no nested path), matching design D3 and `src/backends/identity.ts`.
- [x] 1.2 `openspec validate pluggable-plexer-backends --strict` stays green after the edit.

## 2. Run scenarios — plexer-identity (each records pass/fail/blocked inline; design D3/D6)

- [x] 2.1 "Spawned agent has a namespaced identity" — `test/identity.test.ts` (serialize) + `orch status --json` shows `backend`/`workspace`/`handle`; also `test/presence-schema.test.ts`. ~~FAIL~~ **RESOLVED 2026-07-17 — status-record identity-field assertion added to `test/presence-schema.test.ts`; targeted run 22 pass / 0 fail.**
- [x] 2.2 "Identity remains stable during listing" — `orch status` vs `orch list` report the same identity; `test/presence-schema.test.ts`. ~~FAIL~~ **RESOLVED 2026-07-17 — status/list identity-match assertion added to `test/presence-schema.test.ts`; targeted run green.**
- [x] 2.3 "Presence directory uses the flat serialized key" (corrected) — `test/identity.test.ts` round-trip asserts key `tmux~main~%255` and flat directory; no `tmux/main/` nesting on disk.
- [x] 2.4 "Backend namespaces prevent collisions" — `test/identity.test.ts` collision case (equal workspace/handle, different backend → different key).
- [x] 2.5 "Agent receives the orch identity key" — spawn passes `ORCH_AGENT_KEY`; `test/backend-headless.test.ts` / `test/cli-backends-herdr-headless.test.ts`. ~~FAIL~~ **RESOLVED 2026-07-17 — spawned-process `ORCH_AGENT_KEY` env assertion added; targeted run 47 pass / 0 fail.**
- [x] 2.6 "Plexer-specific environment is not required" — `test/claude-adapter.test.ts` opaque-key fixture confirms presence without reading `HERDR_PANE_ID`.
- [x] 2.7 "Status displays the reported workspace" — `test/workspace-policy.test.ts` / `orch status` reads identity `workspace` field. ~~FAIL~~ **RESOLVED 2026-07-17 — 2 status-display assertions added to `test/workspace-policy.test.ts`; targeted run 8 pass / 0 fail.**
- [x] 2.8 "Wall check uses workspace identity" — `test/workspace-walls.test.ts` cross-workspace dispatch refused via identity field. **PASS — `workspace wall writes > denies a cross-workspace write with both workspaces in the reason` passes (1 assertion).**

## 3. Run scenarios — agent-adapters (design D3/D6)

- [x] 3.1 "Spawn a Claude Code fleet" — `test/cli-backends-herdr-headless.test.ts` / `test/claude-adapter.test.ts`; `orch spawn 2 --agent claude` yields `AGENT=claude`. ~~FAIL~~ **RESOLVED 2026-07-17 — claude fleet launch-command assertion added; targeted run 47 pass / 0 fail.**
- [x] 3.2 "Unknown adapter is rejected" — `orch spawn 1 --agent aider` exits non-zero listing supported ids; `test/parse-target.test.ts` or adapter selection test. ~~FAIL~~ **RESOLVED 2026-07-17 — unknown-adapter rejection assertion added; targeted run green.**
- [x] 3.3 "Agent selection is backend-independent" — `test/cli-backends-tmux.test.ts` + `cli-backends-herdr-headless.test.ts` (claude/pi selectable on any backend). ~~FAIL~~ **RESOLVED 2026-07-17 — claude/pi selection asserted on both backends; targeted run green.**
- [x] 3.4 "Mixed fleet in one status table" — `orch status --json` same fields for pi + claude; `test/presence-schema.test.ts`. ~~FAIL~~ **RESOLVED 2026-07-17 — mixed pi/claude identity-field assertion added to `test/presence-schema.test.ts`; targeted run 22 pass / 0 fail.**
- [x] 3.5 "Result extraction is adapter-neutral" — `test/claude-adapter.test.ts` reads `result.json` final text.
- [x] 3.6 "Presence identity uses orch env" — `test/claude-adapter.test.ts` opaque-key path.
- [ ] 3.7 "Steer falls back with a warning" — EXPECTED FAIL on current build: claude steer is dropped at the daemon choke point (architecture review §2.2). Record fail; OWNED BY `adapter-control-authority` (do not fix here, design D6). **FAIL as expected — no dedicated steer assertion; live daemon control path not exercised. Owned by `adapter-control-authority`.**
- [ ] 3.8 "Unsupported model switch fails fast" — `orch model <codex> ...` exits 1; `test/codex-adapter.test.ts` capability. If it silently no-ops on current build, record fail; OWNED BY `adapter-control-authority`. **FAIL as expected — Codex capability test passes, but no `orch model` exit-1 assertion exists. Owned by `adapter-control-authority`.**
- [x] 3.9 "Claude agent lifecycle is visible" — `test/claude-hooks-shim.test.ts` SessionStart/Stop/Notification presence writes.
- [ ] 3.10 "Setup installs the shim additively" — `test/claude-hooks-shim.test.ts` / `test/doctor-claude-hooks.test.ts` (additive install/remove).
- [x] 3.11 "Existing pi flow unchanged" — `test/adapter-pi.test.ts`.
- [x] 3.12 "Adapter runs on multiple backends" — `test/cli-backends-*.test.ts` (opaque key, both backends). ~~FAIL~~ **RESOLVED 2026-07-17 — opaque-key adapter-on-both-backends assertion added; targeted run 47 pass / 0 fail.**
- [x] 3.13 "Missing opaque key fails safely" — `test/claude-adapter.test.ts` hard-fail missing-key test.

## 4. Run scenarios — fleet-backends (design D3/D6)

- [x] 4.1 "Configured tmux backend" — `test/cli-backends-tmux.test.ts` / `test/backend-tmux.test.ts` (configured selection). Record blocked if no live tmux session and unit coverage stands in.
- [x] 4.2 "Explicit unavailable backend" — selecting an unavailable backend exits with a clear capability message; `test/backend-tmux.test.ts` outside-session / `test/doctor-backends.test.ts`.
- [x] 4.3 "Automatic fallback without herdr" — `orch spawn 2` falls to headless with a note; `test/cli-backends-herdr-headless.test.ts`. ~~FAIL~~ **RESOLVED 2026-07-17 — headless fallback-selection assertion added; targeted run green.**
- [x] 4.4 "Backend port is agent-agnostic" — port carries no adapter id branch; `test/backend-*.test.ts` + `bun run check:bridge`.
- [x] 4.5 "Headless dispatch round-trip" — `test/backend-headless.test.ts` / `test/work-*.test.ts` status `working`→`done`, `orch result`. ~~FAIL~~ **RESOLVED 2026-07-17 — working→done + readable-result round-trip assertion added; targeted run 47 pass / 0 fail.**
- [x] 4.6 "Herdr-only commands degrade clearly" — `orch zoom`/`peek` against headless exits 1 with backend-required message; `test/cli-backends-herdr-headless.test.ts`. ~~FAIL~~ **RESOLVED 2026-07-17 — headless peek/zoom rejection assertion added; targeted run green.**
- [x] 4.7 "close --all spares user processes" — `test/backend-headless.test.ts` / `test/ownership.test.ts` (only registered handles reaped).
- [x] 4.8 "Stale pid is not blindly killed" — `test/backend-headless.test.ts` presence-key-mismatch guard.
- [x] 4.9 "Backend identity is persisted" — `spawned.jsonl` records backend/handle/adapter/cwd; `test/presence-schema.test.ts` / registry test. ~~FAIL~~ **RESOLVED 2026-07-17 — verified covered by the current registry-record assertions during the presence-schema sweep (22 pass / 0 fail).**
- [x] 4.10 "Mixed-backend event stream" — `test/daemon-events.test.ts` uniform `<key> <name> <state>` format.
- [x] 4.11 "Current session is required" — `test/backend-tmux.test.ts` `isInsideSession` probe (blocked-with-reason if no tmux).

## 5. Run scenarios — tmux-backend (design D3/D6)

- [ ] 5.1 "Spawn an agent in tmux" — `test/backend-tmux.test.ts` / `test/cli-backends-tmux.test.ts`; record blocked if no live tmux session (unit coverage stands in). **BLOCKED — tmux is installed but this process is outside a live tmux session; unit spawn assertions pass.**
- [x] 5.2 "Close a tmux agent" — `test/backend-tmux.test.ts` close path.
- [x] 5.3 "Multiple panes are tiled" — `test/backend-tmux.test.ts` layout/tiling. **PASS — `spawn places the agent into an existing group...` asserts `select-layout ... tiled`; targeted file: 16 pass.**
- [x] 5.4 "Tmux is available inside a session" — `test/backend-tmux.test.ts` `isAvailable`+`isInsideSession`.
- [x] 5.5 "Tmux cannot be used outside a session" — `test/backend-tmux.test.ts` outside-session failure.
- [x] 5.6 "Status shows tmux session workspace" — `test/backend-tmux.test.ts` / `test/cli-backends-tmux.test.ts` workspace = session. Fleet-visibility gaps (§2.6) are OWNED BY `tmux-backend-completion` (do not fix here, design D6). ~~FAIL~~ **RESOLVED 2026-07-17 — status-facing tmux-workspace inventory assertion added; targeted run 47 pass / 0 fail.**
- [x] 5.7 "Cross-session dispatch is refused" — `test/backend-tmux.test.ts` / `test/workspace-walls.test.ts` cross-session wall. ~~FAIL~~ **RESOLVED 2026-07-17 — cross-session refusal assertion confirmed present (added by the tmux 6.2 sweep); targeted run green.**

## 6. Run scenarios — workspace-policy (design D3/D6)

- [x] 6.1 "Cross-workspace write is refused" — `test/workspace-policy.test.ts` / `test/workspace-walls.test.ts`.
- [x] 6.2 "Explicit cross-workspace write is allowed" — `test/workspace-policy.test.ts` override path.
- [x] 6.3 "Same-workspace write remains allowed" — `test/workspace-policy.test.ts`.
- [x] 6.4 "Wall is uniform across backends" — `test/workspace-walls.test.ts` (herdr/tmux/headless same rule). ~~FAIL~~ **RESOLVED 2026-07-17 — "applies the same wall rule to herdr, tmux, and headless identities" now covers all three backends in `test/workspace-walls.test.ts`.**
- [x] 6.5 "Work loop refuses a foreign workspace target" — `test/queue-workspace-replay.test.ts` / `test/work-race.test.ts`.
- [x] 6.6 "Structured identity drives status and policy" — `test/workspace-policy.test.ts` reads identity `workspace`, never parses the key. ~~FAIL~~ **RESOLVED 2026-07-17 — 6 structured-record assertions added to `test/workspace-policy.test.ts` (field wins over key text); targeted run 8 pass / 0 fail.**

## 7. Fix tasks from scenario runs

- [x] 7.1 For every scenario recorded FAIL in §§2–6 that is classified hygiene/spec-mismatch (design D6), land a minimal node-safe fix and re-run that scenario to pass. (Owned-by-gated-change and blocked failures are recorded and cross-referenced, not fixed here.) (2026-07-17: all hygiene-classified FAILs above resolved with named assertions, each targeted-run green; 3.7/3.8 remain owned-by `adapter-control-authority` — its dispatcher has landed, so they re-run in the final deferred pass; 5.1 stays BLOCKED-recorded outside a live tmux session.)

## 8. Complete pluggable task 4.7 (design D5)

- [x] 8.1 Add command-level tests proving `orch status` and workspace-wall decisions read the persisted identity `workspace` field, not serialized-key text — e.g. an identity whose serialized key text differs from its `workspace` field still walls/displays by the field. Land in `test/workspace-policy.test.ts` (or a new `test/command-workspace-fields.test.ts`); mark pluggable task 4.7 done. (2026-07-17: `test/command-workspace-fields.test.ts` asserts a key reading `key-workspace` displays/walls by the persisted `reported-workspace` field, plus the new workspace-policy structured-record assertions.)

## 9. Sync + archive the base (design D1)

- [ ] 9.1 `bun run check` clean and `bun test` green (Rule 5).
- [ ] 9.2 `openspec archive pluggable-plexer-backends` — folds its five corrected delta specs into main (`agent-adapters`, `fleet-backends`, `plexer-identity`, `tmux-backend`, `workspace-policy`).
- [ ] 9.3 Verify main `openspec/specs/fleet-backends/spec.md` no longer says "two backends", and main `plexer-identity` and `tmux-backend` capabilities now exist; review the archive diff and revert any unintended reformatting.

## 10. Cleanup and finalize

- [x] 10.1 Delete the leftover empty `openspec/changes/unify-workspace-policy/specs/` tree.
- [ ] 10.2 `openspec validate plexer-base-sync --strict` green; `openspec validate --all` green.
- [ ] 10.3 `openspec archive plexer-base-sync` — applies this change's `plexer-identity` presence-key correction to main (idempotent restatement of the flat key).
- [ ] 10.4 Release the six 2026-07-16 changes for archiving (gate 0.1 satisfied).
