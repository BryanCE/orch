import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { settingsPath, watchConfig, type ConfigWatch, type OrchConfig } from "../src/config.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

const directories: string[] = [];
const watches: ConfigWatch[] = [];

function tempOrchDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-config-watch-"));
  directories.push(directory);
  return directory;
}

async function waitFor(predicate: () => boolean, timeoutMs = 2_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return predicate();
}

afterEach(() => {
  while (watches.length > 0) watches.pop()!.stop();
  while (directories.length > 0) rmSync(directories.pop()!, { recursive: true, force: true });
});

describe("watchConfig", () => {
  test("loads initially and applies a valid edit after the debounce", async () => {
    const orchDir = tempOrchDir();
    writeSettingsFixture(orchDir, { defaults: { spawn_cap: 2 } });
    const changes: OrchConfig[] = [];
    const watch = watchConfig(orchDir, { debounceMs: 20, onChange: (config) => changes.push(config) });
    watches.push(watch);

    expect(changes).toHaveLength(1);
    expect(changes[0]!.defaults.spawn_cap).toBe(2);

    writeSettingsFixture(orchDir, { defaults: { spawn_cap: 4 } });
    expect(await waitFor(() => changes.length === 2)).toBe(true);
    expect(changes[1]!.defaults.spawn_cap).toBe(4);
  });

  test("keeps the last-good config, warns once, and recovers", async () => {
    const orchDir = tempOrchDir();
    writeSettingsFixture(orchDir, { defaults: { spawn_cap: 2 } });
    const changes: OrchConfig[] = [];
    const warnings: string[] = [];
    const watch = watchConfig(orchDir, {
      debounceMs: 20,
      onChange: (config) => changes.push(config),
      onWarn: (message) => warnings.push(message),
    });
    watches.push(watch);

    writeFileSync(settingsPath(orchDir), "{ not json");
    expect(await waitFor(() => warnings.length > 0)).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(warnings).toHaveLength(1);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.defaults.spawn_cap).toBe(2);

    writeSettingsFixture(orchDir, { defaults: { spawn_cap: 6 } });
    expect(await waitFor(() => changes.length === 2)).toBe(true);
    expect(changes[1]!.defaults.spawn_cap).toBe(6);
  });

  test("reloads on a touched reload.signal without a settings edit", async () => {
    const orchDir = tempOrchDir();
    writeSettingsFixture(orchDir, { defaults: { spawn_cap: 2 } });
    let changes = 0;
    const watch = watchConfig(orchDir, { debounceMs: 20, onChange: () => { changes++; } });
    watches.push(watch);
    expect(changes).toBe(1);

    const signal = join(orchDir, "reload.signal");
    writeFileSync(signal, "");
    utimesSync(signal, new Date(), new Date());
    expect(await waitFor(() => changes > 1)).toBe(true);
  });

  test("stop prevents further callbacks", async () => {
    const orchDir = tempOrchDir();
    writeSettingsFixture(orchDir, { defaults: { spawn_cap: 2 } });
    let changes = 0;
    const watch = watchConfig(orchDir, { debounceMs: 20, onChange: () => { changes++; } });
    expect(changes).toBe(1);

    watch.stop();
    writeSettingsFixture(orchDir, { defaults: { spawn_cap: 9 } });
    expect(await waitFor(() => changes > 1, 400)).toBe(false);
    expect(changes).toBe(1);
  });
});
