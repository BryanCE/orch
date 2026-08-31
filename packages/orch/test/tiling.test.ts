import { describe, expect, test } from "bun:test";
import { openingPlacement, planTilePlacement } from "../src/backends/tiling.ts";
import type { BackendGroupLayout, BackendRect, TileFirstSplit } from "../src/types/backend.ts";

interface LayoutPane { handle: string; rect: BackendRect }

function layout(panes: LayoutPane[]): BackendGroupLayout {
  return { group: "@1", panes };
}

/** Halve a rect the way a plexer does, so a whole fill sequence can be replayed. */
function halve(rect: BackendRect, split: "down" | "right"): [BackendRect, BackendRect] {
  if (split === "right") {
    const width = Math.floor(rect.width / 2);
    return [{ ...rect, width }, { ...rect, width: rect.width - width, x: rect.x + width }];
  }
  const height = Math.floor(rect.height / 2);
  return [{ ...rect, height }, { ...rect, height: rect.height - height, y: rect.y + height }];
}

/** Fill a tab to `count` panes, planning each placement off the live geometry. */
function fillTab(root: BackendRect, count: number, policy: TileFirstSplit, shuffle = asGiven): BackendRect[] {
  let panes: LayoutPane[] = [{ handle: "%1", rect: root }];
  for (let seq = 2; seq <= count; seq++) {
    const placement = planTilePlacement(layout(shuffle(panes)), policy);
    const target = panes.find((pane) => pane.handle === placement.targetPane) ?? panes[0]!;
    const [kept, added] = halve(target.rect, placement.split);
    panes = panes.map((pane) => (pane === target ? { ...pane, rect: kept } : pane));
    panes.push({ handle: `%${seq}`, rect: added });
  }
  return panes.map((pane) => pane.rect);
}

const asGiven = (panes: LayoutPane[]) => panes;
const reversed = (panes: LayoutPane[]) => [...panes].reverse();

// A 200x50 terminal: cells are twice as tall as wide, so this is a square screen.
const SCREEN: BackendRect = { width: 200, height: 50, x: 0, y: 0 };
const ULTRAWIDE: BackendRect = { width: 400, height: 50, x: 0, y: 0 };
const TALL: BackendRect = { width: 80, height: 60, x: 0, y: 0 };

describe("planTilePlacement", () => {
  test("a lone pane anchors the split to the only pane", () => {
    expect(planTilePlacement(layout([{ handle: "w0:p9", rect: { x: 0, y: 0, width: 200, height: 50 } }]), "rows"))
      .toEqual({ targetPane: "w0:p9", split: "down" });
  });

  test("first_split rules the opening split, however the screen is shaped", () => {
    for (const rect of [SCREEN, ULTRAWIDE, TALL]) {
      expect(planTilePlacement(layout([{ handle: "%1", rect }]), "rows").split).toBe("down");
      expect(planTilePlacement(layout([{ handle: "%1", rect }]), "columns").split).toBe("right");
    }
  });

  test("first_split longest-edge leaves the opening split to the tab's own shape", () => {
    expect(planTilePlacement(layout([{ handle: "%1", rect: ULTRAWIDE }]), "longest-edge").split).toBe("right");
    expect(planTilePlacement(layout([{ handle: "%1", rect: TALL }]), "longest-edge").split).toBe("down");
  });

  test("a tab with no geometry to read still opens the way first_split says", () => {
    expect(openingPlacement("rows")).toEqual({ split: "down" });
    expect(openingPlacement("columns")).toEqual({ split: "right" });
    expect(openingPlacement("longest-edge")).toEqual({ split: "right" });
  });

  test("past the first split, the biggest pane halves its longer side whatever first_split says", () => {
    const stacked = layout([
      { handle: "%1", rect: { width: 200, height: 25, x: 0, y: 0 } },
      { handle: "%2", rect: { width: 200, height: 25, x: 0, y: 25 } },
    ]);
    const sideBySide = layout([
      { handle: "%1", rect: { width: 80, height: 60, x: 0, y: 0 } },
      { handle: "%2", rect: { width: 80, height: 60, x: 80, y: 0 } },
    ]);

    for (const policy of ["rows", "columns", "longest-edge"] as const) {
      expect(planTilePlacement(stacked, policy)).toEqual({ targetPane: "%1", split: "right" });
      expect(planTilePlacement(sideBySide, policy)).toEqual({ targetPane: "%1", split: "down" });
    }
  });

  test("the biggest pane is the target, whatever the caller's own pane is", () => {
    const placement = planTilePlacement(layout([
      { handle: "%1", rect: { width: 100, height: 25, x: 0, y: 0 } },
      { handle: "%2", rect: { width: 100, height: 25, x: 0, y: 25 } },
      { handle: "%3", rect: { width: 100, height: 50, x: 100, y: 0 } },
    ]), "rows");

    expect(placement).toEqual({ targetPane: "%3", split: "down" });
  });

  test("equal panes resolve top-left first, so enumeration order cannot decide", () => {
    const panes: LayoutPane[] = [
      { handle: "%9", rect: { width: 100, height: 50, x: 100, y: 0 } },
      { handle: "%1", rect: { width: 100, height: 50, x: 0, y: 0 } },
    ];

    expect(planTilePlacement(layout(panes), "rows").targetPane).toBe("%1");
    expect(planTilePlacement(layout([...panes].reverse()), "rows").targetPane).toBe("%1");
  });

  test("four agents land in a 2x2 grid, not four columns", () => {
    expect(fillTab(SCREEN, 4, "rows").map(describeRect).sort())
      .toEqual(["100x25@0,0", "100x25@0,25", "100x25@100,0", "100x25@100,25"]);
  });

  test("four agents on an ultrawide screen still land in a 2x2 grid", () => {
    expect(fillTab(ULTRAWIDE, 4, "rows").map(describeRect).sort())
      .toEqual(["200x25@0,0", "200x25@0,25", "200x25@200,0", "200x25@200,25"]);
  });

  test("first_split rows stacks the second agent, columns seats it alongside", () => {
    expect(fillTab(SCREEN, 2, "rows").map(describeRect).sort()).toEqual(["200x25@0,0", "200x25@0,25"]);
    expect(fillTab(SCREEN, 2, "columns").map(describeRect).sort()).toEqual(["100x50@0,0", "100x50@100,0"]);
  });

  test("longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid", () => {
    expect(fillTab(ULTRAWIDE, 4, "longest-edge").map(describeRect).sort())
      .toEqual(["100x50@0,0", "100x50@100,0", "100x50@200,0", "100x50@300,0"]);
  });

  test("the same pane count yields the same grid whatever pane order the plexer reports", () => {
    for (const policy of ["rows", "columns", "longest-edge"] as const) {
      for (const count of [2, 3, 4, 5, 6]) {
        const stable = JSON.stringify(fillTab(SCREEN, count, policy).sort(byPosition));
        expect(JSON.stringify(fillTab(SCREEN, count, policy, reversed).sort(byPosition))).toBe(stable);
      }
    }
  });
});

function describeRect(rect: BackendRect): string {
  return `${rect.width}x${rect.height}@${rect.x},${rect.y}`;
}

function byPosition(a: BackendRect, b: BackendRect): number {
  return a.y - b.y || a.x - b.x;
}
