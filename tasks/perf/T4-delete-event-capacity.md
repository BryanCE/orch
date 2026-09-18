# T4. Delete `capacity` from `NotifyEvent` and the per-event fleet recompute

Repo: /mnt/c/dev/personal/orch, package `packages/orch/`. Rules: no `as` casts, no `any`, no back-compat, no `// removed` comments. Delete, never comment out.

Nothing reads `event.capacity`, `packUsed` or `packCap` (recon: /home/bryan/orch/tasks/perf/recon/R1-report-path.md, section "Capacity: who reads"). `emitAndNotify` recomputes the whole fleet's capacity on every transition to fill it. Remove the field and the computation.

Edit `src/daemon/server/events.ts`:
- Delete the imports at L4, L5, L6: `loadPresence`, `agentViews`, `computeFleetCapacity, packsUsed`.
- In `emitAndNotify` (L65-94), delete the whole `const capacity = ...` expression (L79-90) and change L91 to:
  ```ts
  const canonical: NotifyEvent = { ...named, seq };
  ```
  Nothing else in the function changes.

Edit `src/types/notify.ts`: delete L34 `readonly capacity?: { readonly packUsed: number; readonly packCap: number };`.

Edit `src/notify/event.ts`: delete L36 `capacity: z.object({ packUsed: z.number(), packCap: z.number() }).optional(),`.

Edit `test/daemon-events.test.ts`: delete the test `"emitted events carry the pack capacity at publish time"` (L252-267). It asserts nothing about capacity. If `writeSettingsFixture`, `insertAgent`, `seedLiveProcess` or `testServices` become unused imports in that file after the delete, delete those imports too.

Run, once, after the edits (Windows side owns the disk):
```
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT'; bun check"
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT\packages\orch'; bun test test/daemon-events.test.ts test/event-identity.test.ts test/work-notify.test.ts test/herdr-notify-hardening.test.ts test/notify-events-format.test.ts"
```

Report: one line. `done: <files>, check clean, tests <n> pass` or `blocked: <exact error>`.
