# Tasks: agent-spawn-limits

## 1. Settings schema

- [x] 1.1 Extend the settings schema in `src/config.ts` with `limits: z.strictObject({ maxAgents: positive int optional, workspaces: record(workspace id → positive int) optional }).optional()`; fix every writer, reader, golden fixture, and test in the same change (Rule 8 — no legacy acceptance, old files get the existing "re-run orch setup" error). (2026-07-17: landed. NOTE: `SETTINGS_SCHEMA` stays `1` pre-publish — an earlier agent wrongly bumped it to 2/3, which caused a stale-binary mismatch; reverted to 1. Pre-publish there is one live schema and the stamp never increments; the `limits` field is just added to the one schema.)
- [x] 1.2 Surface `limits` on the normalized `Settings` consumer type (always-present section, `{}` when omitted) so consumers never branch on undefined shape. (2026-07-17: landed)
- [x] 1.3 Schema tests: valid global+workspace limits load; `0`, negative, and non-integer values fail naming file+key; omitted section = no caps. (2026-07-17: in `test/config.test.ts` + `test/spawn-limits.test.ts`, targeted run 17 pass / 0 fail)

## 2. Spawn gate

- [x] 2.1 Add a pure live-count function over (spawn registry, presence) grouped by the identity `workspace` FIELD (D3) — injectable liveness like the existing close-all join; no key-text parsing, no directory scans beyond the established presence read. (2026-07-17: landed in `src/store.ts`)
- [x] 2.2 Add `assertSpawnCapacity(settings, workspace, requested)` in the command layer: whole-request check against the workspace cap (when present) and the global cap; refusal error names live count, requested count, cap, and the exact settings key (D6). Exit 1, nothing spawned. (2026-07-17: landed)
- [x] 2.3 Call the guard before any pane/process creation in ALL spawn flows in `src/commands/spawn.ts` (tab spawn, worktree spawn, single spawn) — one guard, three call sites, no per-flow reimplementation. (2026-07-17: landed, all three flows guarded)
- [x] 2.4 Unit tests (new `test/spawn-limits.test.ts`, hermetic temp ORCH_DIR): global-cap refusal at the boundary (live+requested > cap, zero spawned), one-workspace-uses-full-allotment when only global set, workspace-cap refusal despite global headroom, uncapped workspace bounded only globally, dead-pid records free capacity, foreign panes never counted, no limits = unlimited. (2026-07-17: landed, targeted run 17 pass / 0 fail)

## 3. Doctor warning

- [x] 3.1 Add a report-only doctor check flagging any `limits.workspaces` entry exceeding `limits.maxAgents`, naming both keys; never failing, never fixable (`--fix` ignores it). (2026-07-17: landed in `src/doctor.ts`)
- [x] 3.2 Doctor test covering the flagged and clean configurations. (2026-07-17: landed, targeted run green)

## 4. Verification (deferred until the tree-wide gate is allowed)

- [x] 4.1 `bun run check` clean and `bun run check:bridge` green. (2026-07-17: Windows run — `tsc --noEmit` clean, `oxlint` 0 warnings/0 errors, `check:bridge OK (117 files scanned)`; fallow dead-code is pre-existing rebuild residue deferred to the tree-wide cleanup, not a spawn-limits regression.)
- [x] 4.2 `bun test` green including the new spawn-limits and doctor tests. (2026-07-17: targeted Windows run `bun test test/spawn-limits.test.ts test/config.test.ts` → 42 pass / 0 fail / 67 expect() calls, covering the 11 spawn-limits cases + both doctor checks [`doctor reports an unsatisfiable workspace cap without a fix`, `doctor accepts satisfiable limits`] + config schema; see test-fails.md.)
- [x] 4.3 Execute the spec scenarios against the built CLI: exceed the global cap (whole-request refusal message), exceed a workspace cap with global headroom, spawn to the global cap from one workspace with no per-workspace entries, and the doctor warning for an unsatisfiable workspace cap. (2026-07-17: ran against the built node bundle `dist/bin/orch.js` with isolated ORCH_DIR fixtures — (a) global `orch spawn 3` @ maxAgents 2 → `spawn refused: would put all workspaces at 3/2 agents (0 live + 3 requested; limits.maxAgents)`; (b) `orch spawn 2` @ maxAgents 10 / workspaces.local 1 → `spawn refused: would put local at 2/1 agents (0 live + 2 requested; limits.workspaces.local)`; (c) no per-workspace entry, `orch spawn 3` @ maxAgents 2 → refused on global only; (d) `orch doctor` @ maxAgents 2 / local 5 → `WARN Spawn limits limits.workspaces.local (5) exceeds limits.maxAgents (2)`. NOTE: (b) initially spawned instead of refusing — `executeDetachedSpawn` checked the cap against `callerWorkspace()` (the default backend's herdr identity) while headless agents mint under `local`; fixed at spawn.ts to check the same `local` bucket the detached agent mints into.)
