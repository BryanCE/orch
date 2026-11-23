import { describe, expect, test } from "bun:test";
import { shellCommand, shellLaunchLine } from "../src/shared/shell.ts";

describe("shell rendering", () => {
  test("posix quotes each argument, so a space or a quote stays one argument", () => {
    expect(shellCommand("posix", ["claude", "--settings", "/a dir/s.json", "it's"])).toBe("'claude' '--settings' '/a dir/s.json' 'it'\\''s'");
  });
  test("cmd wraps each argument in double quotes and doubles a quote in it", () => {
    expect(shellCommand("cmd", ["pi", 'say "hi"'])).toBe('"pi" "say ""hi"""');
  });
  test("a posix launch line sets the env and removes what it dropped", () => {
    expect(shellLaunchLine("posix", ["claude"], { ORCH_DIR: "/o", CLAUDE_CODE_AUTO_COMPACT_WINDOW: "9" }, ["CLAUDE_CODE_AUTO_COMPACT_WINDOW", "ORCH_READ_ONLY"])).toBe("env -u ORCH_READ_ONLY ORCH_DIR='/o' CLAUDE_CODE_AUTO_COMPACT_WINDOW='9' 'claude'");
  });
  test("a cmd launch line sets each variable first", () => {
    expect(shellLaunchLine("cmd", ["pi"], { A: "1" }, ["B"])).toBe('set "B=" & set "A=1" & "pi"');
  });
});
