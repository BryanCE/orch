import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDoctor } from "../src/doctor/runner.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop() ?? "");
});

describe("doctor settings preservation", () => {
  test("yes mode leaves existing settings.json byte-identical", async () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-doctor-"));
    dirs.push(dir);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "settings.json");
    const custom = '{"custom":true, "models":{"pi":"keep-me"}}\n';
    writeFileSync(file, custom);
    await runDoctor(dir, { yes: true });
    expect(readFileSync(file, "utf8")).toBe(custom);
  }, 30_000);
});
