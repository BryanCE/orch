import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { checkSettingsFile } from "../src/doctor/settings-file.ts";
import { runDoctor } from "../src/doctor/runner.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

const directories: string[] = [];

function tempDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-doctor-settings-defects-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  while (directories.length > 0) {
    const directory = directories.pop();
    if (directory !== undefined) removeTempDir(directory);
  }
});

describe("doctor settings defects", () => {
  test("accepts an absent settings file", async () => {
    const directory = tempDir();

    expect(await checkSettingsFile(directory)).toEqual({
      id: "settings",
      label: "Settings validity",
      status: "ok",
      detail: "no settings.json",
    });
  });

  test("accepts a clean settings file and keeps its path detail", async () => {
    const directory = tempDir();
    const file = writeSettingsFixture(directory);

    expect(await checkSettingsFile(directory)).toEqual({
      id: "settings",
      label: "Settings validity",
      status: "ok",
      detail: file,
    });
  });

  test("reports malformed JSON as a file defect", async () => {
    const directory = tempDir();
    writeFileSync(join(directory, "settings.json"), "{\n");

    const result = await checkSettingsFile(directory);
    expect(result.status).toBe("fail");
    expect(result.detail).toContain("(whole file) = (none)  not valid JSON:");
  });

  test("reports a read failure instead of throwing", async () => {
    const directory = tempDir();
    const file = join(directory, "settings.json");
    // A directory at the settings path makes readFileSync fail after existsSync succeeds.
    mkdirSync(file);

    const result = await checkSettingsFile(directory);
    expect(result.status).toBe("fail");
    expect(result.detail.length).toBeGreaterThan(0);
    rmSync(file, { recursive: true, force: true });
  });

  test("reports a stale key with the value that was written", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { fleet: { spawn_cap: 8 } });

    const result = await checkSettingsFile(directory);
    expect(result.status).toBe("fail");
    expect(result.detail).toContain("1 key cannot be read; fix: orch settings");
    expect(result.detail).toContain("fleet.spawn_cap = 8  not a settings key");
    expect(result.detail).not.toContain("orch setup");
  });

  test("reports a typo with its suggested key", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { fleet: { max_dpeth: 2 } });

    const result = await checkSettingsFile(directory);
    expect(result.detail).toContain("fleet.max_dpeth = 2  not a settings key; did you mean fleet.max_depth?");
  });

  test("reports the expected schema version", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { schemaVersion: 4 });

    const result = await checkSettingsFile(directory);
    expect(result.detail).toContain("schemaVersion = 4  expected 1");
  });

  test("skips settings-dependent checks with a short repair hint", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { fleet: { spawn_cap: 8 } });

    const results = await runDoctor(directory, () => ({ ok: true, stdout: "", stderr: "", code: 0 }));
    const result = results.find((entry) => entry.id === "spawn-limits");
    if (result === undefined) throw new Error("missing spawn-limits result");

    expect(result).toEqual({
      id: "spawn-limits",
      label: "Spawn limits",
      status: "skip",
      detail: "settings.json has 1 unreadable key(s); fix: orch settings",
    });
    expect(result.detail).not.toContain("Zod");
  }, 30_000);
});
