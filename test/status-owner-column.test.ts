import { describe, expect, test } from "bun:test";
import { localStatusTable, type StatusRow } from "../src/commands/status.ts";

/** A COMPLETE StatusRow, so a field added to the shape breaks this factory
 *  instead of being silently absent from every fixture (CLAUDE.md Rule 13). */
function statusRow(overrides: Partial<StatusRow>): StatusRow {
  const base: StatusRow = {
    key: "headless~wF~agent00001",
    agentId: "agent00001",
    paneId: null,
    managed: true,
    name: "worker",
    tab: "-",
    agent: "pi",
    owner: null,
    spawnedBy: null,
    spawnedByLabel: null,
    worktree: null,
    branch: null,
    cwd: null,
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
    presenceDir: null,
    presenceOnly: false,
    tokens: null,
    turns: null,
    spaceId: null,
    spaceName: null,
    rootAgentId: null,
    rootAgentName: null,
  };
  return { ...base, ...overrides };
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
  test("each row's OWNER cell holds that row's lease fact", () => {
    const table = localStatusTable([
      statusRow({ name: "held", owner: "orch00001" }),
      statusRow({ key: "headless~wF~agent00002", name: "loose", owner: "no orch driving it" }),
    ], false);

    expect(cellUnder(table, "OWNER", 2)).toBe("orch00001");
    expect(cellUnder(table, "OWNER", 3)).toBe("no orch driving it");
  });

  test("a dead holder renders as unleased, not as a live driver", () => {
    const table = localStatusTable([
      statusRow({ name: "orphan", owner: "no orch driving it (holder gone)" }),
    ], false);

    expect(cellUnder(table, "OWNER", 2)).toBe("no orch driving it (holder gone)");
  });

  test("the owner column is dropped only when no row knows its lease", () => {
    const table = localStatusTable([statusRow({ owner: null })], false);
    const widths = columnWidths(table);
    expect(cells(table.split("\n")[0] ?? "", widths)).not.toContain("OWNER");
  });
});
