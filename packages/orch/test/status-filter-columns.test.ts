import { describe, expect, test } from "bun:test";
import { filterRowKeys } from "../src/commands/status/options.ts";
import { formatStatusTable } from "../src/commands/status/table.ts";
import { fleetFixture, statusRowFixture } from "./helpers/status-row.ts";
import type { StatusRow } from "../src/types/command.ts";

const NAMES = { agents: { orch00001: "Orchestrator", orch00002: "Other" } };

function statusRow(overrides: Partial<StatusRow>): StatusRow {
  return statusRowFixture({
    key: "agent00001", agentId: "agent00001", paneId: "%7", name: "worker", tab: "-", agent: "pi",
    lease: { holderId: "orch00001", holderAlive: true }, branch: "main", cwd: "/repo",
    model: "anthropic/luna", state: "idle", backend: "headless", ...overrides,
  });
}

function headerLine(table: string): string {
  return table.split("\n")[0] ?? "";
}

describe("orch status --filter on columns", () => {
  test("drops the named columns from the default table", () => {
    const rows = [statusRow({}), statusRow({ key: "agent00002", agentId: "agent00002", paneId: "%8", lease: { holderId: "orch00002", holderAlive: true } })];
    const table = formatStatusTable(fleetFixture(rows, NAMES), { spaceWide: false, host: false, columns: new Set(["owner", "env"]) });
    const headers = headerLine(table).split(/\s+/);
    expect(headers).not.toContain("OWNER");
    expect(headers).not.toContain("ENV");
    expect(headers).toContain("ID");
    expect(headers).toContain("STATE");
    expect(table).not.toContain("%7");
    expect(table).not.toContain("Orchestrator");
  });

  test("a filtered owner column leaves no shared-owner footer", () => {
    const table = formatStatusTable(fleetFixture([statusRow({})], NAMES), { spaceWide: false, host: false, columns: new Set(["owner"]) });
    expect(table).not.toContain("owner: Orchestrator");
  });

  test("drops the named columns from the human table", () => {
    const table = formatStatusTable(fleetFixture([statusRow({})], NAMES), { spaceWide: false, host: false, human: true, columns: new Set(["cwd", "harness"]) });
    const headers = headerLine(table).split(/\s+/);
    expect(headers).not.toContain("CWD");
    expect(headers).not.toContain("HARNESS");
    expect(headers).toContain("WORKTREE");
    expect(table).not.toContain("/repo");
  });

  test("drops the same facts from a JSON row", () => {
    const row = filterRowKeys(statusRow({}), new Set(["owner", "env", "model"]));
    expect(row).not.toHaveProperty("lease");
    expect(row).not.toHaveProperty("leaseKnown");
    expect(row).not.toHaveProperty("paneId");
    expect(row).not.toHaveProperty("model");
    expect(row.key).toBe("agent00001");
    expect(row.state).toBe("idle");
  });
});
