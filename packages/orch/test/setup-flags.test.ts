import { describe, expect, test } from "bun:test";
import { resolveModelAssignments } from "../src/commands/setup.ts";

describe("setup model flags", () => {
  test("rejects a bare model when multiple harnesses are selected", () => {
    expect(() => resolveModelAssignments(["pi-model"], ["pi", "claude"])).toThrow(/ambiguous.*--model <harness>=<spec>/i);
  });

  test("binds each model flag to its own harness", () => {
    expect(resolveModelAssignments(["pi=pi-model", "claude=claude-model"], ["pi", "claude"])).toEqual(new Map([
      ["pi", "pi-model"],
      ["claude", "claude-model"],
    ]));
  });

  test("allows a bare model for one harness", () => {
    expect(resolveModelAssignments(["pi-model"], ["pi"])).toEqual(new Map([["pi", "pi-model"]]));
  });

  test("rejects a model bound to an unselected harness", () => {
    expect(() => resolveModelAssignments(["bogus=spec"], ["pi", "claude"])).toThrow(/selected harness.*pi, claude/i);
  });

  test("rejects duplicate model flags for one harness", () => {
    expect(() => resolveModelAssignments(["pi=one", "pi=two"], ["pi"])).toThrow(/more than once/i);
  });
});
