import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() ? [path] : [];
  });
}

describe("the backend port has no dead workspace shell", () => {
  test("backend types contain neither deleted declaration", () => {
    const source = readFileSync(join(import.meta.dir, "../src/types/backend.ts"), "utf8");
    expect(source).not.toContain("workspaceNames");
    expect(source).not.toContain("interface BackendWorkspace");
  });

  test("src contains no workspaceNames calls or BackendWorkspace references", () => {
    const source = sourceFiles(join(import.meta.dir, "../src"))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    expect(source).not.toContain("workspaceNames(");
    expect(source).not.toContain("BackendWorkspace");
  });
});
