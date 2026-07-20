import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { loadConfig, resolveSetting } from "../src/config.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

const directories: string[] = [];
const envName = "ORCH_CONFIG_PRECEDENCE_HERMETIC";
const originalEnv = process.env[envName];

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-config-precedence-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  while (directories.length) fs.rmSync(directories.pop()!, { recursive: true, force: true });
  if (originalEnv === undefined) delete process.env[envName];
  else process.env[envName] = originalEnv;
});

describe("config precedence", () => {
  test("returns a defaults value when no override is set", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { defaults: { spawn_cap: 4 } });
    delete process.env[envName];

    const config = loadConfig(directory);
    expect(resolveSetting({ env: envName, config: config.defaults.spawn_cap, fallback: 8 })).toBe(4);
  });

  test("applies defaults when config, env, and flag are absent", () => {
    delete process.env[envName];
    const directory = tempDir();
    writeSettingsFixture(directory);
    const config = loadConfig(directory);

    expect(resolveSetting({ env: envName, config: config.defaults.spawn_cap, fallback: 8 })).toBe(8);
  });

  test("uses env over config and flag over env", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { defaults: { spawn_cap: 4 } });
    process.env[envName] = "7";
    const config = loadConfig(directory);

    expect(resolveSetting({ env: envName, config: config.defaults.spawn_cap, fallback: 8 })).toBe(7);
    expect(resolveSetting({ flag: 9, env: envName, config: config.defaults.spawn_cap, fallback: 8 })).toBe(9);
  });

  test("parses notify entries and hosts into expected shapes", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      notify: [{ id: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
      hosts: { gpu1: { dest: "bryan@gpu1", orch_dir: "/srv/orch", timeout_ms: 30 } },
    });

    expect(loadConfig(directory)).toMatchObject({
      notify: [{ id: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
      hosts: { gpu1: { dest: "bryan@gpu1", orch_dir: "/srv/orch", timeout_ms: 30 } },
    });
  });

  test("reports a helpful validation error for invalid config", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { defaults: { spawn_cap: "many" } });

    expect(() => loadConfig(directory)).toThrow(/defaults\.spawn_cap/);
  });
});
