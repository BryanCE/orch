import type { StatusRow } from "../../src/types/command.ts";
import type { FleetNames, FleetStatus } from "../../src/types/daemon.ts";

/** One complete status row; a test overrides only the facts it is about. */
export function statusRowFixture(overrides: Partial<StatusRow> = {}): StatusRow {
  return {
    key: "row", paneId: null, managed: true, name: null, tab: null, agent: null,
    lease: null, leaseKnown: true,
    spawnedBy: null, worktree: null, branch: null, cwd: null, focused: false,
    model: "-", state: "unknown", stateFallback: false, exited: false, alive: true,
    cost: 0, ctxPercent: null, task: null, dispatchId: null, lastText: null, backendStatus: null,
    backend: null, bridgeAttached: null, tokens: null,
    ...overrides,
  };
}

/** A fleet payload around the rows, with whatever names the test wants resolved. */
export function fleetFixture(rows: readonly StatusRow[], names: Partial<FleetNames> = {}): FleetStatus {
  return { names: { agents: names.agents ?? {}, spaces: names.spaces ?? {} }, rows: [...rows] };
}
