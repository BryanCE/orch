import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileSettingsManager } from "../src/settings/manager.ts";
import { parseSettingsText } from "../src/settings/read.ts";
import { writeSettingsValue } from "../src/settings/write.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";

const directories: OrchDir[] = [];

function tempDir(): OrchDir {
  const directory = tempOrchDir("orch-settings-unknown-");
  directories.push(directory);
  return directory;
}

afterEach(() => {
  while (directories.length) removeTempDir(directories.pop()!);
});

describe("a key this build does not declare", () => {
  test("a newer build's key is ignored on read", () => {
    const file = writeSettingsFixture(tempDir(), { fleet: { max_depth: 2, spawn_cap: 3 }, future_section: { on: true } });
    const parsed = parseSettingsText(readFileSync(file, "utf8"), file);
    expect(parsed.settings.fleet?.max_depth).toBe(2);
    expect(parsed.newer.map((key) => key.at.join(".")).sort()).toEqual(["fleet.spawn_cap", "future_section"]);
  });

  test("a typo is refused and names the key it misspells", () => {
    const file = writeSettingsFixture(tempDir(), { lockd_commands: ["bun test"] });
    expect(() => parseSettingsText(readFileSync(file, "utf8"), file)).toThrow("lockd_commands (did you mean locked_commands?)");
  });

  test("a bad value on a declared key still fails", () => {
    const file = writeSettingsFixture(tempDir(), { fleet: { max_depth: "deep" }, future_section: {} });
    expect(() => parseSettingsText(readFileSync(file, "utf8"), file)).toThrow("invalid values");
  });

  test("a write keeps a newer build's keys on disk", () => {
    const directory = tempDir();
    const file = writeSettingsFixture(directory, { fleet: { spawn_cap: 3 }, future_section: { on: true } });
    writeSettingsValue(fileSettingsManager(directory), "fleet.max_depth", 4);
    const written: unknown = JSON.parse(readFileSync(file, "utf8"));
    expect(written).toMatchObject({ fleet: { max_depth: 4, spawn_cap: 3 }, future_section: { on: true } });
  });
});
