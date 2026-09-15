import { describe, expect, test } from "bun:test";
import { dispatchFlags } from "../src/commands/control.ts";
import { parseCommand } from "../src/commands/registry.ts";
import { workerPrompt } from "../src/worker-prompt.ts";

describe("commands/control", () => {
  test("parses dispatch flags without losing prompt words", () => {
    expect(dispatchFlags(parseCommand("dispatch", ["--raw", "agent", "do", "it", "--agent", "pi"]))).toMatchObject({ raw: true, positional: ["agent", "do", "it"], adapterFlag: "pi" });
  });
  test("--then is not a dispatch flag", () => {
    expect(() => parseCommand("dispatch", ["agent", "task", "--then", "other"])).toThrow(/unknown flag --then/);
  });
  test("adds worker header unless raw", () => {
    expect(workerPrompt("hello", true, undefined)).toBe("hello");
    expect(workerPrompt("hello", false, undefined)).toContain("hello");
  });
});
