import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runTestDoctor } from "../test/helpers/doctor.ts";
import { removeTempDir, tempOrchDir } from "../test/helpers/tempdir.ts";

import type { OrchDir } from "../src/types/core.ts";
const dirs: OrchDir[] = [];

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop() ?? "");
});

describe("doctor settings preservation", () => {
  test("yes mode leaves existing settings.json byte-identical", async () => {
    const dir = tempOrchDir("orch-doctor-");
    dirs.push(dir);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "settings.json");
    const custom = '{"custom":true, "models":{"pi":"keep-me"}}\n';
    writeFileSync(file, custom);
    await runTestDoctor(dir, { yes: true });
    expect(readFileSync(file, "utf8")).toBe(custom);
  }, 30_000);
});
