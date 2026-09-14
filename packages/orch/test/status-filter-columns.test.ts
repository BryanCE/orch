import { describe, expect, test } from "bun:test";
import { filterRowKeys } from "../src/commands/status/options.ts";
import { formatStatusTable } from "../src/commands/status/table.ts";
import type { StatusRow } from "../src/types/command.ts";

/** A COMPLETE StatusRow, so a field added to the shape breaks this factory (Rule 13). */
function statusRow(overrides: Partial<StatusRow>): StatusRow {
  const base: StatusRow = {
    key: "agent00001",
    agentId: "agent00001",
    paneId: "%7",
    managed: true,
    name: "worker",
    tab: "-",
    agent: "pi",
    owner: "Orchestrator",
    spawnedBy: null,
    spawnedByLabel: null,
    worktree: null,
    branch: "main",
    cwd: "/repo",
    focused: false,
    model: "anthropic/luna",
    modelShort: "luna",
    state: "idle",
    stateFallback: false,
    staleExtension: false,
    exited: false,
    alive: true,
    cost: 0,
    ctxPercent: null,
    task: null,
    dispatchId: null,
    lastText: null,
    backendStatus: null,
    backend: "headless",
    capabilities: null,
    sessionPath: null,
    bridgeAttached: null,
    tokens: null,
    turns: null,
    spaceId: null,
    spaceName: null,
    rootAgentId: null,
    rootAgentName: null,
  };
  return { ...base, ...overrides };
}

function headerLine(table: string): string {
  return table.split("\n")[0] ?? "";
}

describe("orch status --filter on columns", () => {
  test("drops the named columns from the default table", () => {
    const rows = [statusRow({}), statusRow({ key: "agent00002", agentId: "agent00002", paneId: "%8", owner: "Other" })];
    const table = formatStatusTable(rows, { spaceWide: false, host: false, columns: new Set(["owner", "env"]) });
    const headers = headerLine(table).split(/\s+/);
    expect(headers).not.toContain("OWNER");
    expect(headers).not.toContain("ENV");
    expect(headers).toContain("ID");
    expect(headers).toContain("STATE");
    expect(table).not.toContain("%7");
    expect(table).not.toContain("Orchestrator");
  });

  test("a filtered owner column leaves no shared-owner footer", () => {
    const table = formatStatusTable([statusRow({})], { spaceWide: false, host: false, columns: new Set(["owner"]) });
    expect(table).not.toContain("owner: Orchestrator");
  });

  test("drops the named columns from the human table", () => {
    const table = formatStatusTable([statusRow({})], { spaceWide: false, host: false, human: true, columns: new Set(["cwd", "harness"]) });
    const headers = headerLine(table).split(/\s+/);
    expect(headers).not.toContain("CWD");
    expect(headers).not.toContain("HARNESS");
    expect(headers).toContain("WORKTREE");
    expect(table).not.toContain("/repo");
  });

  test("drops the same facts from a JSON row", () => {
    const row = filterRowKeys(statusRow({}), new Set(["owner", "env", "model"]));
    expect(row).not.toHaveProperty("owner");
    expect(row).not.toHaveProperty("paneId");
    expect(row).not.toHaveProperty("model");
    expect(row).not.toHaveProperty("modelShort");
    expect(row.key).toBe("agent00001");
    expect(row.state).toBe("idle");
  });
});
