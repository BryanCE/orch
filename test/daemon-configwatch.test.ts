import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startConfigWatch, type ConfigWatch } from "../src/daemon/configwatch.ts";
import type { OrchConfig } from "../src/config.ts";

const directories: string[] = [];
const watches: ConfigWatch[] = [];

function tempOrchDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-configwatch-"));
  directories.push(directory);
  return directory;
}

async function poll(predicate: () => boolean, timeoutMs = 2_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return predicate();
}

function configWithSpawnCap(spawnCap: number): string {
  return `[defaults]\nspawn_cap = ${spawnCap}\n`;
}

afterEach(() => {
  while (watches.length > 0) watches.pop()!.stop();
  while (directories.length > 0) rmSync(directories.pop()!, { recursive: true, force: true });
});

describe("config watch", () => {
  test("loads initially and applies edits", async () => {
    const orchDir = tempOrchDir();
    writeFileSync(join(orchDir, "config.toml"), configWithSpawnCap(2));
    const changes: OrchConfig[] = [];
    const watchHandle = startConfigWatch(orchDir, {
      debounceMs: 20,
      onChange: (config) => changes.push(config),
    });
    watches.push(watchHandle);

    expect(changes).toHaveLength(1);
    expect(changes[0].defaults.spawn_cap).toBe(2);

    writeFileSync(join(orchDir, "config.toml"), configWithSpawnCap(4));
    expect(await poll(() => changes.length === 2)).toBe(true);
    expect(changes[1].defaults.spawn_cap).toBe(4);
  });

  test("keeps the last good config on invalid TOML and recovers", async () => {
    const orchDir = tempOrchDir();
    writeFileSync(join(orchDir, "config.toml"), configWithSpawnCap(2));
    const changes: OrchConfig[] = [];
    const warnings: string[] = [];
    const watchHandle = startConfigWatch(orchDir, {
      debounceMs: 20,
      onChange: (config) => changes.push(config),
      onWarn: (message) => warnings.push(message),
    });
    watches.push(watchHandle);

    writeFileSync(join(orchDir, "config.toml"), "[defaults\nspawn_cap = 8\n");
    expect(await poll(() => warnings.length > 0)).toBe(true);
    expect(warnings).toHaveLength(1);
    expect(changes).toHaveLength(1);
    expect(changes[0].defaults.spawn_cap).toBe(2);

    writeFileSync(join(orchDir, "config.toml"), configWithSpawnCap(6));
    expect(await poll(() => changes.length === 2)).toBe(true);
    expect(changes[1].defaults.spawn_cap).toBe(6);
  });

  test("stops all callbacks", async () => {
    const orchDir = tempOrchDir();
    writeFileSync(join(orchDir, "config.toml"), configWithSpawnCap(2));
    let changes = 0;
    const watchHandle = startConfigWatch(orchDir, {
      debounceMs: 20,
      onChange: () => { changes++; },
    });
    watches.push(watchHandle);
    expect(changes).toBe(1);

    watchHandle.stop();
    writeFileSync(join(orchDir, "config.toml"), configWithSpawnCap(9));
    expect(await poll(() => changes > 1, 250)).toBe(false);
    expect(changes).toBe(1);
  });
});
