# Tasks: agent-spawn-limits

## 1. Settings schema

- [x] 1.1 Extend the settings schema in `src/config.ts` with `limits: z.strictObject({ maxAgents: positive int optional, workspaces: record(workspace id → positive int) optional }).optional()`; bump `SETTINGS_SCHEMA` (D5) and fix every writer, reader, golden fixture, and test in the same change (Rule 8 — no legacy acceptance, old files get the existing "re-run orch setup" error). (2026-07-17: landed; bump coordinated with the concurrent `restricted-command-locks` work — shared constant now `SETTINGS_SCHEMA = 3`, one bump path, fixture fallout fixed)
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

- [ ] 4.1 `bun run check` clean and `bun run check:bridge` green.
- [ ] 4.2 `bun test` green including the new spawn-limits and doctor tests.
- [ ] 4.3 Execute the spec scenarios against the built CLI: exceed the global cap (whole-request refusal message), exceed a workspace cap with global headroom, spawn to the global cap from one workspace with no per-workspace entries, and the doctor warning for an unsatisfiable workspace cap.
