# T8. `orch status` reads the capacity line from the `capacity` RPC, not from a second fleet pull

Repo: /mnt/c/dev/personal/orch, package `packages/orch/`. Rules: no `as` casts, no `any`, no back-compat, comments two lines max.

Today `cmdStatus` (`src/commands/status/index.ts:37-70`) calls `capacityFleet`, which pulls the whole fleet over the `fleet` RPC (views, presence, entities, a plexer pane listing) a second time after the `status` RPC, only to compute one footer line. Another agent (T7) adds the `capacity` RPC at the same time: params `{ packRootId?: string | null; packSpace?: string | null }`, result `FleetCapacity`. If `bun check` says the method does not exist yet, report `pending: src/daemon/client/protocol.ts`.

Edit `src/commands/status/index.ts` only.

1. Replace `capacityOutput` (L16-19) and `capacityFleet` (L21-26) with one function:
   ```ts
   /** The capacity line: from orchd's held capacity, or computed from the store when offline. */
   async function capacityLine(services: Services, orchId: string | null, settings: OrchSettings, offline: boolean): Promise<{ capacity: FleetCapacity; line: string }> {
     const capacity = offline
       ? computeFleetCapacity(offlineCapacityFleet(services.orchDir).views, offlineCapacityFleet(services.orchDir).presence, settings)
       : await readRpc(services, "capacity", {});
     return { capacity, line: formatCapacityLine(capacity, orchId ?? undefined) };
   }
   ```
   Call `offlineCapacityFleet` once, into a local, not twice; the sketch above is the shape, not the text.
2. At L46-47: `const output = await capacityLine(services, orchId, settings, options.offline);` and keep the two `process.stdout.write` lines as they are (`output.capacity`, `output.line`).
3. At L61-64: `capacityLine = (await capacityLine(services, orchId, settings, options.offline)).line;` — rename the local `capacityLine` string (L59) to `footer` so the name does not collide with the function.
4. Imports: add `readRpc` from `../daemon.ts` and `type FleetCapacity` from `../../policy/capacity.ts`; delete `readFleet`, `indexPresenceById`, `AgentView`, `PresenceEntry` imports if nothing else in the file uses them.

Run, once, after the edits (Windows side owns the disk):
```
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT'; bun check"
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT\packages\orch'; bun test test/commands-status.test.ts test/status-filter-columns.test.ts test/status-owner-column.test.ts"
```

Other agents edit other files at the same time. If `bun check` is red only in files you did not touch, you are done: report `pending: <those files>`.

Report: one line. `done: index.ts, check clean, tests <n> pass`, `pending: <files>`, or `blocked: <exact error>`.
