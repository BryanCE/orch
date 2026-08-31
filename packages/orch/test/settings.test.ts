import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { SETTINGS_SCHEMA } from "../src/settings/schema.ts";
import { allowedModelPatterns, declaredRuntime, loadSettings, loadSettingsOrNull, reapUnreadableSettings, resolveSetting, resolveWithSource } from "../src/settings/read.ts";
import { writeSettingsAllowedModels, writeSettingsDefault, writeSettingsFullTree, writeSettingsEnabled, writeSettingsPreferredModels, writeSettingsRuntime } from "../src/settings/write.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { isRecord } from "../src/util.ts";

const directories: string[] = [];
const originalConfigTest = process.env.ORCH_CONFIG_TEST;
const originalConfigPrecedence = process.env.ORCH_CONFIG_PRECEDENCE;

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-settings-"));
  directories.push(directory);
  return directory;
}

function readSettingsRecord(directory: string): Record<string, unknown> {
  const value: unknown = JSON.parse(fs.readFileSync(path.join(directory, "settings.json"), "utf8"));
  if (!isRecord(value)) throw new Error("settings.json is not an object");
  return value;
}

afterEach(() => {
  while (directories.length) removeTempDir(directories.pop()!);
  if (originalConfigTest === undefined) delete process.env.ORCH_CONFIG_TEST;
  else process.env.ORCH_CONFIG_TEST = originalConfigTest;
  if (originalConfigPrecedence === undefined) delete process.env.ORCH_CONFIG_PRECEDENCE;
  else process.env.ORCH_CONFIG_PRECEDENCE = originalConfigPrecedence;
});

describe("loadSettings", () => {
  test("refuses to invent settings when settings.json is missing", () => {
    const directory = tempDir();

    expect(() => loadSettings(directory)).toThrow(/does not exist/);
    expect(() => loadSettings(directory)).toThrow(/orch setup/);
    // The non-throwing probe is how the first-run gate tells "not set up yet" from "broken".
    expect(loadSettingsOrNull(directory)).toBeNull();
  });

  test("requires a top-level runtime and never defaults it", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "settings.json"), JSON.stringify({ schemaVersion: SETTINGS_SCHEMA }));

    expect(() => loadSettings(directory)).toThrow(/no top-level "runtime" key/);
    expect(() => loadSettings(directory)).toThrow(/node, deno, bun/);
    expect(() => loadSettings(directory)).toThrow(/orch setup/);
  });

  test("rejects an unrecognized runtime naming the accepted values", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "settings.json"), JSON.stringify({ schemaVersion: SETTINGS_SCHEMA, runtime: "quickjs" }));

    expect(() => loadSettings(directory)).toThrow(/"quickjs"/);
    expect(() => loadSettings(directory)).toThrow(/node, deno, bun/);
  });

  test("rejects a runtime misplaced under defaults", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { defaults: { runtime: "node" } });

    expect(() => loadSettings(directory)).toThrow(/Unrecognized key.*runtime/);
  });

  test("reads the declared runtime", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { runtime: "deno" });

    expect(loadSettings(directory).runtime).toBe("deno");
    expect(declaredRuntime(directory)).toBe("deno");
  });

  test("parses every supported settings section", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      enabled: { adapters: ["pi", "claude"], backends: ["headless"] },
      defaults: { adapter: "claude", backend: "headless", models: { claude: "sonnet" }, worktree: true },
      fleet: { max_agents_total: 12, max_agents_per_space: { wD: 4 }, worker_peer_tools: true, cross_space: true, max_depth: 2 },
      models: { allowed: { claude: ["sonnet", "opus"] }, preferred: { claude: ["sonnet"] } },
      workers: { inherit_extensions: true, exclude_extensions: [], builtin_tools: true, allow_tools: [] },
      queue: { max_retries: 3 },
      retention: { queue_days: 1, events_days: 2, runs_days: 3, outbox_days: 4, ended_agents_days: 6, logs_days: 7 },
      timeouts: { dispatch_ack_ms: 11, wait_ms: 22, adapter_command_ms: 33, notify_ms: 44 },
      notify: [{ id: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
      hosts: { gpu1: { dest: "bryan@gpu1" } },
      spaces: { wD: "Design" },
      daemon: { tcp_port: 4321 },
      doctor: { unclaimed_after_ms: 123_456 },
      tiling: { first_split: "columns" },
      logging: { level: "debug" },
    });

    expect(loadSettings(directory)).toEqual({
      runtime: "node",
      enabled: { adapters: ["pi", "claude"], backends: ["headless"] },
      defaults: {
        adapter: "claude",
        backend: "headless",
        models: { claude: "sonnet" },
        thinking: "medium",
        thinking_by_harness: {},
        worktree: true,
      },
      fleet: { max_agents_total: 12, max_agents_per_pack: 10, max_depth: 2, max_agents_per_space: { wD: 4 }, worker_peer_tools: true, cross_space: true },
      models: { allowed: { claude: ["sonnet", "opus"] }, preferred: { claude: ["sonnet"] } },
      workers: { inherit_extensions: true, exclude_extensions: [], builtin_tools: true, allow_tools: [] },
      queue: { max_retries: 3 },
      retention: { queue_days: 1, events_days: 2, runs_days: 3, outbox_days: 4, ended_agents_days: 6, logs_days: 7 },
      timeouts: { dispatch_ack_ms: 11, wait_ms: 22, adapter_command_ms: 33, notify_ms: 44 },
      notify: [{ id: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
      locked_commands: [],
      hosts: { gpu1: { dest: "bryan@gpu1" } },
      spaces: { wD: "Design" },
      daemon: { tcp_port: 4321, idle_shutdown_minutes: 30 },
      doctor: { unclaimed_after_ms: 123_456 },
      tiling: { first_split: "columns" },
      logging: { level: "debug" },
      skills: { install: true, roots: ["~/.claude/skills", "~/.agents/skills"] },
    });
  });

  test("rejects a file without the current schemaVersion", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "settings.json"), JSON.stringify({ schemaVersion: 999 }));

    expect(() => loadSettings(directory)).toThrow("schemaVersion");
    expect(() => loadSettings(directory)).toThrow(/orch setup/);
  });

  test("rejects invalid JSON loudly", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "settings.json"), "{ not json");

    expect(() => loadSettings(directory)).toThrow("expected valid JSON");
  });

  test("names the key path for invalid fields", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { queue: { max_retries: "once" } });

    expect(() => loadSettings(directory)).toThrow(/queue\.max_retries/);
  });

  test("rejects unknown settings keys", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { junk: true });

    expect(() => loadSettings(directory)).toThrow(/Unrecognized key.*junk/);
  });

  test("rejects removed spawn cap setting by name", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { fleet: { ["spawn_" + "cap"]: 4 } });

    expect(() => loadSettings(directory)).toThrow(new RegExp("Unrecognized key.*spawn_" + "cap"));
  });

  test("parses models.allowed as a per-harness pattern map", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { models: { allowed: { pi: ["openrouter/a", "openrouter/b"] } } });

    expect(loadSettings(directory).models.allowed.pi).toEqual(["openrouter/a", "openrouter/b"]);
  });

  test("rejects renamed fleet keys and loads their replacements", () => {
    const oldKeys = ["pack" + "_cap", "max" + "_agents", "space" + "_caps"];
    for (const key of oldKeys) {
      const directory = tempDir();
      writeSettingsFixture(directory, { fleet: { [key]: key === oldKeys[2] ? { main: 2 } : 2 } });
      expect(() => loadSettings(directory)).toThrow(/Unrecognized key/);
      expect(() => loadSettings(directory)).toThrow(new RegExp(key));
    }
    const directory = tempDir();
    writeSettingsFixture(directory, { fleet: { max_agents_per_pack: 2, max_agents_total: 4, max_agents_per_space: { main: 2 } } });
    expect(loadSettings(directory).fleet).toMatchObject({ max_agents_per_pack: 2, max_agents_total: 4, max_agents_per_space: { main: 2 } });
  });

  test("rejects old settings keys", () => {
    for (const settings of [
      { limits: {} },
      { defaults: { max_depth: 4 } },
      { defaults: { allowed_models: ["openrouter/a"] } },
      { defaults: { worker_peer_tools: true } },
    ]) {
      const directory = tempDir();
      writeSettingsFixture(directory, settings);
      expect(() => loadSettings(directory)).toThrow(/Unrecognized key/);
    }
  });

  test("rejects legacy notify type and unknown ids", () => {
    for (const entry of [{ type: "webhook", url: "https://example.test" }, { id: "email" }]) {
      const directory = tempDir();
      writeSettingsFixture(directory, { notify: [entry] });
      expect(() => loadSettings(directory)).toThrow(/notify/);
    }
  });

  test("applies every settings default when sections are absent", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "settings.json"), JSON.stringify({ schemaVersion: SETTINGS_SCHEMA, runtime: "node" }));

    expect(loadSettings(directory)).toEqual({
      runtime: "node",
      enabled: { adapters: [], backends: [] },
      defaults: { models: {}, thinking: "medium", thinking_by_harness: {}, worktree: false },
      fleet: { max_agents_total: undefined, max_agents_per_pack: 10, max_depth: 1, max_agents_per_space: {}, worker_peer_tools: false, cross_space: false },
      models: { allowed: {}, preferred: {} },
      workers: { inherit_extensions: true, exclude_extensions: [], builtin_tools: true, allow_tools: [] },
      queue: { max_retries: 1 },
      retention: { queue_days: 14, events_days: 7, runs_days: 30, outbox_days: 7, ended_agents_days: 90, logs_days: 7 },
      timeouts: { dispatch_ack_ms: 10_000, wait_ms: 300_000, adapter_command_ms: 60_000, notify_ms: 3_000 },
      notify: [],
      locked_commands: [],
      hosts: {},
      spaces: {},
      daemon: { tcp_port: 3716, idle_shutdown_minutes: 30 },
      doctor: { unclaimed_after_ms: 120_000 },
      tiling: { first_split: "rows" },
      logging: { level: "info" },
      skills: { install: true, roots: ["~/.claude/skills", "~/.agents/skills"] },
    });
  });

  test("preserves configured values while defaulting each missing section value", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      defaults: { worktree: true },
      fleet: { max_depth: 3 },
      workers: { allow_tools: ["read"] },
      retention: { logs_days: 2 },
      timeouts: { wait_ms: 1234 },
      daemon: { idle_shutdown_minutes: 0 },
      doctor: { unclaimed_after_ms: 120_000 },
      tiling: { first_split: "columns" },
      skills: { install: false },
    });

    expect(loadSettings(directory)).toMatchObject({
      defaults: { models: {}, worktree: true },
      fleet: { max_depth: 3, max_agents_per_pack: 10, max_agents_per_space: {}, worker_peer_tools: false, cross_space: false },
      workers: { inherit_extensions: true, exclude_extensions: [], builtin_tools: true, allow_tools: ["read"] },
      retention: { logs_days: 2, queue_days: 14, events_days: 7, runs_days: 30, outbox_days: 7, ended_agents_days: 90 },
      timeouts: { dispatch_ack_ms: 10_000, wait_ms: 1234, adapter_command_ms: 60_000, notify_ms: 3_000 },
      daemon: { tcp_port: 3716, idle_shutdown_minutes: 0 },
      tiling: { first_split: "columns" },
      skills: { install: false, roots: ["~/.claude/skills", "~/.agents/skills"] },
    });
  });

  test("rejects non-positive and non-integer retention windows", () => {
    for (const [key, value] of [["queue_days", 0], ["events_days", 1.5]] as const) {
      const directory = tempDir();
      writeSettingsFixture(directory, { retention: { [key]: value } });
      expect(() => loadSettings(directory)).toThrow(new RegExp(`retention\\.${key}`));
    }
  });

  test("rejects a host without dest", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { hosts: { gpu1: { timeout_ms: 5000 } } });

    expect(() => loadSettings(directory)).toThrow(/dest/);
  });

  test("rejects an unknown id in enabled.adapters", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["nonexistent"], backends: [] } });

    expect(() => loadSettings(directory)).toThrow(/unknown adapter "nonexistent".*supported adapters:/i);
  });

  test("rejects defaults.adapter not present in enabled.adapters", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: [] }, defaults: { adapter: "claude" } });

    expect(() => loadSettings(directory)).toThrow(/defaults\.adapter.*"claude".*enabled: pi/);
  });

  test("rejects when settings.json is absent but a legacy config.toml exists", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "config.toml"), "[defaults]\nadapter = \"pi\"\n");

    expect(() => loadSettings(directory)).toThrow(/settings\.json/);
    expect(() => loadSettings(directory)).toThrow(/orch setup/);
  });
});

describe("allowedModelPatterns", () => {
  test("restricts nothing when settings contain no patterns", () => {
    // Orch ships no built-in allowlist: a hardcoded default silently pinned every
    // spawn to the one family it happened to list.
    expect(allowedModelPatterns(tempDir(), "pi")).toEqual([]);
  });

  test("returns the configured patterns when set", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { models: { allowed: { pi: ["openrouter/x"] } } });

    expect(allowedModelPatterns(directory, "pi")).toEqual(["openrouter/x"]);
    expect(allowedModelPatterns(directory, "claude")).toEqual([]);
  });
});

describe("writeSettingsRuntime", () => {
  test("records the runtime as a top-level scalar with no defaults or enabled entry", () => {
    const directory = tempDir();
    writeSettingsRuntime(directory, "node");

    const raw = readSettingsRecord(directory);
    expect(raw.runtime).toBe("node");
    expect(isRecord(raw.defaults) ? raw.defaults.runtime : undefined).toBeUndefined();
    expect(isRecord(raw.enabled) ? raw.enabled.runtimes : undefined).toBeUndefined();
    expect(loadSettings(directory).runtime).toBe("node");
  });

  test("re-recording the same runtime leaves the file unchanged", () => {
    const directory = tempDir();
    writeSettingsRuntime(directory, "node");
    const first = fs.readFileSync(path.join(directory, "settings.json"), "utf8");
    writeSettingsRuntime(directory, "node");

    expect(fs.readFileSync(path.join(directory, "settings.json"), "utf8")).toBe(first);
  });

  test("a different runtime replaces the single value in place", () => {
    const directory = tempDir();
    writeSettingsRuntime(directory, "node");
    writeSettingsRuntime(directory, "bun");

    const raw = readSettingsRecord(directory);
    expect(raw.runtime).toBe("bun");
    expect(Object.keys(raw).filter((key) => key === "runtime")).toHaveLength(1);
  });
});

describe("reapUnreadableSettings", () => {
  test("moves an out-of-schema file aside so setup can re-record", () => {
    const directory = tempDir();
    const file = path.join(directory, "settings.json");
    fs.writeFileSync(file, JSON.stringify({ schemaVersion: 999 }));

    const backup = reapUnreadableSettings(directory);

    expect(backup).toBe(`${file}.invalid`);
    expect(fs.existsSync(file)).toBe(false);
    writeSettingsRuntime(directory, "node");
    expect(loadSettings(directory).runtime).toBe("node");
  });

  test("leaves a readable file alone", () => {
    const directory = tempDir();
    writeSettingsFixture(directory);

    expect(reapUnreadableSettings(directory)).toBeNull();
  });
});

describe("writeSettingsEnabled", () => {
  test("round-trips both provider arrays", () => {
    const directory = tempDir();
    writeSettingsRuntime(directory, "node");
    writeSettingsEnabled(directory, { adapters: ["pi", "claude"], backends: ["herdr", "headless"] });

    expect(loadSettings(directory).enabled).toEqual({ adapters: ["pi", "claude"], backends: ["herdr", "headless"] });
  });
});

describe("writeSettingsDefault", () => {
  test("creates settings.json with the schemaVersion stamp and records entries", () => {
    const directory = tempDir();
    writeSettingsRuntime(directory, "node");
    writeSettingsEnabled(directory, { adapters: ["pi"], backends: ["herdr"] });
    writeSettingsDefault(directory, "adapter", "pi");
    writeSettingsDefault(directory, "backend", "herdr");

    const raw = readSettingsRecord(directory);
    expect(raw.schemaVersion).toBe(SETTINGS_SCHEMA);
    const settings = loadSettings(directory);
    expect(settings.defaults.adapter).toBe("pi");
    expect(settings.defaults.backend).toBe("herdr");
  });

  test("replaces an existing entry without disturbing other sections", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["claude", "pi"], backends: [] }, defaults: { adapter: "claude", models: { claude: "sonnet" } }, queue: { max_retries: 3 } });
    writeSettingsDefault(directory, "adapter", "pi");

    const settings = loadSettings(directory);
    expect(settings.defaults.adapter).toBe("pi");
    expect(settings.defaults.models.claude).toBe("sonnet");
    expect(settings.queue.max_retries).toBe(3);
  });

  test("is idempotent when rewriting the same value", () => {
    const directory = tempDir();
    writeSettingsRuntime(directory, "node");
    writeSettingsEnabled(directory, { adapters: ["pi"], backends: [] });
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

  test("switches defaults.adapter between two enabled ids and loads clean", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["claude", "pi"], backends: [] }, defaults: { adapter: "claude" } });
    writeSettingsDefault(directory, "adapter", "pi");

    expect(loadSettings(directory).defaults.adapter).toBe("pi");
  });
});

describe("writeSettingsFullTree", () => {
  test("round-trips defaults without inventing max_agents_total", () => {
    const directory = tempDir();
    writeSettingsRuntime(directory, "node");
    writeSettingsFullTree(directory);

    const raw = readSettingsRecord(directory);
    expect(raw.fleet).toEqual({ max_agents_per_pack: 10, max_depth: 1, max_agents_per_space: {}, worker_peer_tools: false, cross_space: false });
    expect(Object.hasOwn(isRecord(raw.fleet) ? raw.fleet : {}, "max_agents_total")).toBe(false);
    expect(loadSettings(directory).fleet.max_agents_total).toBeUndefined();
  });
});

describe("settings precedence", () => {
  test("uses the fallback when env and settings.json omit a setting", () => {
    delete process.env.ORCH_CONFIG_PRECEDENCE;
    const directory = tempDir();
    writeSettingsFixture(directory);
    const settings = loadSettings(directory);

    expect(resolveSetting<number>({ env: "ORCH_CONFIG_PRECEDENCE", settings: settings.fleet.max_agents_total, fallback: 2 })).toBe(2);
  });

  test("uses the settings.json value over the fallback", () => {
    delete process.env.ORCH_CONFIG_PRECEDENCE;
    const directory = tempDir();
    writeSettingsFixture(directory, { fleet: { max_depth: 4 } });
    const settings = loadSettings(directory);

    expect(resolveSetting<number>({ env: "ORCH_CONFIG_PRECEDENCE", settings: settings.fleet.max_depth, fallback: 2 })).toBe(4);
  });

  test("uses the ORCH_* environment value over settings.json", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { fleet: { max_depth: 4 } });
    process.env.ORCH_CONFIG_PRECEDENCE = "7";
    const settings = loadSettings(directory);

    expect(resolveSetting<number>({ env: "ORCH_CONFIG_PRECEDENCE", settings: settings.fleet.max_depth, fallback: 2 })).toBe(7);
  });

  test("uses an explicit flag override over the environment", () => {
    process.env.ORCH_CONFIG_PRECEDENCE = "7";

    expect(resolveSetting({ flag: 9, env: "ORCH_CONFIG_PRECEDENCE", settings: 4, fallback: 2 })).toBe(9);
  });
});

describe("resolveSetting", () => {
  test("uses flag, environment coercion, settings, then fallback in precedence order", () => {
    process.env.ORCH_CONFIG_TEST = "7";
    expect(resolveSetting({ flag: 9, env: "ORCH_CONFIG_TEST", settings: 3, fallback: 1 })).toBe(9);
    expect(resolveSetting({ env: "ORCH_CONFIG_TEST", settings: 3, fallback: 1 })).toBe(7);

    process.env.ORCH_CONFIG_TEST = "false";
    expect(resolveSetting({ env: "ORCH_CONFIG_TEST", settings: true, fallback: true })).toBe(false);

    delete process.env.ORCH_CONFIG_TEST;
    expect(resolveSetting({ env: "ORCH_CONFIG_TEST", settings: 3, fallback: 1 })).toBe(3);
    expect(resolveSetting({ env: "ORCH_CONFIG_TEST", fallback: "pi" })).toBe("pi");
  });
});

describe("resolveWithSource", () => {
  test("rejects an environment value with the wrong shape", () => {
    process.env.ORCH_CONFIG_TEST = "not-an-object";
    expect(() => resolveWithSource({ env: "ORCH_CONFIG_TEST", fallback: { enabled: true } })).toThrow(/expected object/);
  });

  test("reports the winning source at each precedence level", () => {
    process.env.ORCH_CONFIG_TEST = "7";
    expect(resolveWithSource({ flag: 9, env: "ORCH_CONFIG_TEST", settings: 3, fallback: 1 })).toEqual({ value: 9, source: "flag" });
    expect(resolveWithSource({ env: "ORCH_CONFIG_TEST", settings: 3, fallback: 1 })).toEqual({ value: 7, source: "env" });

    delete process.env.ORCH_CONFIG_TEST;
    expect(resolveWithSource({ env: "ORCH_CONFIG_TEST", settings: 3, fallback: 1 })).toEqual({ value: 3, source: "settings.json" });
    expect(resolveWithSource({ env: "ORCH_CONFIG_TEST", fallback: 1 })).toEqual({ value: 1, source: "default" });
  });
});

// models.preferred is the quicklist a harness's own picker cycles; models.allowed is the launch
// gate. They are stored, written, and read independently — merging them is what let a
// convenience list silently forbid every model an operator had not put in the picker.
describe("models.preferred and models.allowed are independent", () => {
  test("loadSettings parses a per-harness preferred quicklist", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { models: { preferred: { pi: ["openrouter/a", "openrouter/b"] } } });

    expect(loadSettings(directory).models.preferred.pi).toEqual(["openrouter/a", "openrouter/b"]);
  });

  test("an absent preferred map normalizes to an empty map, not to allowed", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { models: { allowed: { pi: ["openrouter/a"] } } });

    const settings = loadSettings(directory);
    expect(settings.models.preferred).toEqual({});
    expect(settings.models.allowed.pi).toEqual(["openrouter/a"]);
  });

  test("writing one list leaves the other byte-for-value intact", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi", "claude"], backends: [] } });

    writeSettingsAllowedModels(directory, { pi: ["openrouter/a"] });
    writeSettingsPreferredModels(directory, { pi: ["openrouter/b", "openrouter/c"] });
    expect(loadSettings(directory).models.allowed.pi).toEqual(["openrouter/a"]);
    expect(loadSettings(directory).models.preferred.pi).toEqual(["openrouter/b", "openrouter/c"]);

    writeSettingsAllowedModels(directory, { pi: ["openrouter/a", "openrouter/z"] });
    expect(loadSettings(directory).models.preferred.pi).toEqual(["openrouter/b", "openrouter/c"]);

    writeSettingsPreferredModels(directory, { claude: ["sonnet"] });
    expect(loadSettings(directory).models.allowed.pi).toEqual(["openrouter/a", "openrouter/z"]);
  });

  test("an empty list is recorded as no list at all, so a cleared picker really clears", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: [] } });

    writeSettingsPreferredModels(directory, { pi: ["openrouter/a"] });
    writeSettingsPreferredModels(directory, { pi: [] });
    expect(loadSettings(directory).models.preferred).toEqual({});
  });

  test("the full tree seeds both maps when absent and preserves both when present", () => {
    const seeded = tempDir();
    writeSettingsFixture(seeded, { enabled: { adapters: ["pi"], backends: [] } });
    writeSettingsFullTree(seeded);
    expect(loadSettings(seeded).models).toEqual({ allowed: {}, preferred: {} });

    const filled = tempDir();
    writeSettingsFixture(filled, {
      enabled: { adapters: ["pi"], backends: [] },
      models: { allowed: { pi: ["openrouter/a"] }, preferred: { pi: ["openrouter/b"] } },
    });
    writeSettingsFullTree(filled);
    expect(loadSettings(filled).models).toEqual({ allowed: { pi: ["openrouter/a"] }, preferred: { pi: ["openrouter/b"] } });
  });

  test("the allowlist gate reads models.allowed only", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { models: { preferred: { pi: ["openrouter/b"] } } });

    // A preferred quicklist restricts nothing: with no allowed patterns every offered model passes.
    expect(allowedModelPatterns(directory, "pi")).toEqual([]);
  });
});
