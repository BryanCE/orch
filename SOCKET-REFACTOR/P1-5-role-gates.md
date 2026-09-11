# P1-5 `role-gates` — the readers of `inboxSteering` / `question` read `bridge`

Read `SOCKET-REFACTOR/README.md` first (The wire → the adapter capability; Cross-slice
contracts). Read `CLAUDE.md` at the repo root. Paths are inside `packages/orch/`.

## You own exactly these files

- `src/worker-prompt.ts`, `test/worker-prompt.test.ts`
- `src/commands/spawn/index.ts`
- `test/check-bridge.test.ts` (the hand-kept role-name list only)

Touch nothing else. You code against `adapter.bridge: BridgeRole | null` with
`takes: readonly BridgeAction[]` (P1-3, same phase). Your scoped check is red until P1-3
lands; name that residue.

## The task

1. `src/worker-prompt.ts` `workerHeaderFor`:
   - `adapter?.question` → `adapter?.bridge?.takes.includes("answer")` for the ask clause.
   - `adapter?.inboxSteering` → `adapter?.bridge` for the spawner clause.
   - Fix the doc comment above it and the block comment near line 45 ("live presence
     inbox" → "the spawner is live; orchd queues mail for it").
2. `src/commands/spawn/index.ts` near line 97: `adapter.inboxSteering ?` →
   `adapter.bridge ?`. Fix the comment above it: the wait is for the agent's bridge to come
   up (P2-3 makes "up" mean attached).
3. `test/check-bridge.test.ts` near line 263: the composed list gains `"bridge"`, loses
   `"inboxSteering"` and `"question"`. `ENVIRONMENT_ROLE_NAMES` is derived from the port
   files, so `scripts/check-bridge.ts` needs no edit; after P1-3 lands run
   `bun run check:bridge` and paste it.
4. `test/worker-prompt.test.ts`: fixtures and test names say `bridge`, not `inboxSteering`;
   the ask clause test uses `takes` without `"answer"` for the negative case.

## Done means

`bun check` on your files (paste it; residue that only P1-3 clears is named). After P1-3
lands: `bun test test/worker-prompt.test.ts test/check-bridge.test.ts` and
`bun run check:bridge` green (paste both).
