import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { isAnyFile, sourceFiles } from "./helpers/sources.ts";
import { join } from "node:path";

describe("the backend port has no dead workspace shell", () => {
  test("backend types contain neither deleted declaration", () => {
    const source = readFileSync(join(import.meta.dir, "../src/types/backend.ts"), "utf8");
    expect(source).not.toContain("workspaceNames");
    expect(source).not.toContain("interface BackendWorkspace");
  });

  test("src contains no workspaceNames calls or BackendWorkspace references", () => {
    const source = sourceFiles(join(import.meta.dir, "../src"), isAnyFile)
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    expect(source).not.toContain("workspaceNames(");
    expect(source).not.toContain("BackendWorkspace");
  });
});
