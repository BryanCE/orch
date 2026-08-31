import { describe, expect, test } from "bun:test";
import type { RepairState, SettingsDefect } from "../src/types/settings.ts";
import {
  createRepairState,
  plannedRepairs,
  repairChoicesFor,
  repairReducer,
} from "../src/settings/repair.ts";

function defect(
  path: string,
  options: { suggestion?: string; expected?: unknown } = {},
): SettingsDefect {
  return {
    path,
    value: "written value",
    problem: "invalid settings",
    ...options,
  };
}

describe("settings repair choices", () => {
  test("offers rename, set, drop, then leave when all repairs apply", () => {
    expect(repairChoicesFor(defect("fleet.max_depth", {
      suggestion: "fleet.max_agents_total",
      expected: 4,
    }))).toEqual(["rename", "set", "drop", "leave"]);
  });

  test("offers only rename when there is only a suggestion", () => {
    expect(repairChoicesFor(defect("fleet.max_dpeth", {
      suggestion: "fleet.max_depth",
    }))).toEqual(["rename", "drop", "leave"]);
  });

  test("offers only set when there is only an expected value", () => {
    expect(repairChoicesFor(defect("fleet.max_depth", { expected: 4 }))).toEqual(["set", "drop", "leave"]);
  });

  test("always offers leave, and cannot drop a file-level defect", () => {
    expect(repairChoicesFor(defect("", { expected: "{}" }))).toEqual(["set", "leave"]);
  });
});

describe("settings repair reducer", () => {
  test("starts every defect at leave and focus at zero", () => {
    const state = createRepairState([defect("one"), defect("two")]);
    expect(state.choices).toEqual(["leave", "leave"]);
    expect(state.focusedIndex).toBe(0);
  });

  test("refuses choices the focused defect does not offer and reports why", () => {
    const state = createRepairState([defect("fleet.spawn_cap")]);
    const refusedRename = repairReducer(state, { type: "choose", choice: "rename" });
    expect(refusedRename.choices).toEqual(["leave"]);
    expect(refusedRename.reason).toBe("fleet.spawn_cap has no suggested key to rename to");

    const refusedSet = repairReducer(state, { type: "choose", choice: "set" });
    expect(refusedSet.reason).toBe("fleet.spawn_cap has no expected value to set");

    const fileDefect = createRepairState([defect("")]);
    const refusedDrop = repairReducer(fileDefect, { type: "choose", choice: "drop" });
    expect(refusedDrop.reason).toBe("The settings file cannot be dropped");
  });

  test("clamps focus at both ends and clears a prior reason", () => {
    const initial = createRepairState([defect("one"), defect("two"), defect("three")]);
    const atBottom = repairReducer(
      repairReducer(repairReducer(initial, { type: "move", direction: "down" }), {
        type: "move",
        direction: "down",
      }),
      { type: "move", direction: "down" },
    );
    expect(atBottom.focusedIndex).toBe(2);
    expect(repairReducer(atBottom, { type: "move", direction: "down" }).focusedIndex).toBe(2);

    const withReason: RepairState = { ...atBottom, reason: "try again" };
    const atTop = repairReducer(
      repairReducer(repairReducer(withReason, { type: "move", direction: "up" }), {
        type: "move",
        direction: "up",
      }),
      { type: "move", direction: "up" },
    );
    expect(atTop.focusedIndex).toBe(0);
    expect(atTop.reason).toBeUndefined();
    expect(repairReducer(atTop, { type: "move", direction: "up" }).focusedIndex).toBe(0);
  });

  test("maps non-leave choices to repairs in defect order", () => {
    const defects = [
      defect("fleet.max_dpeth", { suggestion: "fleet.max_depth" }),
      defect("fleet.max_agents_total", { expected: 8 }),
      defect("obsolete.key"),
    ];
    let state = createRepairState(defects);
    state = repairReducer(state, { type: "choose", choice: "rename" });
    state = repairReducer(state, { type: "move", direction: "down" });
    state = repairReducer(state, { type: "choose", choice: "set" });
    state = repairReducer(state, { type: "move", direction: "down" });
    state = repairReducer(state, { type: "choose", choice: "drop" });

    expect(plannedRepairs(state)).toEqual([
      { kind: "rename", from: "fleet.max_dpeth", to: "fleet.max_depth" },
      { kind: "set", path: "fleet.max_agents_total", value: 8 },
      { kind: "drop", path: "obsolete.key" },
    ]);
  });

  test("leave produces no repair", () => {
    const state = createRepairState([defect("fleet.max_depth", { expected: 4 })]);
    expect(plannedRepairs(state)).toEqual([]);
  });

  test("empty defects make every action a no-op", () => {
    const state = createRepairState([]);
    expect(repairReducer(state, { type: "move", direction: "down" })).toBe(state);
    expect(repairReducer(state, { type: "move", direction: "up" })).toBe(state);
    expect(repairReducer(state, { type: "choose", choice: "rename" })).toBe(state);
    expect(plannedRepairs(state)).toEqual([]);
  });
});
