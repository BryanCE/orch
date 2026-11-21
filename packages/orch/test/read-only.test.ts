import { describe, expect, test } from "bun:test";
import { readOnlyEnv, readOnlyGate, readOnlyRefusal, readOnlyTools, type ReadOnlyGate, type ToolVocabulary } from "../src/policy/read-only.ts";

const out = "/repo/.orch/councils/plan/ada";
const tools: ToolVocabulary = { reads: ["read", "grep"], writes: ["edit", "write"], pathField: "path" };
const withOut: ReadOnlyGate = { out, cwd: "/repo", tools };
const noOut: ReadOnlyGate = { out: null, cwd: "/repo", tools };
const readOnly = "orch refused this tool: this agent is read-only.";
const readOnlyWithOut = `orch refused this tool: this agent is read-only, and writes only inside ${out}.`;

describe("readOnlyGate", () => {
  test("a launch that was not read-only has no gate", () => {
    expect(readOnlyGate({}, "/repo", tools)).toBeNull();
    expect(readOnlyGate({ ORCH_READ_ONLY: "" }, "/repo", tools)).toBeNull();
    expect(readOnlyGate({ ORCH_OUT_DIR: out }, "/repo", tools)).toBeNull();
  });

  test("a read-only launch has a gate, with its output directory when it was given one", () => {
    expect(readOnlyGate({ ORCH_READ_ONLY: "1" }, "/repo/", tools)).toEqual(noOut);
    expect(readOnlyGate({ ORCH_READ_ONLY: "1", ORCH_OUT_DIR: `${out}/` }, "/repo", tools)).toEqual(withOut);
  });

  test("the env a launch sets reads back as the same gate", () => {
    expect(readOnlyGate(readOnlyEnv({ out }), "/repo", tools)).toEqual(withOut);
    expect(readOnlyGate(readOnlyEnv({ out: null }), "/repo", tools)).toEqual(noOut);
  });
});

describe("readOnlyRefusal", () => {
  test("a read runs, wherever it reads", () => {
    expect(readOnlyRefusal(noOut, "read", { path: "/etc/passwd" })).toBeUndefined();
    expect(readOnlyRefusal(withOut, "grep", { pattern: "x" })).toBeUndefined();
  });

  test("with no output directory every other call is refused, a write included", () => {
    expect(readOnlyRefusal(noOut, "write", { path: "notes.md", content: "x" })).toBe(readOnly);
    expect(readOnlyRefusal(noOut, "bash", { command: "ls" })).toBe(readOnly);
    expect(readOnlyRefusal(noOut, 7, {})).toBe(readOnly);
  });

  test("a write inside the output directory runs", () => {
    for (const target of [
      ".orch/councils/plan/ada/round-1.md",
      "/repo/.orch/councils/plan/ada/round-1.md",
      ".orch/councils/plan/ada/notes/deep/x.md",
      "/repo/.orch/councils/plan/ada/..draft.md",
      "src/../.orch/councils/plan/ada/round-2.md",
    ]) {
      expect(readOnlyRefusal(withOut, "write", { path: target, content: "x" })).toBeUndefined();
    }
  });

  test("a write to the output directory itself or outside it is refused, and the refusal names the file", () => {
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
      expect(readOnlyRefusal(withOut, "edit", { path: target })).toBe(`orch refused this write: ${file} is outside ${out}, the only directory this agent may write in.`);
    }
  });

  test("with an output directory, a tool that is neither a read nor a write of one file is refused", () => {
    expect(readOnlyRefusal(withOut, "bash", { command: "ls" })).toBe(readOnlyWithOut);
    expect(readOnlyRefusal(withOut, "mcp__files__write", { path: `${out}/x.md` })).toBe(readOnlyWithOut);
    expect(readOnlyRefusal(withOut, "edit", { file_path: `${out}/x.md` })).toBe(readOnlyWithOut);
    expect(readOnlyRefusal(withOut, "edit", `${out}/x.md`)).toBe(readOnlyWithOut);
  });
});

describe("readOnlyTools", () => {
  test("the reads alone, and the writes too when there is an output directory", () => {
    expect(readOnlyTools(tools, { out: null })).toEqual(["read", "grep"]);
    expect(readOnlyTools(tools, { out })).toEqual(["read", "grep", "edit", "write"]);
  });
});
