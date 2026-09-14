import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, utimesSync, writeFileSync } from "node:fs";

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

  describe("update", () => {
    test("file manager lands text and current reflects it without reload", () => {
      const dir = tempDir();
      writeSettingsFixture(dir);
      const manager = fileSettingsManager(dir);

      manager.update((current) => {
        if (current === null) throw new Error("settings file is absent");
        return current.replace('"runtime": "node"', '"runtime": "bun"');
      });

      expect(manager.current().runtime).toBe("bun");
    });

    test("in-memory manager lands text and current reflects it", () => {
      const manager = inMemorySettingsManager(settingsFixtureText(), settingsPath(tempDir()));

      manager.update((current) => {
        if (current === null) throw new Error("settings file is absent");
        return current.replace('"runtime": "node"', '"runtime": "bun"');
      });

      expect(manager.current().runtime).toBe("bun");
    });

    test("removes a stale lock before updating", () => {
      const dir = tempDir();
      writeSettingsFixture(dir, { lock: { stale_ms: 10_000 } });
      const manager = fileSettingsManager(dir);
      const lockFile = `${settingsPath(dir)}.lock`;
      writeFileSync(lockFile, "stale");
      const staleAt = new Date(Date.now() - 60_000);
      utimesSync(lockFile, staleAt, staleAt);

      manager.update((current) => {
        if (current === null) throw new Error("settings file is absent");
        return current.replace('"runtime": "node"', '"runtime": "bun"');
      });

      expect(manager.current().runtime).toBe("bun");
      expect(existsSync(lockFile)).toBe(false);
    });

    test("refuses a held lock and leaves settings and lock untouched", () => {
      const dir = tempDir();
      writeSettingsFixture(dir, { lock: { retries: 2, interval_ms: 1, stale_ms: 60_000 } });
      const manager = fileSettingsManager(dir);
      const lockFile = `${settingsPath(dir)}.lock`;
      writeFileSync(lockFile, "held");
      const before = readFileSync(settingsPath(dir), "utf8");

      expect(() => manager.update((current) => {
        if (current === null) throw new Error("settings file is absent");
        return current.replace('"runtime": "node"', '"runtime": "bun"');
      })).toThrow(/locked by another orch process/);

      expect(readFileSync(settingsPath(dir), "utf8")).toBe(before);
      expect(existsSync(lockFile)).toBe(true);
    });
  });

  test("reports a legacy config.toml", () => {
    const dir = tempDir();
    writeFileSync(join(dir, "config.toml"), "legacy = true\n");
    const manager = fileSettingsManager(dir);

    expect(() => manager.currentOrNull()).toThrow(/legacy config\.toml/);
  });
});
