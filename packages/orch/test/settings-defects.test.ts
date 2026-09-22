import type { OrchDir } from "../src/types/core.ts";
import { writeFileSync } from "node:fs";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { newerSettingsKeys, settingsDefects } from "../src/settings/defects.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

const directories: OrchDir[] = [];

function tempDir(): OrchDir {
  const directory = tempOrchDir("orch-settings-defects-");
  directories.push(directory);
  return directory;
}

afterEach(() => {
  while (directories.length > 0) {
    const directory = directories.pop();
    if (directory !== undefined) removeTempDir(directory);
  }
});

describe("settingsDefects", () => {
  test("returns no defects for an absent file", () => {
    const file = join(tempDir(), "settings.json");
    expect(settingsDefects(file)).toEqual([]);
  });

  test("returns no defects for a valid settings file", () => {
    const file = writeSettingsFixture(tempDir(), { defaults: { adapter: "pi", backend: "headless" } });
    expect(settingsDefects(file)).toEqual([]);
  });

  test("reports unparsable JSON as one file defect", () => {
    const file = join(tempDir(), "settings.json");
    writeFileSync(file, "{\n");

    expect(settingsDefects(file)).toEqual([
      expect.objectContaining({ path: "", value: undefined }),
    ]);
    expect(settingsDefects(file)[0]?.problem).toStartWith("not valid JSON: ");
  });

  test("suggests a near-match for a stale key", () => {
    const file = writeSettingsFixture(tempDir(), { fleet: { max_dpeth: 3 } });

    expect(settingsDefects(file)).toEqual([
      { path: "fleet.max_dpeth", value: 3, problem: "not a settings key", suggestion: "fleet.max_depth" },
    ]);
  });

  test("a key far from every declared key is a newer build's key, not a defect", () => {
    const file = writeSettingsFixture(tempDir(), { fleet: { spawn_cap: 3 }, denied_commands: { commands: ["bun test"] } });

    expect(settingsDefects(file)).toEqual([]);
    expect(newerSettingsKeys(file)).toEqual(["fleet.spawn_cap"]);
  });

  test("settings_file.typo_max_edits sets how near a key must be to count as a typo", () => {
    const file = writeSettingsFixture(tempDir(), { fleet: { max_dpeth: 3 }, settings_file: { typo_max_edits: 0 } });

    expect(settingsDefects(file)).toEqual([]);
    expect(newerSettingsKeys(file)).toEqual(["fleet.max_dpeth"]);
  });

  test("reports the expected pinned schema value", () => {
    const file = writeSettingsFixture(tempDir(), { schemaVersion: 4 });

    const defects = settingsDefects(file);
    expect(defects).toHaveLength(1);
    expect(defects[0]?.path).toBe("schemaVersion");
    expect(defects[0]?.value).toBe(4);
    expect(defects[0]?.expected).toBe(1);
  });

  test("reports a wrong value type on a real key", () => {
    const file = writeSettingsFixture(tempDir(), { fleet: { max_depth: "deep" } });

    const defects = settingsDefects(file);
    expect(defects).toHaveLength(1);
    expect(defects[0]?.path).toBe("fleet.max_depth");
    expect(defects[0]?.value).toBe("deep");
    expect(defects[0]?.problem).toContain("expected number");
  });
});
