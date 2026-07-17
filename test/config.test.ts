import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { DEFAULT_ALLOWED_MODELS, SETTINGS_SCHEMA, allowedModelPatterns, loadConfig, resolveSetting, resolveWithSource, writeSettingsDefault, writeSettingsInstalled } from "../src/config.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

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
  test("uses defaults when settings.json is missing", () => {
    expect(loadConfig(tempDir())).toEqual({
      installed: { adapters: [], backends: [] },
      defaults: {},
      queue: { max_retries: 1 },
      notify: [],
      locked_commands: [],
      hosts: {},
      workspaces: {},
      limits: {},
    });
  });

  test("parses every supported settings section", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      installed: { adapters: ["pi", "claude"], backends: ["headless"] },
      defaults: { adapter: "claude", backend: "headless", model: "sonnet", spawn_cap: 4, worktree: true },
      queue: { max_retries: 3 },
      notify: [{ id: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
      hosts: { gpu1: { dest: "bryan@gpu1" } },
      workspaces: { wD: "Design" },
    });

    expect(loadConfig(directory)).toEqual({
      installed: { adapters: ["pi", "claude"], backends: ["headless"] },
      defaults: {
        adapter: "claude",
        backend: "headless",
        model: "sonnet",
        spawn_cap: 4,
        worktree: true,
      },
      queue: { max_retries: 3 },
      notify: [{ id: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
      locked_commands: [],
      hosts: { gpu1: { dest: "bryan@gpu1" } },
      workspaces: { wD: "Design" },
      limits: {},
    });
  });

  test("rejects a file without the current schemaVersion", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "settings.json"), JSON.stringify({ schemaVersion: 999 }));

    expect(() => loadConfig(directory)).toThrow("schemaVersion");
    expect(() => loadConfig(directory)).toThrow(/orch setup/);
  });

  test("rejects invalid JSON loudly", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "settings.json"), "{ not json");

    expect(() => loadConfig(directory)).toThrow("expected valid JSON");
  });

  test("names the key path for invalid fields", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { queue: { max_retries: "once" } });

    expect(() => loadConfig(directory)).toThrow(/queue\.max_retries/);
  });

  test("rejects unknown settings keys", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { junk: true });

    expect(() => loadConfig(directory)).toThrow(/Unrecognized key.*junk/);
  });

  test("parses defaults.allowed_models as a string array", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { defaults: { allowed_models: ["openrouter/a", "openrouter/b"] } });

    expect(loadConfig(directory).defaults.allowed_models).toEqual(["openrouter/a", "openrouter/b"]);
  });

  test("rejects a non-string entry in defaults.allowed_models", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { defaults: { allowed_models: [1] } });

    expect(() => loadConfig(directory)).toThrow(/allowed_models/);
  });

  test("validates defaults.worker_peer_tools as a boolean", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { defaults: { worker_peer_tools: "yes" } });

    expect(() => loadConfig(directory)).toThrow(/worker_peer_tools/);
  });

  test("accepts true and false for defaults.worker_peer_tools", () => {
    for (const value of [true, false]) {
      const directory = tempDir();
      writeSettingsFixture(directory, { defaults: { worker_peer_tools: value } });

      expect(loadConfig(directory).defaults.worker_peer_tools).toBe(value);
    }
  });

  test("leaves defaults.worker_peer_tools absent when unset", () => {
    expect(loadConfig(tempDir()).defaults.worker_peer_tools).toBeUndefined();
  });

  test("rejects a host without dest", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { hosts: { gpu1: { timeout_ms: 5000 } } });

    expect(() => loadConfig(directory)).toThrow(/dest/);
  });

  test("rejects an unknown id in installed.adapters", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { installed: { adapters: ["nonexistent"], backends: [] } });

    expect(() => loadConfig(directory)).toThrow(/unknown adapter "nonexistent".*supported adapters:/i);
  });

  test("rejects defaults.adapter not present in installed.adapters", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { installed: { adapters: ["pi"], backends: [] }, defaults: { adapter: "claude" } });

    expect(() => loadConfig(directory)).toThrow(/defaults\.adapter.*"claude".*installed: pi/);
  });

  test("rejects when settings.json is absent but a legacy config.toml exists", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "config.toml"), "[defaults]\nadapter = \"pi\"\n");

    expect(() => loadConfig(directory)).toThrow(/settings\.json/);
    expect(() => loadConfig(directory)).toThrow(/orch setup/);
  });
});

describe("allowedModelPatterns", () => {
  test("returns the built-in defaults when config is absent", () => {
    expect(allowedModelPatterns(tempDir())).toEqual(DEFAULT_ALLOWED_MODELS);
  });

  test("returns the configured patterns when set", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { defaults: { allowed_models: ["openrouter/x"] } });

    expect(allowedModelPatterns(directory)).toEqual(["openrouter/x"]);
  });
});

describe("writeSettingsInstalled", () => {
  test("round-trips both provider arrays", () => {
    const directory = tempDir();
    writeSettingsInstalled(directory, { adapters: ["pi", "claude"], backends: ["herdr", "headless"] });

    expect(loadConfig(directory).installed).toEqual({ adapters: ["pi", "claude"], backends: ["herdr", "headless"] });
  });
});

describe("writeSettingsDefault", () => {
  test("creates settings.json with the schemaVersion stamp and records entries", () => {
    const directory = tempDir();
    writeSettingsInstalled(directory, { adapters: ["pi"], backends: ["herdr"] });
    writeSettingsDefault(directory, "adapter", "pi");
    writeSettingsDefault(directory, "backend", "herdr");

    const raw = JSON.parse(fs.readFileSync(path.join(directory, "settings.json"), "utf8")) as Record<string, unknown>;
    expect(raw.schemaVersion).toBe(SETTINGS_SCHEMA);
    const config = loadConfig(directory);
    expect(config.defaults.adapter).toBe("pi");
    expect(config.defaults.backend).toBe("herdr");
  });

  test("replaces an existing entry without disturbing other sections", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { installed: { adapters: ["claude", "pi"], backends: [] }, defaults: { adapter: "claude", model: "sonnet" }, queue: { max_retries: 3 } });
    writeSettingsDefault(directory, "adapter", "pi");

    const config = loadConfig(directory);
    expect(config.defaults.adapter).toBe("pi");
    expect(config.defaults.model).toBe("sonnet");
    expect(config.queue.max_retries).toBe(3);
  });

  test("is idempotent when rewriting the same value", () => {
    const directory = tempDir();
    writeSettingsInstalled(directory, { adapters: ["pi"], backends: [] });
    writeSettingsDefault(directory, "adapter", "pi");
    const first = fs.readFileSync(path.join(directory, "settings.json"), "utf8");
    writeSettingsDefault(directory, "adapter", "pi");
    const second = fs.readFileSync(path.join(directory, "settings.json"), "utf8");

    expect(second).toBe(first);
  });

  test("refuses to write through an out-of-version settings file", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "settings.json"), JSON.stringify({ schemaVersion: 999 }));

    expect(() => writeSettingsDefault(directory, "adapter", "pi")).toThrow("schemaVersion");
  });

  test("switches defaults.adapter between two installed ids and loads clean", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { installed: { adapters: ["claude", "pi"], backends: [] }, defaults: { adapter: "claude" } });
    writeSettingsDefault(directory, "adapter", "pi");

    expect(loadConfig(directory).defaults.adapter).toBe("pi");
  });
});

describe("config precedence", () => {
  test("uses the fallback when env and settings.json omit a setting", () => {
    delete process.env.ORCH_CONFIG_PRECEDENCE;
    const config = loadConfig(tempDir());

    expect(resolveSetting<number>({ env: "ORCH_CONFIG_PRECEDENCE", config: config.defaults.spawn_cap, fallback: 2 })).toBe(2);
  });

  test("uses the settings.json value over the fallback", () => {
    delete process.env.ORCH_CONFIG_PRECEDENCE;
    const directory = tempDir();
    writeSettingsFixture(directory, { defaults: { spawn_cap: 4 } });
    const config = loadConfig(directory);

    expect(resolveSetting<number>({ env: "ORCH_CONFIG_PRECEDENCE", config: config.defaults.spawn_cap, fallback: 2 })).toBe(4);
  });

  test("uses the ORCH_* environment value over settings.json", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { defaults: { spawn_cap: 4 } });
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

describe("resolveWithSource", () => {
  test("reports the winning source at each precedence level", () => {
    process.env.ORCH_CONFIG_TEST = "7";
    expect(resolveWithSource({ flag: 9, env: "ORCH_CONFIG_TEST", config: 3, fallback: 1 })).toEqual({ value: 9, source: "flag" });
    expect(resolveWithSource({ env: "ORCH_CONFIG_TEST", config: 3, fallback: 1 })).toEqual({ value: 7, source: "env" });

    delete process.env.ORCH_CONFIG_TEST;
    expect(resolveWithSource({ env: "ORCH_CONFIG_TEST", config: 3, fallback: 1 })).toEqual({ value: 3, source: "settings.json" });
    expect(resolveWithSource({ env: "ORCH_CONFIG_TEST", fallback: 1 })).toEqual({ value: 1, source: "default" });
  });
});
