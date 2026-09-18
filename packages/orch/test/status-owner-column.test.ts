import { describe, expect, test } from "bun:test";
import { localStatusTable } from "../src/commands/status/table.ts";
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

  test("a holder with no name falls back to its id", () => {
    const table = localStatusTable(fleetFixture([
      statusRow({ name: "held", lease: { holderId: "orch00001", holderAlive: true } }),
      statusRow({ key: "agent00002", agentId: "agent00002", name: "loose", lease: null }),
    ]), false);

    expect(cellUnder(table, "OWNER", 2)).toBe("orch00001");
  });

  test("a dead holder reads as unleased under a table that all shares one owner", () => {
    const table = localStatusTable(fleetFixture([
      statusRow({ name: "orphan", lease: { holderId: "orch00001", holderAlive: false } }),
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
