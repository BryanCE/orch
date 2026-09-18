import { afterEach, describe, expect, test } from "bun:test";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { renderStatusTable } from "../src/commands/status/table.ts";
import { statusRowFromEntity } from "../src/commands/status/rows.ts";
import { buildFleetStatus } from "../src/commands/status/offline.ts";
import { fleetLeaseFacts } from "../src/agent/drive-state.ts";
import { seedStatus, statusRow as presenceStatusRow } from "./helpers/presence.ts";
import { fleetFixture, statusRowFixture } from "./helpers/status-row.ts";
import type { StatusRow } from "../src/types/command.ts";
import type { Entity, OrchDir } from "../src/types/core.ts";
import { testServices } from "./helpers/services.ts";
function row(overrides: Partial<StatusRow> = {}): StatusRow {
  return statusRowFixture({
    key: "agent00001", agentId: "agent00001", paneId: "pane-1", name: "worker", tab: "tab", agent: "pi",
    model: "pi/model", state: "working", task: "Q: approve", lastText: "finished", ...overrides,
  });
}

const oldOrchDir = process.env.ORCH_DIR;
const tempDirs: OrchDir[] = [];

afterEach(() => {
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldOrchDir;
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

function entityWithQuestion(): Entity {
  return {
    key: "agent00001", paneId: null, managed: true, name: "worker", tabLabel: null,
    agent: "pi", focused: false, backendStatus: null, backend: null, sessionPath: null,
    presenceOnly: true, ended: false, space: null,
    presence: {
      key: "agent00001", alive: true, result: " finished  ",
      status: presenceStatusRow({ agentId: "agent00001", state: "asking", task: "Q: approve" }),
    },
  };
}

describe("status rendering has one row shape and one table renderer", () => {
  test("task and last text use the same spelling in the row and table cell", () => {
    const directory = tempOrchDir("orch-status-row-shape-");
    tempDirs.push(directory);
    const statusRow = statusRowFromEntity(entityWithQuestion(), new Map(), fleetLeaseFacts(directory, new Map()), () => undefined);
    const table = renderStatusTable(fleetFixture([statusRow]), { showSpace: false, showOwner: false, showBranch: false }, { host: false, columns: new Set() });
    expect(statusRow.task).toBe("Q: approve");
    expect(table).toContain("Q: approve");
    expect(statusRow.lastText).toBe("finished");
    expect(table).toContain("finished");
  });

  test("local and remote rows share the renderer; remote adds only HOST", () => {
    const local = row({ host: "local" });
    const remote = row({ host: "remote" });
    const flags = { showSpace: false, showOwner: false, showBranch: false };
    const localTable = renderStatusTable(fleetFixture([local]), flags, { host: false, columns: new Set() });
    const remoteTable = renderStatusTable(fleetFixture([remote]), flags, { host: true, columns: new Set() });
    expect(localTable.split("\n")[0]).not.toContain("HOST");
    expect(remoteTable.split("\n")[0]?.startsWith("HOST")).toBe(true);
    expect(remoteTable).toContain("remote");
  });

  test("the fleet builds one row per presence record and needs no caller to do it", () => {
    const root = tempOrchDir("orch-status-rows-");
    tempDirs.push(root);
    process.env.ORCH_DIR = root;
    for (const key of ["fleet00001", "fleet00002", "fleet00003"]) {
      seedStatus(root, key, { agent: "pi", state: "idle" });
    }
    const settings = testServices({ orchDir: root, settings: {} }).settings.current();
    const fleet = buildFleetStatus(settings, { directory: root });
    expect(fleet.rows).toHaveLength(3);
    expect(fleet.names).toEqual({ agents: {}, spaces: {} });
  });
});
