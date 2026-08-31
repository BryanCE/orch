import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { claimSpawnNames, resolveSpawnNames } from "../src/commands/spawn/names.ts";
import { parseSpawnFlags } from "../src/commands/spawn/flags.ts";
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

// `orch spawn <name>` — naming is REQUIRED and there is no default name. Naming
// an agent is part of creating it, not an option alongside
// it: the names ARE the positional arguments, and how many you give is how many
// panes you get. A count is not a name, and an ordinal like `fix-1` says nothing
// about the slice that pane holds.
describe("spawn names every agent positionally, at creation", () => {
  test("the positional arguments are the names, one per pane", () => {
    expect(resolveSpawnNames(["api", "worker", "checker"]))
      .toEqual(["api", "worker", "checker"]);
  });

  test("the pane count is how many names were given", () => {
    expect(resolveSpawnNames(["only-one"]).length).toBe(1);
  });

  test("spawning with no name at all is refused", () => {
    expect(() => resolveSpawnNames([])).toThrow(/name/i);
  });

  test("a bare count is not a name and is refused", () => {
    expect(() => resolveSpawnNames(["4"])).toThrow(/name/i);
  });

  test("the same name twice would collide, so it is refused before anything is created", () => {
    expect(() => resolveSpawnNames(["api", "api"])).toThrow(/api/);
  });

  test("every name is validated, so one bad name creates nothing", () => {
    expect(() => resolveSpawnNames(["api", "not a valid name!"])).toThrow();
  });

  test("--name is gone: naming is positional, so the flag is an unknown flag", () => {
    expect(parseSpawnFlags(["--name", "api"]).unknownFlags).toContain("--name");
  });

  test("claimSpawnNames takes the resolved names and asserts each is free", () => {
    makeDir();
    expect(claimSpawnNames(["api", "worker"], "")).toEqual(["api", "worker"]);
  });
});
