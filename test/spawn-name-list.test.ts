import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { claimSpawnNames } from "../src/commands/spawn.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
const oldDir = process.env.ORCH_DIR;

function makeDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-namelist-"));
  dirs.push(dir);
  writeSettingsFixture(dir, {});
  process.env.ORCH_DIR = dir;
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) removeTempDir(dir);
  if (oldDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldDir;
});

// A fleet where each pane holds a different slice must be namable AT SPAWN.
// Naming afterwards costs N extra commands and leaves the pane border stale
// until a second `--pane` rename lands (TASKS/11-usage-bugs.md U5, U6).
describe("spawn names a fleet at creation", () => {
  test("one name per pane, used verbatim and unnumbered", () => {
    makeDir();
    expect(claimSpawnNames(["api", "worker", "checker"], "", 3))
      .toEqual(["api", "worker", "checker"]);
  });

  test("a single name with N > 1 still grows the numbered fleet", () => {
    makeDir();
    expect(claimSpawnNames(["fix"], "", 3)).toEqual(["fix-1", "fix-2", "fix-3"]);
  });

  test("a name list whose length does not match N is refused before anything is created", () => {
    makeDir();
    expect(() => claimSpawnNames(["api", "worker"], "", 3)).toThrow(/3/);
  });

  test("every name in the list is validated, so one bad name creates nothing", () => {
    makeDir();
    expect(() => claimSpawnNames(["api", "not a valid name!"], "", 2)).toThrow();
  });
});
