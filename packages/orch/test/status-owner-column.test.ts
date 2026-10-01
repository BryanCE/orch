import { describe, expect, test } from "bun:test";
import { formatStatusTable, localStatusTable } from "../src/commands/status/table.ts";
import { fleetFixture, statusRowFixture } from "./helpers/status-row.ts";
import type { StatusRow } from "../src/types/command.ts";

function statusRow(overrides: Partial<StatusRow>): StatusRow {
  return statusRowFixture({ key: "agent00001", agentId: "agent00001", name: "worker", tab: "-", agent: "pi", model: "anthropic/luna", state: "idle", backend: "headless", ...overrides });
}

/** Column widths come from the rule line: each run of dashes IS one column. */
function columnWidths(table: string): number[] {
  const rule = table.split("\n")[1] ?? "";
  return rule.split("  ").map((run) => run.length);
}

/** Slice one rendered line back into its cells, by the rendered widths. */
function cells(line: string, widths: readonly number[]): string[] {
  const out: string[] = [];
  let offset = 0;
  for (const width of widths) {
    out.push(line.slice(offset, offset + width).trim());
    offset += width + 2;
  }
  return out;
}

function formatCallerTable(): string {
  return formatStatusTable(fleetFixture([
    statusRow({ key: "caller", agentId: "caller", name: "orchestrator", owned: true }),
    statusRow({ key: "agent00002", agentId: "agent00002", name: "worker", owned: true, lease: { holderId: "caller", holderAlive: true } }),
  ]), { all: false, host: false, callerId: "caller", columns: new Set() });
}

function cellUnder(table: string, header: string, lineIndex: number): string {
  const widths = columnWidths(table);
  const lines = table.split("\n");
  const index = cells(lines[0] ?? "", widths).indexOf(header);
  expect(index).toBeGreaterThanOrEqual(0);
  return cells(lines[lineIndex] ?? "", widths)[index] ?? "";
}

// F6: "unleased agents must read as 'no orch driving it', never as yours".
// The owner FACT was already verified at the row and formatter level; what was
// not, was that the rendered table actually carries the column. Deleting the
// owner cell from the assembled row left every assertion passing.
describe("the rendered status table carries the owner column", () => {
  test("each row's OWNER cell holds that row's lease fact, named through the fleet's names", () => {
    const table = localStatusTable(fleetFixture([
      statusRow({ name: "held", lease: { holderId: "orch00001", holderAlive: true } }),
      statusRow({ key: "agent00002", agentId: "agent00002", name: "loose", lease: null }),
    ], { agents: { orch00001: "captain" } }), false);

    expect(cellUnder(table, "OWNER", 2)).toBe("captain");
    expect(cellUnder(table, "OWNER", 3)).toBe("no orch driving it");
  });

  test("the caller row shows no owner, and its lease does not affect the other rows' column", () => {
    const table = formatStatusTable(fleetFixture([
      statusRow({ key: "caller", agentId: "caller", name: "orchestrator", lease: null }),
      statusRow({ key: "agent00002", agentId: "agent00002", name: "worker", lease: { holderId: "captain", holderAlive: true } }),
      statusRow({ key: "agent00003", agentId: "agent00003", name: "other", lease: { holderId: "other-orch", holderAlive: true } }),
    ], { agents: { captain: "captain", "other-orch": "other-orch" } }), { all: false, host: false, callerId: "caller", columns: new Set() });

    expect(cellUnder(table, "OWNER", 2)).toBe("-");
    expect(cellUnder(table, "OWNER", 3)).toBe("captain");
  });

  test("when every other row is held by the caller, omit owner column and footer", () => {
    const table = formatCallerTable();

    expect(table).not.toContain("OWNER");
    expect(table).not.toContain("owner:");
  });

  test("shows the shared-owner footer when a caller-held row is not owned", () => {
    const table = formatStatusTable(fleetFixture([
      statusRow({ key: "caller", agentId: "caller", name: "orchestrator", owned: true }),
      statusRow({ key: "agent00002", agentId: "agent00002", owned: false, lease: { holderId: "caller", holderAlive: true } }),
    ], { agents: { caller: "orchestrator" } }), { all: false, host: false, callerId: "caller", columns: new Set() });

    expect(table).toContain("owner: orchestrator");
  });

  test("shows an unknown fallback as '-' only on the caller row", () => {
    const table = formatStatusTable(fleetFixture([
      statusRow({ key: "caller", agentId: "caller", state: "unknown", stateFallback: true }),
      statusRow({ key: "agent00002", agentId: "agent00002", state: "unknown", stateFallback: true }),
    ]), { all: false, host: false, callerId: "caller", columns: new Set() });

    expect(cellUnder(table, "STATE", 2)).toBe("-");
    expect(cellUnder(table, "STATE", 3)).toBe("unknown?");
  });

  test("a holder with no name falls back to its id", () => {
    const table = localStatusTable(fleetFixture([
      statusRow({ name: "held", lease: { holderId: "orch00001", holderAlive: true } }),
      statusRow({ key: "agent00002", agentId: "agent00002", name: "loose", lease: null }),
    ]), false);

    expect(cellUnder(table, "OWNER", 2)).toBe("orch00001");
  });

  test("a dead holder reads as unleased under a table that all shares one owner", () => {
    const table = localStatusTable(fleetFixture([
      statusRow({ name: "orphan", owned: false, lease: { holderId: "orch00001", holderAlive: false } }),
    ]), false);

    // One owner for every row is a fact about the table, not about a row: it is
    // stated once beneath it rather than spending 32 columns on every line.
    const widths = columnWidths(table);
    expect(cells(table.split("\n")[0] ?? "", widths)).not.toContain("OWNER");
    expect(table).toContain("owner: no orch driving it (holder gone)");
  });

  test("the owner column is dropped when only a warning row is there to fill it", () => {
    const table = localStatusTable(fleetFixture([statusRow({ warning: "host away", task: "host away" })]), false);
    const widths = columnWidths(table);
    expect(cells(table.split("\n")[0] ?? "", widths)).not.toContain("OWNER");
  });
});
