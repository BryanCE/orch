import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fleetStatusRows, renderStatusTable, statusRowFromEntity } from "../src/commands/status.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { closeAllStores } from "../src/store/connection.ts";
import type { StatusRow } from "../src/types/command.ts";
import type { Entity } from "../src/types/core.ts";

function row(overrides: Partial<StatusRow> = {}): StatusRow {
  const base: StatusRow = {
    key: "agent00001", agentId: "agent00001", paneId: "pane-1", managed: true,
    name: "worker", tab: "tab", agent: "pi", owner: null, spawnedBy: null,
    spawnedByLabel: null, worktree: null, branch: null, cwd: null, focused: false,
    model: "pi/model", modelShort: "model", state: "working", stateFallback: false,
    staleExtension: false, exited: false, alive: true, cost: 0, ctxPercent: null,
    task: "Q: approve", dispatchId: null, lastText: "finished", backendStatus: null,
    backend: null, capabilities: null, sessionPath: null, presenceDir: null,
    presenceOnly: false, tokens: null, turns: null, spaceId: null, spaceName: null,
    rootAgentId: null, rootAgentName: null,
  };
  return { ...base, ...overrides };
}

const oldOrchDir = process.env.ORCH_DIR;
const tempDirs: string[] = [];

afterEach(() => {
  closeAllStores();
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldOrchDir;
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

function entityWithQuestion(): Entity {
  return {
    key: "agent00001", paneId: null, managed: true, name: "worker", tabLabel: null,
    agent: "pi", focused: false, backendStatus: null, backend: null, sessionPath: null,
    presenceOnly: true, space: null,
    presence: {
      key: "agent00001", dir: "/tmp", alive: true, result: { text: " finished  " },
      status: { schema: 1, state: "asking", asking: { question: "  approve  ", id: "q1", ts: "now" }, task: "ignored" },
    },
  };
}

describe("status rendering has one row shape and one table renderer", () => {
  test("task and last text use the same spelling in the row and table cell", () => {
    const statusRow = statusRowFromEntity(entityWithQuestion(), new Map(), undefined, {}, null, "/tmp");
    const table = renderStatusTable([statusRow], { showSpace: false, showOwner: false, showBranch: false }, { host: false });
    expect(statusRow.task).toBe("Q: approve");
    expect(table).toContain("Q: approve");
    expect(statusRow.lastText).toBe("finished");
    expect(table).toContain("finished");
  });

  test("local and remote rows share the renderer; remote adds only HOST", () => {
    const local = row({ host: "local" });
    const remote = row({ host: "remote" });
    const flags = { showSpace: false, showOwner: false, showBranch: false };
    const localTable = renderStatusTable([local], flags, { host: false });
    const remoteTable = renderStatusTable([remote], flags, { host: true });
    expect(localTable.split("\n")[0]).not.toContain("HOST");
    expect(remoteTable.split("\n")[0]?.startsWith("HOST")).toBe(true);
    expect(remoteTable).toContain("remote");
  });

  test("fleet resolves caller inputs once while building three presence rows", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-status-rows-"));
    tempDirs.push(root);
    process.env.ORCH_DIR = root;
    for (const key of ["fleet00001", "fleet00002", "fleet00003"]) {
      const dir = join(root, "agents", key);
      const file = join(dir, "status.json");
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, agent: "pi", state: "working" }));
    }
    let orchCalls = 0;
    let directoryCalls = 0;
    const rows = fleetStatusRows({}, {
      bundleHashes: () => new Set<string>(),
      orchId: () => { orchCalls += 1; return null; },
      directory: () => { directoryCalls += 1; return root; },
    });
    expect(rows).toHaveLength(3);
    expect(orchCalls).toBe(1);
    expect(directoryCalls).toBe(1);
  });
});
