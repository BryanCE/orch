import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { resolveSetting } from "../src/settings/read.ts";
import { fileSettingsManager } from "../src/settings/manager.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const directories: OrchDir[] = [];
const envName = "ORCH_DAEMON_PORT";
const originalEnv = process.env[envName];

function tempDir(): OrchDir {
  const directory = tempOrchDir("orch-settings-precedence-");
  directories.push(directory);
  return directory;
}

afterEach(() => {
  while (directories.length) removeTempDir(directories.pop()!);
  if (originalEnv === undefined) delete process.env[envName];
  else process.env[envName] = originalEnv;
});

describe("settings precedence", () => {
  test("returns a defaults value when no override is set", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { daemon: { tcp_port: 4321 } });
    delete process.env[envName];

    const settings = fileSettingsManager(directory).current();
    expect(resolveSetting({ env: envName, settings: settings.daemon.tcp_port, fallback: 3716 })).toBe(4321);
  });

  test("applies defaults when settings, env, and flag are absent", () => {
    delete process.env[envName];
    const directory = tempDir();
    writeSettingsFixture(directory);
    const settings = fileSettingsManager(directory).current();

    expect(resolveSetting({ env: envName, settings: settings.daemon.tcp_port, fallback: 3716 })).toBe(3716);
  });

  test("uses env over settings and flag over env", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { daemon: { tcp_port: 4321 } });
    process.env[envName] = "7";
    const settings = fileSettingsManager(directory).current();

    expect(resolveSetting({ env: envName, settings: settings.daemon.tcp_port, fallback: 3716 })).toBe(7);
    expect(resolveSetting({ flag: 9, env: envName, settings: settings.daemon.tcp_port, fallback: 3716 })).toBe(9);
  });

  test("parses notify entries and hosts into expected shapes", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      notify: [{ id: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
      hosts: { gpu1: { dest: "bryan@gpu1", orch_dir: "/srv/orch", timeout_ms: 30 } },
    });

    expect(fileSettingsManager(directory).current()).toMatchObject({
      notify: [{ id: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
      hosts: { gpu1: { dest: "bryan@gpu1", orch_dir: "/srv/orch", timeout_ms: 30 } },
    });
  });

  test("reports a helpful validation error for invalid settings", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { daemon: { tcp_port: "many" } });

    expect(() => fileSettingsManager(directory).current()).toThrow(/daemon\.tcp_port/);
  });
});
