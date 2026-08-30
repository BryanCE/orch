import { describe, expect, test } from "bun:test";
import { validatePromptSelection, validatePromptSelections } from "../src/setup/io.ts";

describe("setup prompt answer validation", () => {
  test("refuses a single answer that was not offered", () => {
    expect(() => validatePromptSelection("bogus", ["pi", "claude"])).toThrow(/not one of the offered choices/);
  });

  test("refuses multi-select answers containing an unoffered value", () => {
    expect(() => validatePromptSelections(["pi", "bogus"], ["pi", "claude"])).toThrow(/not one of the offered choices/);
  });
});
