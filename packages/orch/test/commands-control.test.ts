import { describe, expect, test } from "bun:test";
import { dispatchFlags, pipedText, promptBody } from "../src/commands/control.ts";
import { parseCommand } from "../src/commands/registry.ts";
import { workerPrompt } from "../src/worker-prompt.ts";

describe("commands/control", () => {
  test("parses dispatch flags without losing prompt words", () => {
    expect(dispatchFlags(parseCommand("dispatch", ["--raw", "agent", "do", "it", "--harness", "pi"]))).toMatchObject({ raw: true, positional: ["agent", "do", "it"], adapterFlag: "pi" });
  });
  test("parses a rename without changing the target or prompt", () => {
    const flags = dispatchFlags(parseCommand("dispatch", ["a", "--rename", "b", "task"]));
    expect(flags.positional[0]).toBe("a");
    expect(flags.rename).toBe("b");
    expect(promptBody(flags)).toBe("task");
  });
  test("--then is not a dispatch flag", () => {
    expect(() => parseCommand("dispatch", ["agent", "task", "--then", "other"])).toThrow(/unknown flag --then/);
  });
  test("pipes the source agent name into the destination text", () => {
    expect(pipedText("source-worker", "review this", "result body")).toBe("[piped from source-worker] review this\nresult body");
  });
  test("adds worker header unless raw", () => {
    expect(workerPrompt("hello", true, undefined)).toBe("hello");
    expect(workerPrompt("hello", false, undefined)).toContain("hello");
  });
});
