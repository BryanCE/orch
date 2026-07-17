import { describe, expect, test } from "bun:test";
import { parseDispatchFlags } from "../src/commands/control.ts";
import { workerPrompt } from "../src/commands/spawn.ts";

describe("commands/control", () => {
  test("parses dispatch flags without losing prompt words", () => expect(parseDispatchFlags(["--raw", "agent", "do", "it", "--agent", "pi"])).toMatchObject({ raw: true, positional: ["agent", "do", "it"], adapterFlag: "pi" }));
  test("parses --then destination and note", () => expect(parseDispatchFlags(["agent", "task", "--then", "other", "note"])).toMatchObject({ thenTarget: "other", thenNote: "note" }));
  test("adds worker header unless raw", () => {
    expect(workerPrompt("hello", true, undefined)).toBe("hello");
    expect(workerPrompt("hello", false, undefined)).toContain("hello");
  });
});
