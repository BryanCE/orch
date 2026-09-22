import { describe, expect, test } from "bun:test";
import { HELD_LOCKS_ENV, heldPatterns, lockedCommandLine, matchedPatterns } from "../src/policy/command-gate.ts";

describe("matchedPatterns", () => {
  const patterns = ["bun test", "git push"];

  test("matches a pattern at the start, after a separator, after a prefix command, and inside quotes", () => {
    expect(matchedPatterns("bun test src", patterns)).toEqual(["bun test"]);
    expect(matchedPatterns("cd app && bun test", patterns)).toEqual(["bun test"]);
    expect(matchedPatterns("timeout 60 bun  test", patterns)).toEqual(["bun test"]);
    expect(matchedPatterns("powershell.exe -Command \"cd x; bun test a.ts\"", patterns)).toEqual(["bun test"]);
    expect(matchedPatterns("bun test; git push origin", patterns)).toEqual(["bun test", "git push"]);
  });

  test("never matches a longer word", () => {
    expect(matchedPatterns("bun testing", patterns)).toEqual([]);
    expect(matchedPatterns("xbun test", patterns)).toEqual([]);
    expect(matchedPatterns("echo git pushed", patterns)).toEqual([]);
  });

  test("ignores a blank pattern", () => {
    expect(matchedPatterns("anything", ["", "  "])).toEqual([]);
  });
});

describe("lockedCommandLine", () => {
  test("wraps a match in orch lock and quotes the original command", () => {
    const wrapped = lockedCommandLine("cd app && bun test 'a b'", ["bun test"]);
    expect(wrapped).toMatch(/orch\.js' lock -- 'cd app && bun test '\\''a b'\\'''$/);
  });

  test("leaves a command with no match alone", () => {
    expect(lockedCommandLine("ls -la", ["bun test"])).toBeUndefined();
  });

  test("never wraps a command that is already wrapped", () => {
    const wrapped = lockedCommandLine("bun test", ["bun test"]);
    if (wrapped === undefined) throw new Error("expected a wrapped command");
    expect(lockedCommandLine(wrapped, ["bun test"])).toBeUndefined();
  });
});

describe("heldPatterns", () => {
  test("reads the patterns an ancestor orch lock exported", () => {
    expect(heldPatterns({ [HELD_LOCKS_ENV]: "bun test\ngit push" })).toEqual(["bun test", "git push"]);
    expect(heldPatterns({})).toEqual([]);
  });
});
