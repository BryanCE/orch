import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { settingsPath } from "../src/settings/schema.ts";
import { watchSettings } from "../src/settings/watch.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { SettingsWatch, OrchSettings } from "../src/types/settings.ts";

const directories: string[] = [];
const watches: SettingsWatch[] = [];

function tempOrchDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-settings-watch-"));
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
  while (directories.length > 0) removeTempDir(directories.pop()!);
});

describe("watchSettings", () => {
  test("loads initially and applies a valid edit after the debounce", async () => {
    const orchDir = tempOrchDir();
    writeSettingsFixture(orchDir, { fleet: { max_depth: 2 } });
    const changes: OrchSettings[] = [];
    const watch = watchSettings(orchDir, { debounceMs: 20, onChange: (settings) => changes.push(settings) });
    watches.push(watch);

    expect(changes).toHaveLength(1);
    expect(changes[0]!.fleet.max_depth).toBe(2);

    writeSettingsFixture(orchDir, { fleet: { max_depth: 4 } });
    expect(await waitFor(() => changes.length === 2)).toBe(true);
    expect(changes[1]!.fleet.max_depth).toBe(4);
  });

  test("keeps the last-good settings, warns once, and recovers", async () => {
    const orchDir = tempOrchDir();
    writeSettingsFixture(orchDir, { fleet: { max_depth: 2 } });
    const changes: OrchSettings[] = [];
    const warnings: string[] = [];
    const watch = watchSettings(orchDir, {
      debounceMs: 20,
      onChange: (settings) => changes.push(settings),
      onWarn: (message) => warnings.push(message),
    });
    watches.push(watch);

    writeFileSync(settingsPath(orchDir), "{ not json");
    expect(await waitFor(() => warnings.length > 0)).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(warnings).toHaveLength(1);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.fleet.max_depth).toBe(2);

    writeSettingsFixture(orchDir, { fleet: { max_depth: 6 } });
    expect(await waitFor(() => changes.length === 2)).toBe(true);
    expect(changes[1]!.fleet.max_depth).toBe(6);
  });

  test("reloads on a touched reload.signal without a settings edit", async () => {
    const orchDir = tempOrchDir();
    writeSettingsFixture(orchDir, { fleet: { max_depth: 2 } });
    let changes = 0;
    const watch = watchSettings(orchDir, { debounceMs: 20, onChange: () => { changes++; } });
    watches.push(watch);
    expect(changes).toBe(1);

    const signal = join(orchDir, "reload.signal");
    writeFileSync(signal, "");
    utimesSync(signal, new Date(), new Date());
    expect(await waitFor(() => changes > 1)).toBe(true);
  });

  test("stop prevents further callbacks", async () => {
    const orchDir = tempOrchDir();
    writeSettingsFixture(orchDir, { fleet: { max_depth: 2 } });
    let changes = 0;
    const watch = watchSettings(orchDir, { debounceMs: 20, onChange: () => { changes++; } });
    expect(changes).toBe(1);

    watch.stop();
    writeSettingsFixture(orchDir, { fleet: { max_depth: 9 } });
    expect(await waitFor(() => changes > 1, 400)).toBe(false);
    expect(changes).toBe(1);
  });
});
