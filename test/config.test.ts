import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { loadConfig, resolveSetting } from "../src/config.ts";

const directories: string[] = [];
const originalConfigTest = process.env.ORCH_CONFIG_TEST;
const originalConfigPrecedence = process.env.ORCH_CONFIG_PRECEDENCE;

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-config-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  while (directories.length) fs.rmSync(directories.pop()!, { recursive: true, force: true });
  if (originalConfigTest === undefined) delete process.env.ORCH_CONFIG_TEST;
  else process.env.ORCH_CONFIG_TEST = originalConfigTest;
  if (originalConfigPrecedence === undefined) delete process.env.ORCH_CONFIG_PRECEDENCE;
  else process.env.ORCH_CONFIG_PRECEDENCE = originalConfigPrecedence;
});

describe("loadConfig", () => {
  test("uses defaults when config.toml is missing", () => {
    expect(loadConfig(tempDir())).toEqual({
      defaults: {},
      queue: { max_retries: 1 },
      notify: [],
      hosts: {},
      workspaces: {},
    });
  });

  test("parses every supported config section", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "config.toml"), `
[defaults]
adapter = "claude"
backend = "headless"
model = "sonnet"
spawn_cap = 4
worktree = true

[queue]
max_retries = 3

[[notify]]
type = "webhook"
on = ["done", "error"]
url = "https://example.test/orch"

[hosts.gpu1]
ssh = "bryan@gpu1"

[workspaces]
wD = "Design"
`);

    expect(loadConfig(directory)).toEqual({
      defaults: {
        adapter: "claude",
        backend: "headless",
        model: "sonnet",
        spawn_cap: 4,
        worktree: true,
      },
      queue: { max_retries: 3 },
      notify: [{ type: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
      hosts: { gpu1: { ssh: "bryan@gpu1" } },
      workspaces: { wD: "Design" },
    });
  });

  test("names the file, key, expected, and found type for invalid fields", () => {
    const directory = tempDir();
    const file = path.join(directory, "config.toml");
    fs.writeFileSync(file, "[queue]\nmax_retries = \"once\"\n");

    expect(() => loadConfig(directory)).toThrow(`${file}: queue.max_retries: expected number, found string`);
  });
});

describe("config precedence", () => {
  test("uses the fallback when env and config.toml omit a setting", () => {
    delete process.env.ORCH_CONFIG_PRECEDENCE;
    const config = loadConfig(tempDir());

    expect(resolveSetting<number>({ env: "ORCH_CONFIG_PRECEDENCE", config: config.defaults.spawn_cap, fallback: 2 })).toBe(2);
  });

  test("uses the config.toml value over the fallback", () => {
    delete process.env.ORCH_CONFIG_PRECEDENCE;
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "config.toml"), "[defaults]\nspawn_cap = 4\n");
    const config = loadConfig(directory);

    expect(resolveSetting<number>({ env: "ORCH_CONFIG_PRECEDENCE", config: config.defaults.spawn_cap, fallback: 2 })).toBe(4);
  });

  test("uses the ORCH_* environment value over config.toml", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "config.toml"), "[defaults]\nspawn_cap = 4\n");
    process.env.ORCH_CONFIG_PRECEDENCE = "7";
    const config = loadConfig(directory);

    expect(resolveSetting<number>({ env: "ORCH_CONFIG_PRECEDENCE", config: config.defaults.spawn_cap, fallback: 2 })).toBe(7);
  });

  test("uses an explicit flag override over the environment", () => {
    process.env.ORCH_CONFIG_PRECEDENCE = "7";

    expect(resolveSetting({ flag: 9, env: "ORCH_CONFIG_PRECEDENCE", config: 4, fallback: 2 })).toBe(9);
  });
});

describe("resolveSetting", () => {
  test("uses flag, environment coercion, config, then fallback in precedence order", () => {
    process.env.ORCH_CONFIG_TEST = "7";
    expect(resolveSetting({ flag: 9, env: "ORCH_CONFIG_TEST", config: 3, fallback: 1 })).toBe(9);
    expect(resolveSetting({ env: "ORCH_CONFIG_TEST", config: 3, fallback: 1 })).toBe(7);

    process.env.ORCH_CONFIG_TEST = "false";
    expect(resolveSetting({ env: "ORCH_CONFIG_TEST", config: true, fallback: true })).toBe(false);

    delete process.env.ORCH_CONFIG_TEST;
    expect(resolveSetting({ env: "ORCH_CONFIG_TEST", config: 3, fallback: 1 })).toBe(3);
    expect(resolveSetting({ env: "ORCH_CONFIG_TEST", fallback: "pi" })).toBe("pi");
  });
});
