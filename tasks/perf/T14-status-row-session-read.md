# T14. A status row reads the session file only when presence has no status

Repo: /mnt/c/dev/personal/orch, package `packages/orch/`. Rules: no `as` casts, no `any`, no back-compat, comments two lines max.

`statusRowFromEntity` (`src/commands/status/rows.ts:139-192`) calls `sessionViewFor` (L86-89) for every row, and that opens and parses the harness's session file. orchd runs this for every agent on every `status` RPC: 64 agents is 64 file reads per call. The session view is a fallback. Presence is the truth: a bridge reports state, model, cost, task, last text and tokens over RPC. The file is read only for an agent whose bridge never reported.

Edit `src/commands/status/rows.ts` only.

1. L148: `const sview = sessionViewFor(entity, adapter);` → `const sview = pres?.status ? null : sessionViewFor(entity, adapter);`. Give `sessionViewFor` a comment: `/** The harness's own session file, read only for an agent whose bridge never reported. */`
2. L188: `tokens: sview?.tokens ?? presenceTokens(pres),` → `tokens: presenceTokens(pres) ?? sview?.tokens ?? null,`. Presence first, like every other column.
3. Nothing else changes. `deriveModelString`, `deriveState`, `deriveCost`, `deriveViewTask` and `deriveViewLast` already read presence first and take `null` for `sview`.

Run, once, after the edits (Windows side owns the disk):
```
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT'; bun check"
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT\packages\orch'; bun test test/commands-status.test.ts test/offline-is-not-a-second-source.test.ts test/status-perf.test.ts test/status-renders-one-row-shape.test.ts test/status-unleased.test.ts"
```

A test that fails because it expects the session file to win over a reported presence status is the test being wrong: change that expectation to presence, and name the test in the report. Do not weaken any other assertion.

Report: one line. `done: rows.ts, check clean, tests <n> pass, expectations changed in: <tests or none>`, `pending: <files>`, or `blocked: <exact error>`.
