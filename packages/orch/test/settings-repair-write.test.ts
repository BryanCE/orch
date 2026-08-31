import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { loadSettings } from "../src/settings/read.ts";
import { applySettingsRepairs } from "../src/settings/write.ts";
import { isRecord } from "../src/util.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const directories: string[] = [];

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-settings-repair-"));
  directories.push(directory);
  return directory;
}

function readSettingsRecord(directory: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(fs.readFileSync(path.join(directory, "settings.json"), "utf8"));
  if (!isRecord(parsed)) throw new Error("settings.json is not an object");
  return parsed;
}

afterEach(() => {
  while (directories.length) removeTempDir(directories.pop()!);
});

describe("applySettingsRepairs", () => {
  test("rename carries the value to the new key", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { fleet: { spawn_cap: 4 } });

    applySettingsRepairs(directory, [{ kind: "rename", from: "fleet.spawn_cap", to: "fleet.max_agents_per_pack" }]);

    expect(loadSettings(directory).fleet.max_agents_per_pack).toBe(4);
    expect(readSettingsRecord(directory).fleet).toEqual({ max_agents_per_pack: 4 });
  });

  test("rename onto an occupied key throws and leaves the file untouched", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { fleet: { max_depth: 2, max_agents_per_pack: 4 } });
    const before = fs.readFileSync(path.join(directory, "settings.json"), "utf8");

    expect(() => applySettingsRepairs(directory, [{ kind: "rename", from: "fleet.max_depth", to: "fleet.max_agents_per_pack" }]))
      .toThrow(/fleet\.max_depth.*fleet\.max_agents_per_pack/);
    expect(fs.readFileSync(path.join(directory, "settings.json"), "utf8")).toBe(before);
  });

  test("set writes a value at a dotted path", () => {
    const directory = tempDir();
    writeSettingsFixture(directory);

    applySettingsRepairs(directory, [{ kind: "set", path: "fleet.max_depth", value: 6 }]);

    expect(loadSettings(directory).fleet.max_depth).toBe(6);
  });

  test("drop deletes a value without pruning its parent", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { fleet: { max_depth: 2 } });

    applySettingsRepairs(directory, [{ kind: "drop", path: "fleet.max_depth" }]);

    expect(readSettingsRecord(directory).fleet).toEqual({});
    expect(loadSettings(directory).fleet.max_depth).toBe(1);
  });

  test("applies several repairs in one call", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { fleet: { spawn_cap: 4, max_depth: 2 }, junk: true });

    applySettingsRepairs(directory, [
      { kind: "rename", from: "fleet.spawn_cap", to: "fleet.max_agents_per_pack" },
      { kind: "set", path: "fleet.max_depth", value: 3 },
      { kind: "drop", path: "junk" },
    ]);

    expect(loadSettings(directory).fleet).toMatchObject({ max_agents_per_pack: 4, max_depth: 3 });
    expect(readSettingsRecord(directory).junk).toBeUndefined();
  });

  test("repairs a schema-rejected file before readSettingsFile validates it", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "settings.json"), JSON.stringify({
      schemaVersion: 4,
      runtime: "node",
      fleet: { spawn_cap: 4 },
    }));

    expect(() => loadSettings(directory)).toThrow(/schemaVersion/);
    applySettingsRepairs(directory, [
      { kind: "rename", from: "fleet.spawn_cap", to: "fleet.max_agents_per_pack" },
      { kind: "set", path: "schemaVersion", value: 1 },
    ]);

    expect(loadSettings(directory).fleet.max_agents_per_pack).toBe(4);
  });
});
