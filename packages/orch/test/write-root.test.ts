import { describe, expect, test } from "bun:test";
import { insideWriteRoot, toolReach, writeRootOf, writeRootRefusal, writeRootTools } from "../src/policy/write-root.ts";
import type { ToolVocabulary } from "../src/policy/write-root.ts";

const root = "/repo/.orch/councils/plan/ada";
const cwd = "/repo";

describe("write root", () => {
  test("reads the configured root", () => {
    expect(writeRootOf({})).toBeNull();
    expect(writeRootOf({ ORCH_WRITE_ROOT: "" })).toBeNull();
    expect(writeRootOf({ ORCH_WRITE_ROOT: root })).toBe(root);
  });

  test("recognizes paths inside the root", () => {
    for (const target of [
      ".orch/councils/plan/ada/round-1.md",
      "/repo/.orch/councils/plan/ada/round-1.md",
      ".orch/councils/plan/ada/notes/deep/x.md",
      "/repo/.orch/councils/plan/ada/..draft.md",
      "src/../.orch/councils/plan/ada/round-2.md",
    ]) {
      expect(insideWriteRoot(root, cwd, target)).toBe(true);
    }
  });

  test("rejects the root itself and paths outside it", () => {
    for (const target of [
      ".orch/councils/plan/ada",
      ".orch/councils/plan/ada/",
      ".orch/councils/plan/bob/round-1.md",
      ".orch/councils/plan/ada/../bob/round-1.md",
      "/repo/.orch/councils/plan/ada-2/round-1.md",
      "src/a.ts",
      "/etc/passwd",
      "~/.bashrc",
      "round-1.md",
    ]) {
      expect(insideWriteRoot(root, cwd, target)).toBe(false);
    }
    expect(insideWriteRoot("/repo/.orch/councils/plan/ada/", cwd, ".orch/councils/plan/ada/round-1.md")).toBe(true);
  });

  test("classifies a tool call by its harness's vocabulary", () => {
    const tools: ToolVocabulary = { reads: ["read", "grep"], writes: ["edit", "write"], pathField: "path" };
    expect(toolReach(tools, "read", { path: "a.ts" })).toEqual({ kind: "reads" });
    expect(toolReach(tools, "write", { path: "a.ts", content: "x" })).toEqual({ kind: "writes", path: "a.ts" });
    expect(toolReach(tools, "edit", { file_path: "a.ts" })).toEqual({ kind: "other" });
    expect(toolReach(tools, "edit", "a.ts")).toEqual({ kind: "other" });
    expect(toolReach(tools, "bash", { command: "ls" })).toEqual({ kind: "other" });
    expect(toolReach(tools, 7, {})).toEqual({ kind: "other" });
    expect(writeRootTools(tools)).toEqual(["read", "grep", "edit", "write"]);
  });

  test("explains refusals by tool reach", () => {
    expect(writeRootRefusal(root, cwd, { kind: "reads" })).toBeUndefined();
    expect(writeRootRefusal(root, cwd, { kind: "writes", path: ".orch/councils/plan/ada/round-1.md" })).toBeUndefined();
    expect(writeRootRefusal(root, cwd, { kind: "writes", path: "src/a.ts" })).toBe(
      "orch refused this write: /repo/src/a.ts is outside /repo/.orch/councils/plan/ada, the only directory this agent may write in.",
    );
    expect(writeRootRefusal(root, cwd, { kind: "other" })).toBe(
      "orch refused this tool: this agent only reads files, and writes only inside /repo/.orch/councils/plan/ada.",
    );
  });
});
