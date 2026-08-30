import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { loadConfig, resolveSetting } from "../src/config.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const directories: string[] = [];
const envName = "ORCH_DAEMON_PORT";
const originalEnv = process.env[envName];

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-config-precedence-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  while (directories.length) removeTempDir(directories.pop()!);
  if (originalEnv === undefined) delete process.env[envName];
  else process.env[envName] = originalEnv;
});

describe("config precedence", () => {
  test("returns a defaults value when no override is set", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { daemon: { tcp_port: 4321 } });
    delete process.env[envName];

    const config = loadConfig(directory);
    expect(resolveSetting({ env: envName, config: config.daemon.tcp_port, fallback: 3716 })).toBe(4321);
  });

  test("applies defaults when config, env, and flag are absent", () => {
    delete process.env[envName];
    const directory = tempDir();
    writeSettingsFixture(directory);
    const config = loadConfig(directory);

    expect(resolveSetting({ env: envName, config: config.daemon.tcp_port, fallback: 3716 })).toBe(3716);
  });

  test("uses env over config and flag over env", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { daemon: { tcp_port: 4321 } });
    process.env[envName] = "7";
    const config = loadConfig(directory);

    expect(resolveSetting({ env: envName, config: config.daemon.tcp_port, fallback: 3716 })).toBe(7);
    expect(resolveSetting({ flag: 9, env: envName, config: config.daemon.tcp_port, fallback: 3716 })).toBe(9);
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
    writeSettingsFixture(directory, { daemon: { tcp_port: "many" } });

    expect(() => loadConfig(directory)).toThrow(/daemon\.tcp_port/);
  });
});
