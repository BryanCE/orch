import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";

import { join } from "node:path";
import { fileSettingsManager, inMemorySettingsManager } from "../src/settings/manager.ts";
import { settingsPath } from "../src/settings/schema.ts";
import { settingsFixtureText, writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const tempDirs: OrchDir[] = [];

function tempDir(): OrchDir {
  const dir = tempOrchDir("orch-settings-manager-");
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) removeTempDir(dir);
});

describe("settings manager", () => {
  test("currentOrNull returns null and current reports an absent file", () => {
    const manager = inMemorySettingsManager(null, settingsPath(tempDir()));

    expect(manager.currentOrNull()).toBeNull();
    expect(() => manager.current()).toThrow(/does not exist.*orch setup/s);
    expect(() => manager.current()).toThrow(manager.file);
  });

  test("parses valid fixture text", () => {
    const manager = inMemorySettingsManager(settingsFixtureText({ defaults: { adapter: "pi" } }), settingsPath(tempDir()));

    const settings = manager.current();
    expect(settings.runtime).toBe("node");
    expect(settings.enabled.adapters).toEqual(["pi"]);
  });

  test("holds one parsed object until reload", () => {
    const manager = inMemorySettingsManager(settingsFixtureText(), settingsPath(tempDir()));

    expect(manager.current()).toBe(manager.current());
  });

  test("does not cache malformed text as a value", () => {
    const manager = inMemorySettingsManager("{not json", settingsPath(tempDir()));

    expect(() => manager.currentOrNull()).toThrow(/expected valid JSON/);
    expect(() => manager.currentOrNull()).toThrow(/expected valid JSON/);
  });

  test("reloads file settings after the file changes", () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { defaults: { adapter: "pi" } });
    const manager = fileSettingsManager(dir);

    expect(manager.current().defaults.adapter).toBe("pi");
    writeSettingsFixture(dir, { defaults: { adapter: "claude" } });
    expect(manager.current().defaults.adapter).toBe("pi");
    expect(manager.reload()?.defaults.adapter).toBe("claude");
    expect(manager.current().defaults.adapter).toBe("claude");
  });

  test("reports a legacy config.toml", () => {
    const dir = tempDir();
    writeFileSync(join(dir, "config.toml"), "legacy = true\n");
    const manager = fileSettingsManager(dir);

    expect(() => manager.currentOrNull()).toThrow(/legacy config\.toml/);
  });
});
