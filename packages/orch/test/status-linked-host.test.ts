import { afterEach, expect, test } from "bun:test";
import { buildFleetStatus } from "../src/daemon/server/fleet-status.ts";
import { formatStatusTable } from "../src/commands/status/table.ts";
import { NO_STATUS_HIDE } from "../src/commands/status/options.ts";
import { RPC_RESULTS } from "../src/daemon/client/protocol.ts";
import { startLivenessTick } from "../src/daemon/server/status-report.ts";
import { applyHostEvent } from "../src/daemon/server/host-events.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";
import { registerHostedAgent } from "../src/store/spawn-registration.ts";
import { bindHostName, closeHostLink, openHostLink, touchHostLink } from "../src/store/host-rows.ts";
import { selectAgentStatus } from "../src/store/status-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { testServices } from "./helpers/services.ts";
import { testHost } from "./helpers/host.ts";
import { recordingLogger } from "./helpers/logger.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { NotifyEvent } from "../src/types/notify.ts";
import type { StatusRow } from "../src/types/command.ts";

const FAR = testHost("far-host-id", "far");
const FAR_AGENT = "farag00001";
const dirs: OrchDir[] = [];
afterEach(() => {
  closeAllStores();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

/** An orch dir that knows the far host by name and holds one agent spawned there. */
function fleetWithFarAgent(): OrchDir {
  const orchDir = tempOrchDir("orch-status-linked-");
  dirs.push(orchDir);
  bindHostName(orchDir, "far", FAR, Date.now());
  registerHostedAgent(orchDir, { key: FAR_AGENT, harnessId: "pi", cwd: "/home/far", name: "far-test", model: "m", spawner: null, host: FAR });
  return orchDir;
}

/** The far agent's row as orchd would send it. */
function farRow(orchDir: OrchDir): StatusRow | undefined {
  const settings = testServices({ orchDir }).settings.current();
  const status = buildFleetStatus(settings, { directory: orchDir, caller: null });
  const parsed = RPC_RESULTS.status.parse({ ...status, rows: status.rows.map((row) => ({ ...row, bridgeAttached: true })) });
  return parsed.rows.find((candidate) => candidate.key === FAR_AGENT);
}

/** The LAST cell the status table prints for the far agent. */
function lastCell(row: StatusRow): string {
  const table = formatStatusTable({ names: { agents: {}, spaces: {} }, rows: [row] }, { all: true, host: false, columns: NO_STATUS_HIDE.columns });
  return table.split("\n")[2] ?? "";
}

/** The far host's orchd reports its agent went to work, over the link, the one way a far
 *  agent's state reaches this orchd. */
function farReportsWorking(orchDir: OrchDir): void {
  const state = idleDaemonState(testServices({ orchDir }), orchDir);
  applyHostEvent(state, { id: FAR.id, name: "far" }, {
    host: FAR, type: "transition", key: FAR_AGENT, ts: new Date().toISOString(), agent: "far-test", tab: null, model: null, oldState: "idle", newState: "working",
  });
}

/** Record that the far host's link came up at `since`, last answered at `lastSeen`, and dropped. */
function linkDropped(orchDir: OrchDir, since: number, lastSeen: number): void {
  openHostLink(orchDir, FAR.id, since);
  touchHostLink(orchDir, FAR.id, lastSeen);
  closeHostLink(orchDir, FAR.id, Date.now());
}

test("status lists an agent on a linked host from its reference, unknown until its host reports, with no pid", () => {
  const orchDir = fleetWithFarAgent();
  openHostLink(orchDir, FAR.id, Date.now());
  const row = farRow(orchDir);
  expect(row?.state).toBe("unknown");
  expect(row?.alive).toBe(true);
  expect(row?.pid).toBeNull();
  expect(row?.host.name).toBe("far");
  expect(row?.hostOffline).toBeUndefined();
});

test("a far agent reads the state its host's events last reported while the link is up", () => {
  const orchDir = fleetWithFarAgent();
  openHostLink(orchDir, FAR.id, Date.now());
  farReportsWorking(orchDir);
  const row = farRow(orchDir);
  expect(row?.state).toBe("working");
  expect(row?.alive).toBe(true);
});

test("a far agent whose host was never reached reads unknown and says so", () => {
  const row = farRow(fleetWithFarAgent());
  expect(row?.state).toBe("unknown");
  expect(row?.hostOffline).toEqual({ lastSeen: null });
  expect(lastCell(row!)).toContain("far never reached");
});

test("a far agent whose link dropped reads unknown with when its host was last seen", () => {
  const orchDir = fleetWithFarAgent();
  const lastSeen = Date.now() - 4 * 60_000;
  linkDropped(orchDir, lastSeen - 60_000, lastSeen);
  const row = farRow(orchDir);
  expect(row?.state).toBe("unknown");
  expect(row?.alive).toBe(true);
  expect(row?.exited).toBe(false);
  expect(row?.hostOffline).toEqual({ lastSeen });
  expect(lastCell(row!)).toContain("far offline, last seen 4m ago");
});

test("the liveness tick never marks a far agent on a downed link exited, nor reaps it", async () => {
  const orchDir = fleetWithFarAgent();
  linkDropped(orchDir, Date.now() - 2_000, Date.now() - 1_000);
  const events: NotifyEvent[] = [];
  farReportsWorking(orchDir);
  const { logger, records } = recordingLogger();
  const tick = startLivenessTick(orchDir, 1, (event) => events.push(event), logger);
  const deadline = Date.now() + 2_000;
  while (records.filter((record) => record.event === "tick.liveness").length < 3 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  tick.stop();
  expect(records.filter((record) => record.event === "tick.liveness").length).toBeGreaterThanOrEqual(3);
  expect(events).toHaveLength(0);
  expect(selectAgentStatus(orchDir, FAR_AGENT)?.state).toBe("working");
  expect(agentView(orchDir, FAR_AGENT)).not.toBeNull();
  expect(farRow(orchDir)?.state).toBe("unknown");
});
