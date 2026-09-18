# T2. Compute `fleetLeaseFacts` once per `status` call

Repo: /mnt/c/dev/personal/orch, package `packages/orch/`. Rules: no `as` casts, no `any`, no back-compat, no new comments longer than two lines.

Today `fleetStatus` (`src/daemon/server/state.ts:153`) calls `fleetStatusRows`, which runs `fleetLeaseFacts` inside `fleetDriveStates`, then runs `fleetLeaseFacts` a second time at L157. Make it one run.

Edit `src/agent/drive-state.ts`:
- L91-94 `fleetDriveStates`. Split it into two exported functions; `fleetDriveStates` keeps its signature and composes the new one:
  ```ts
  /** The whole fleet's drive states off lease facts already read. */
  export function driveStatesFrom(leaseFacts: LeaseFacts, currentOrchId: string | null | undefined): (agentId: string) => DriveState {
    const facts: DriveFacts = { ...leaseFacts, currentOrchId };
    return (agentId) => driveStateFrom(agentId, facts);
  }

  /** The whole fleet's drive states off {@link fleetLeaseFacts}. */
  export function fleetDriveStates(directory: OrchDir, views: ReadonlyMap<string, AgentView>, currentOrchId: string | null | undefined): (agentId: string) => DriveState {
    return driveStatesFrom(fleetLeaseFacts(directory, views), currentOrchId);
  }
  ```

Edit `src/commands/status/offline.ts`:
- L3 import: `import { driveStatesFrom, fleetLeaseFacts, type LeaseFacts } from "../../agent/drive-state.ts";`
- `FleetStatusOptions` (L24-29): add, beside `orchId`, the field
  `/** Lease facts already read by the caller; read here when absent. */ leaseFacts?: LeaseFacts;`
- `fleetStatusRows` L36: replace `const driveState = fleetDriveStates(directory, fleet, orchId);` with
  ```ts
  const driveState = driveStatesFrom(options.leaseFacts ?? fleetLeaseFacts(directory, fleet), orchId);
  ```

Edit `src/daemon/server/state.ts`:
- `fleetStatus` L153-160: read the facts first and pass them in.
  ```ts
  export function fleetStatus(state: DaemonState): { rows: DaemonStatusRow[] } {
    const directory = state.directory;
    const current = state.services.settings.current();
    const facts = fleetLeaseFacts(directory, agentViewIndex(directory));
    const rows = fleetStatusRows(current, current.spaces, { directory, leaseFacts: facts });
    return {
      rows: rows.map((row) => ({ ...row, ...leasePayloadFrom(row.key, facts), bridgeAttached: bridgeAttached(row.key) })),
    };
  }
  ```

Run, once, after the edits (Windows side owns the disk):
```
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT'; bun check"
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT\packages\orch'; bun test test/status-perf.test.ts test/offline-is-not-a-second-source.test.ts test/daemon-status-lease.test.ts test/status-unleased.test.ts"
```

Other agents edit other files at the same time. If `bun check` is red only in files you did not touch, you are done: report `pending: <those files>`.

Report: one line. `done: drive-state.ts offline.ts state.ts, check clean, tests <n> pass`, `pending: <files>`, or `blocked: <exact error>`.
