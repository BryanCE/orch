import { describe, expect, test } from "bun:test";
import type { Theme, ThemeColor } from "@earendil-works/pi-coding-agent";
import { countStates, formatSeatStatus } from "../src/seat/index.ts";
import type { PackSnapshot } from "../src/seat/domain.ts";
import { reconcileDashboardSelection } from "../src/seat/ui/takeover.ts";

function snapshot(state: string, key = state): PackSnapshot {
  return {
    key,
    name: key,
    state,
    model: null,
    task: "",
    createdAt: 0,
    lastTransitionAt: 0,
    info: {},
  };
}

function plainTheme(): Theme {
  return {
    fg: (_color: ThemeColor, text: string) => text,
  } as unknown as Theme;
}

describe("seat pure seams", () => {
  test("countStates groups active, blocked, failed, and settled states", () => {
    expect(countStates([
      snapshot("working"),
      snapshot("spawning"),
      snapshot("blocked"),
      snapshot("asking"),
      snapshot("error"),
      snapshot("aborted"),
      snapshot("done"),
      snapshot("idle"),
    ])).toEqual({ working: 2, blocked: 2, failed: 2, done: 2 });
  });

  test("formatSeatStatus renders state counts and view hint", () => {
    const status = formatSeatStatus(plainTheme(), [
      snapshot("working"),
      snapshot("blocked"),
      snapshot("error"),
      snapshot("done"),
    ]);

    expect(status).toBe("orch: ■ 1 working · ■ 1 blocked · ■ 1 failed · ■ 1 done · /orch-view to view");
  });

  test("reconcileDashboardSelection preserves id and guards missing snapshots", () => {
    const selection: { id: string; index: number } = { id: "b", index: 0 };
    reconcileDashboardSelection(selection, [{ key: "a" }, { key: "b" }]);
    expect(selection).toEqual({ id: "b", index: 1 });

    selection.id = "missing";
    selection.index = 99;
    reconcileDashboardSelection(selection, [{ key: "a" }, { key: "b" }]);
    expect(selection).toEqual({ id: "b", index: 1 });

    selection.id = "a";
    selection.index = 0;
    reconcileDashboardSelection(selection, []);
    expect(selection).toEqual({ id: undefined, index: 0 });
  });
});
