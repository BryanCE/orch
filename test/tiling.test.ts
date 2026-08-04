import { describe, expect, test } from "bun:test";
import type { BackendGroupLayout, BackendRect } from "../src/backends/backend.ts";
import { planTilePlacement } from "../src/backends/tiling.ts";

type LayoutPane = { handle: string; rect: BackendRect };

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
function fillTab(root: BackendRect, count: number, shuffle: (panes: LayoutPane[]) => LayoutPane[]): BackendRect[] {
  let panes: LayoutPane[] = [{ handle: "%1", rect: root }];
  for (let seq = 2; seq <= count; seq++) {
    const placement = planTilePlacement(layout(shuffle(panes)));
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

describe("planTilePlacement", () => {
  test("a lone pane needs no target: every backend's default split hits it", () => {
    expect(planTilePlacement(layout([{ handle: "%1", rect: SCREEN }]))).toEqual({ split: "right" });
  });

  test("a wide screen splits side-by-side, a tall one stacks", () => {
    expect(planTilePlacement(layout([{ handle: "%1", rect: SCREEN }])).split).toBe("right");
    expect(planTilePlacement(layout([{ handle: "%1", rect: { width: 80, height: 60, x: 0, y: 0 } }])).split).toBe("down");
  });

  test("the biggest pane is the target, whatever the caller's own pane is", () => {
    const placement = planTilePlacement(layout([
      { handle: "%1", rect: { width: 100, height: 25, x: 0, y: 0 } },
      { handle: "%2", rect: { width: 100, height: 25, x: 0, y: 25 } },
      { handle: "%3", rect: { width: 100, height: 50, x: 100, y: 0 } },
    ]));

    expect(placement).toEqual({ targetPane: "%3", split: "down" });
  });

  test("equal panes resolve top-left first, so enumeration order cannot decide", () => {
    const panes: LayoutPane[] = [
      { handle: "%9", rect: { width: 100, height: 50, x: 100, y: 0 } },
      { handle: "%1", rect: { width: 100, height: 50, x: 0, y: 0 } },
    ];

    expect(planTilePlacement(layout(panes)).targetPane).toBe("%1");
    expect(planTilePlacement(layout([...panes].reverse())).targetPane).toBe("%1");
  });

  test("four agents land in a 2x2 grid, not four columns", () => {
    expect(fillTab(SCREEN, 4, asGiven).map((rect) => `${rect.width}x${rect.height}@${rect.x},${rect.y}`).sort())
      .toEqual(["100x25@0,0", "100x25@0,25", "100x25@100,0", "100x25@100,25"]);
  });

  test("the same pane count yields the same grid whatever pane order the plexer reports", () => {
    for (const count of [2, 3, 4, 5, 6]) {
      const stable = JSON.stringify(fillTab(SCREEN, count, asGiven).sort(byPosition));
      expect(JSON.stringify(fillTab(SCREEN, count, reversed).sort(byPosition))).toBe(stable);
    }
  });
});

function byPosition(a: BackendRect, b: BackendRect): number {
  return a.y - b.y || a.x - b.x;
}
