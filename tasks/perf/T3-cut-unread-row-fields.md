# T3. Remove the three UNREAD fields from `StatusRow`

Repo: /mnt/c/dev/personal/orch. Rules: no `as` casts, no `any`, no back-compat, no `// removed` comments. Delete, never comment out.

No renderer, command, web view or extension reads `capabilities`, `sessionPath` or `turns` off a status row (recon table in /home/bryan/orch/tasks/perf/recon/R2-status-path.md). Remove the three fields everywhere the row is typed, built, validated or faked. Session-view `turns` and presence `sessionPath` are other shapes; leave them alone.

Edit `packages/orch/src/types/command.ts`:
- Delete the `EnvironmentCapabilityView` interface (L184-191, with its doc comment).
- In `StatusRow`, delete the lines `capabilities: EnvironmentCapabilityView | null;`, `sessionPath: string | null;`, `turns: unknown;`.

Edit `packages/orch/src/commands/status/rows.ts`:
- L16 import: drop `EnvironmentCapabilityView`, keep `StatusRow`.
- Delete `function backendCapabilities(entity: Entity)` (L140-150).
- In `statusRowFromEntity`, delete the three lines `capabilities: backendCapabilities(entity),`, `sessionPath: entity.sessionPath,`, `turns: pres?.status?.turns ?? sview?.turns ?? null,`.
- In `warningStatusRow`, delete `capabilities: null, sessionPath: null,` and `turns: null,`.
- If `getBackend` is now unused in this file, delete its import.

Edit `packages/orch/src/daemon/client/protocol.ts`, `daemonStatusRow` (L194-245): delete the `capabilities: z.object({...}).nullable(),` block, `sessionPath: z.string().nullable(),` and `turns: z.unknown(),`.

Delete the keys `capabilities`, `sessionPath` and `turns` from every `StatusRow` literal in these test fixtures (only the status-row literals; a presence or entity fixture that has `sessionPath` keeps it):
- `packages/orch/test/commands-status.test.ts` L47-48 (the row literal; L28 `sessionPath` is an entity, L34 `turns` is a presence status, L173 `turns: 4` is an expectation on a row: delete that expectation key)
- `packages/orch/test/session-sees-only-held-agents.test.ts` L35-36
- `packages/orch/test/status-filter-columns.test.ts` L36, L37, L40
- `packages/orch/test/status-owner-column.test.ts` L36, L37, L40
- `packages/orch/test/status-headless.test.ts` L11-12
- `packages/orch/test/status-renders-one-row-shape.test.ts` L19-20 (L38 `sessionPath` is an entity: keep)
- `packages/orch/test/status-live.test.ts` L34, L35, L38
- `packages/web/src/lib/fleet.test.ts` L11-12
- `packages/web/src/lib/web-shell.test.ts` L11-12

Run, once, after the edits (Windows side owns the disk):
```
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT'; bun check"
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT\packages\orch'; bun test test/commands-status.test.ts test/session-sees-only-held-agents.test.ts test/status-filter-columns.test.ts test/status-owner-column.test.ts test/status-headless.test.ts test/status-renders-one-row-shape.test.ts test/status-live.test.ts"
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT\packages\web'; bun test src/lib/fleet.test.ts src/lib/web-shell.test.ts"
```
If `bun check` names a file outside this list that still builds a `StatusRow` with one of the three keys, fix it too and name it in the report.

Other agents edit other files at the same time. If `bun check` is red only in files you did not touch, you are done: report `pending: <those files>`.

Report: one line. `done: <files>, check clean, tests <n> pass`, `pending: <files>`, or `blocked: <exact error>`.
