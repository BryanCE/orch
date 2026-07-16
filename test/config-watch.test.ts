import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { settingsPath, watchConfig, type OrchConfig } from "../src/config.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

const directories: string[] = [];
const watches: { stop(): void }[] = [];

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
  test("applies a valid edit after the debounced change", async () => {
    const orchDir = tempOrchDir();
    writeSettingsFixture(orchDir, { defaults: { spawn_cap: 2 } });
    const changes: OrchConfig[] = [];
    const watch = watchConfig(orchDir, (config) => changes.push(config));
    watches.push(watch);

    expect(changes).toHaveLength(1);
    writeSettingsFixture(orchDir, { defaults: { spawn_cap: 4 } });
    expect(await waitFor(() => changes.length === 2)).toBe(true);
    expect(changes[1]!.defaults.spawn_cap).toBe(4);
  });

  test("keeps the last-good config and warns once for an invalid edit", async () => {
    const orchDir = tempOrchDir();
    writeSettingsFixture(orchDir, { defaults: { spawn_cap: 2 } });
    const changes: OrchConfig[] = [];
    const warnings: string[] = [];
    const watch = watchConfig(orchDir, (config) => changes.push(config), (msg) => warnings.push(msg));
    watches.push(watch);

    writeFileSync(settingsPath(orchDir), "{ not json");
    expect(await waitFor(() => warnings.length === 1)).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(changes).toHaveLength(1);
    expect(changes[0]!.defaults.spawn_cap).toBe(2);
    expect(warnings).toHaveLength(1);
  });

  test("stop prevents further callbacks", async () => {
    const orchDir = tempOrchDir();
    writeSettingsFixture(orchDir, { defaults: { spawn_cap: 2 } });
    let changes = 0;
    const watch = watchConfig(orchDir, () => { changes++; });
    expect(changes).toBe(1);
    watch.stop();
    writeSettingsFixture(orchDir, { defaults: { spawn_cap: 9 } });
    expect(await waitFor(() => changes > 1, 400)).toBe(false);
    expect(changes).toBe(1);
  });
});
