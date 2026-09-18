# T10. `capacityLine`: an `offlineCapacity` function instead of an IIFE in a ternary

Repo: /mnt/c/dev/personal/orch, package `packages/orch/`. Rules: no `as` casts, no `any`, comments two lines max.

Edit `src/commands/status/index.ts` only. `capacityLine` (L14-23) holds an IIFE inside a ternary. Replace it with a function and a plain `if`:

```ts
/** The capacity computed from the store, for a status run with no daemon. */
function offlineCapacity(services: Services, settings: OrchSettings): FleetCapacity {
  const fleet = offlineCapacityFleet(services.orchDir);
  return computeFleetCapacity(fleet.views, fleet.presence, settings);
}

/** The capacity line: from orchd's held capacity, or computed from the store when offline. */
async function capacityLine(services: Services, orchId: string | null, settings: OrchSettings, offline: boolean): Promise<{ capacity: FleetCapacity; line: string }> {
  const capacity = offline ? offlineCapacity(services, settings) : await readRpc(services, "capacity", {});
  return { capacity, line: formatCapacityLine(capacity, orchId ?? undefined) };
}
```

Nothing else in the file changes.

Run, once, after the edit (Windows side owns the disk):
```
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT'; bun check"
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT\packages\orch'; bun test test/commands-status.test.ts test/status-filter-columns.test.ts test/status-owner-column.test.ts"
```

Another agent edits other files at the same time. If `bun check` is red only in files you did not touch, report `pending: <those files>`.

Report: one line. `done: index.ts, check clean, tests <n> pass`, `pending: <files>`, or `blocked: <exact error>`.
