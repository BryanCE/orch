import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function sourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const full = join(root, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith(".ts") ? [full] : [];
  });
}

// CLAUDE.md Rule 9 and TASKS/07-port-seam.md slice 7: ALL control traffic goes
// through ONE dispatcher. A second one is not a smaller violation than pair code —
// it is the same violation, because the two drift and callers pick whichever they
// happened to import. src/control/dispatch.ts is that dispatcher.
describe("there is exactly one control dispatcher", () => {
  const src = join(import.meta.dir, "../src");

  test("no module outside src/control declares a control dispatcher", () => {
    const offenders = sourceFiles(src)
      .filter((file) => !file.replace(/\\/g, "/").includes("/src/control/"))
      .filter((file) => /export (function|const) dispatch(Strategies|Control)\b/.test(readFileSync(file, "utf8")))
      .map((file) => file.slice(src.length + 1));

    expect(offenders).toEqual([]);
  });

  test("no dispatcher is exported under two names", () => {
    const aliases = sourceFiles(src)
      .filter((file) => /export const dispatch\w* = dispatch\w*;/.test(readFileSync(file, "utf8")))
      .map((file) => file.slice(src.length + 1));

    expect(aliases).toEqual([]);
  });
});
