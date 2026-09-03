import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { sourceFiles } from "./helpers/sources.ts";
import { join } from "node:path";

// CLAUDE.md Rule 9: ALL control traffic goes
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
