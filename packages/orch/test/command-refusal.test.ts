import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cmdRuns } from "../src/commands/runs.ts";
import { CommandRefusal } from "../src/refusal.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
const previous = process.env.ORCH_DIR;

afterEach(() => {
  closeAllStores();
  while (dirs.length > 0) removeTempDir(dirs.pop()!);
  if (previous === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = previous;
});

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-refusal-"));
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  writeSettingsFixture(dir, {
    enabled: { adapters: ["pi"], backends: ["headless"] },
    defaults: { adapter: "pi", backend: "headless" },
  });
  return dir;
}

// A command that refuses by calling process.exit() cannot be tested and cannot be
// composed: inside `bun test` it kills the RUNNER, so every test file after it is
// silently never run and the suite reports no summary at all. That is how a whole
// suite can look green while most of it never executed. A refusal is a value the
// boundary turns into an exit code, never an exit from the middle of the program.
describe("a command refusal is thrown, not exited", () => {
  test("an unresolvable target throws a CommandRefusal instead of killing the process", () => {
    fixture();
    expect(() => cmdRuns(["absentag01", "--json"])).toThrow(CommandRefusal);
  });

  test("the refusal carries the reason a human needs", () => {
    fixture();
    expect(() => cmdRuns(["absentag01", "--json"])).toThrow(/No target matches/);
  });

  test("the CLI boundary turns a refusal into exit 1 with the message on stdout", () => {
    const dir = fixture();
    const ran = Bun.spawnSync(
      [process.execPath, join(import.meta.dir, "../bin/orch.ts"), "runs", "absentag01", "--json"],
      { env: { ...process.env, ORCH_DIR: dir }, stdout: "pipe", stderr: "pipe" },
    );
    expect(ran.exitCode).toBe(1);
    expect(ran.stdout.toString()).toContain("No target matches");
  });
});
