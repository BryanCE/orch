import { describe, expect, test } from "bun:test";
import { writeRootGate, writeRootRefusal, writeRootTools, type ToolVocabulary, type WriteRootGate } from "../src/policy/write-root.ts";

const root = "/repo/.orch/councils/plan/ada";
const tools: ToolVocabulary = { reads: ["read", "grep"], writes: ["edit", "write"], pathField: "path" };
const gate: WriteRootGate = { root, cwd: "/repo", tools };
const refusedTool = `orch refused this tool: this agent only reads files, and writes only inside ${root}.`;

describe("writeRootGate", () => {
  test("a launch that set no root has no gate", () => {
    expect(writeRootGate({}, "/repo", tools)).toBeNull();
    expect(writeRootGate({ ORCH_WRITE_ROOT: "" }, "/repo", tools)).toBeNull();
  });

  test("the gate holds the root and the directory as absolute paths", () => {
    expect(writeRootGate({ ORCH_WRITE_ROOT: `${root}/` }, "/repo/", tools)).toEqual(gate);
  });
});

describe("writeRootRefusal", () => {
  test("a read runs, wherever it reads", () => {
    expect(writeRootRefusal(gate, "read", { path: "/etc/passwd" })).toBeUndefined();
    expect(writeRootRefusal(gate, "grep", { pattern: "x" })).toBeUndefined();
  });

  test("a write inside the root runs", () => {
    for (const target of [
      ".orch/councils/plan/ada/round-1.md",
      "/repo/.orch/councils/plan/ada/round-1.md",
      ".orch/councils/plan/ada/notes/deep/x.md",
      "/repo/.orch/councils/plan/ada/..draft.md",
      "src/../.orch/councils/plan/ada/round-2.md",
    ]) {
      expect(writeRootRefusal(gate, "write", { path: target, content: "x" })).toBeUndefined();
    }
  });

  test("a write to the root itself or outside it is refused, and the refusal names the file", () => {
    for (const [target, file] of [
      [".orch/councils/plan/ada", "/repo/.orch/councils/plan/ada"],
      [".orch/councils/plan/ada/", "/repo/.orch/councils/plan/ada"],
      [".orch/councils/plan/bob/round-1.md", "/repo/.orch/councils/plan/bob/round-1.md"],
      [".orch/councils/plan/ada/../bob/round-1.md", "/repo/.orch/councils/plan/bob/round-1.md"],
      ["/repo/.orch/councils/plan/ada-2/round-1.md", "/repo/.orch/councils/plan/ada-2/round-1.md"],
      ["src/a.ts", "/repo/src/a.ts"],
      ["/etc/passwd", "/etc/passwd"],
      ["~/.bashrc", "/repo/~/.bashrc"],
      ["round-1.md", "/repo/round-1.md"],
    ]) {
      expect(writeRootRefusal(gate, "edit", { path: target })).toBe(`orch refused this write: ${file} is outside ${root}, the only directory this agent may write in.`);
    }
  });

  test("every other call is refused", () => {
    expect(writeRootRefusal(gate, "bash", { command: "ls" })).toBe(refusedTool);
    expect(writeRootRefusal(gate, "mcp__files__write", { path: `${root}/x.md` })).toBe(refusedTool);
    expect(writeRootRefusal(gate, 7, {})).toBe(refusedTool);
    expect(writeRootRefusal(gate, "edit", { file_path: `${root}/x.md` })).toBe(refusedTool);
    expect(writeRootRefusal(gate, "edit", `${root}/x.md`)).toBe(refusedTool);
  });
});

test("writeRootTools lists the reads, then the writes", () => {
  expect(writeRootTools(tools)).toEqual(["read", "grep", "edit", "write"]);
});
