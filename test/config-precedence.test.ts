import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { loadConfig, resolveSetting } from "../src/config.ts";

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
  test("returns a [defaults] value when no override is set", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "config.toml"), '[defaults]\nspawn_cap = 4\n');
    delete process.env[envName];

    const config = loadConfig(directory);
    expect(resolveSetting({ env: envName, config: config.defaults.spawn_cap, fallback: 8 })).toBe(4);
  });

  test("applies defaults when config, env, and flag are absent", () => {
    delete process.env[envName];
    const config = loadConfig(tempDir());

    expect(resolveSetting({ env: envName, config: config.defaults.spawn_cap, fallback: 8 })).toBe(8);
  });

  test("uses env over config and flag over env", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "config.toml"), '[defaults]\nspawn_cap = 4\n');
    process.env[envName] = "7";
    const config = loadConfig(directory);

    expect(resolveSetting({ env: envName, config: config.defaults.spawn_cap, fallback: 8 })).toBe(7);
    expect(resolveSetting({ flag: 9, env: envName, config: config.defaults.spawn_cap, fallback: 8 })).toBe(9);
  });

  test("parses notify entries and hosts into expected shapes", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "config.toml"), `
[[notify]]
type = "webhook"
on = ["done", "error"]
url = "https://example.test/orch"

[hosts.gpu1]
dest = "bryan@gpu1"
orch_dir = "/srv/orch"
timeout_ms = 30
`);

    expect(loadConfig(directory)).toMatchObject({
      notify: [{ type: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
      hosts: { gpu1: { dest: "bryan@gpu1", orch_dir: "/srv/orch", timeout_ms: 30 } },
    });
  });

  test("reports a helpful validation error for invalid config", () => {
    const directory = tempDir();
    const file = path.join(directory, "config.toml");
    fs.writeFileSync(file, '[defaults]\nspawn_cap = "many"\n');

    expect(() => loadConfig(directory)).toThrow(`${file}: defaults.spawn_cap: expected number, found string`);
  });
});
