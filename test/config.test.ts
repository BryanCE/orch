import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { DEFAULT_ALLOWED_MODELS, allowedModelPatterns, loadConfig, resolveSetting, writeDefaultEntry } from "../src/config.ts";

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

  test("parses defaults.allowed_models as a string array", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "config.toml"), "[defaults]\nallowed_models = [\"openrouter/a\", \"openrouter/b\"]\n");

    expect(loadConfig(directory).defaults.allowed_models).toEqual(["openrouter/a", "openrouter/b"]);
  });

  test("rejects a non-string entry in defaults.allowed_models", () => {
    const directory = tempDir();
    const file = path.join(directory, "config.toml");
    fs.writeFileSync(file, "[defaults]\nallowed_models = [1]\n");

    expect(() => loadConfig(directory)).toThrow(`${file}: defaults.allowed_models: expected string array`);
  });

  test("validates defaults.worker_peer_tools as a boolean", () => {
    const directory = tempDir();
    const file = path.join(directory, "config.toml");
    fs.writeFileSync(file, "[defaults]\nworker_peer_tools = \"yes\"\n");

    expect(() => loadConfig(directory)).toThrow(`${file}: defaults.worker_peer_tools: expected boolean, found string`);
  });

  test("accepts true and false for defaults.worker_peer_tools", () => {
    for (const value of [true, false]) {
      const directory = tempDir();
      fs.writeFileSync(path.join(directory, "config.toml"), `[defaults]\nworker_peer_tools = ${value}\n`);

      expect(loadConfig(directory).defaults.worker_peer_tools).toBe(value);
    }
  });

  test("leaves defaults.worker_peer_tools absent when unset", () => {
    expect(loadConfig(tempDir()).defaults.worker_peer_tools).toBeUndefined();
  });
});

describe("allowedModelPatterns", () => {
  test("returns the built-in defaults when config is absent", () => {
    expect(allowedModelPatterns(tempDir())).toEqual(DEFAULT_ALLOWED_MODELS);
  });

  test("returns the configured patterns when set", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "config.toml"), "[defaults]\nallowed_models = [\"openrouter/x\"]\n");

    expect(allowedModelPatterns(directory)).toEqual(["openrouter/x"]);
  });
});

describe("writeDefaultEntry", () => {
  test("creates a [defaults] table and records the entry", () => {
    const directory = tempDir();
    writeDefaultEntry(directory, "adapter", "pi");
    writeDefaultEntry(directory, "backend", "herdr");

    const config = loadConfig(directory);
    expect(config.defaults.adapter).toBe("pi");
    expect(config.defaults.backend).toBe("herdr");
  });

  test("replaces an existing entry without disturbing other sections", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "config.toml"), "[defaults]\nadapter = \"claude\"\nmodel = \"sonnet\"\n\n[queue]\nmax_retries = 3\n");
    writeDefaultEntry(directory, "adapter", "pi");

    const config = loadConfig(directory);
    expect(config.defaults.adapter).toBe("pi");
    expect(config.defaults.model).toBe("sonnet");
    expect(config.queue.max_retries).toBe(3);
  });

  test("is idempotent when rewriting the same value", () => {
    const directory = tempDir();
    writeDefaultEntry(directory, "adapter", "pi");
    const first = fs.readFileSync(path.join(directory, "config.toml"), "utf8");
    writeDefaultEntry(directory, "adapter", "pi");
    const second = fs.readFileSync(path.join(directory, "config.toml"), "utf8");

    expect(second).toBe(first);
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
