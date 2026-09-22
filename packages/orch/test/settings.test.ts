import type { OrchDir } from "../src/types/core.ts";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { SETTINGS_SCHEMA } from "../src/settings/schema.ts";
import { allowedModelPatterns, declaredRuntime, reapUnreadableSettings, resolveSetting, resolveWithSource } from "../src/settings/read.ts";
import { fileSettingsManager } from "../src/settings/manager.ts";
import { writeSettingsAllowedModels, writeSettingsDefault, writeSettingsFullTree, writeSettingsEnabled, writeSettingsPreferredModels, writeSettingsRuntime } from "../src/settings/write.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { isRecord } from "../src/util.ts";

const directories: OrchDir[] = [];
const originalConfigTest = process.env.ORCH_CONFIG_TEST;
const originalConfigPrecedence = process.env.ORCH_CONFIG_PRECEDENCE;

function tempDir(): OrchDir {
  const directory = tempOrchDir("orch-settings-");
  directories.push(directory);
  return directory;
}

function readSettingsRecord(directory: OrchDir): Record<string, unknown> {
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

    expect(() => fileSettingsManager(directory).current()).toThrow(/does not exist/);
    expect(() => fileSettingsManager(directory).current()).toThrow(/orch setup/);
    // The non-throwing probe is how the first-run gate tells "not set up yet" from "broken".
    expect(fileSettingsManager(directory).currentOrNull()).toBeNull();
  });

  test("requires a top-level runtime and never defaults it", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "settings.json"), JSON.stringify({ schemaVersion: SETTINGS_SCHEMA }));

    expect(() => fileSettingsManager(directory).current()).toThrow(/no top-level "runtime" key/);
    expect(() => fileSettingsManager(directory).current()).toThrow(/node, deno, bun/);
    expect(() => fileSettingsManager(directory).current()).toThrow(/orch setup/);
  });

  test("rejects an unrecognized runtime naming the accepted values", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "settings.json"), JSON.stringify({ schemaVersion: SETTINGS_SCHEMA, runtime: "quickjs" }));

    expect(() => fileSettingsManager(directory).current()).toThrow(/"quickjs"/);
    expect(() => fileSettingsManager(directory).current()).toThrow(/node, deno, bun/);
  });

  test("rejects a runtime misplaced under defaults", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { defaults: { runtime: "node" } });

    expect(() => fileSettingsManager(directory).current()).toThrow(/Unrecognized key.*runtime/);
  });

  test("reads the declared runtime", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { runtime: "deno" });

    const settings = fileSettingsManager(directory).current();
    expect(settings.runtime).toBe("deno");
    expect(declaredRuntime(settings)).toBe("deno");
  });

  test("parses every supported settings section", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      enabled: { adapters: ["pi", "claude"], backends: ["headless"] },
      defaults: { adapter: "claude", backend: "headless", models: { claude: "sonnet" }, worktree: true },
      fleet: { max_agents_total: 12, max_agents_per_space: { wD: 4 }, worker_peer_tools: true, cross_space: true, max_depth: 2 },
      models: { allowed: { claude: ["sonnet", "opus"] }, preferred: { claude: ["sonnet"] } },
      workers: { inherit_extensions: true, exclude_extensions: [], builtin_tools: true, allow_tools: [], verify_commands: [] },
      agents: { writable_settings: ["workers.verify_commands"] },
      queue: { max_retries: 3, dispatch_concurrency: 6 },
      retention: { queue_days: 1, events_days: 2, runs_days: 3, outbox_days: 4, control_outcomes_days: 5, ended_agents_days: 6, logs_days: 7 },
      monitor: { on: ["done", "error"] },
      timeouts: { dispatch_ack_ms: 11, wait_ms: 22, adapter_command_ms: 33, notify_ms: 44, spawn_attach_ms: 55, spawn_attach_poll_ms: 66 },
      notify: [{ id: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
      hosts: { gpu1: { dest: "bryan@gpu1" } },
      spaces: { wD: "Design" },
      daemon: { tcp_port: 4321, work_tick_ms: 7_000 },
      doctor: { unclaimed_after_ms: 123_456 },
      tiling: { first_split: "columns" },
      logging: { slow_tool_ms: 250, stall_ms: 100, stall_poll_ms: 250 },
    });

    expect(fileSettingsManager(directory).current()).toEqual({
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
      fleet: { max_agents_total: 12, max_agents_per_pack: 10, max_agents_per_tab: 4, max_depth: 2, max_agents_per_space: { wD: 4 }, worker_peer_tools: true, cross_space: true },
      mail: { to_spawner: "prompt-unless-focused", to_worker: "prompt" },
      models: { allowed: { claude: ["sonnet", "opus"] }, preferred: { claude: ["sonnet"] } },
      workers: { inherit_extensions: true, exclude_extensions: [], builtin_tools: true, allow_tools: [], verify_commands: [] },
      agents: { writable_settings: ["workers.verify_commands"] },
      queue: { max_retries: 3, dispatch_concurrency: 6 },
      retention: { queue_days: 1, events_days: 2, runs_days: 3, outbox_days: 4, control_outcomes_days: 5, ended_agents_days: 6, logs_days: 7, sweep_interval_ms: 3_600_000 },
      lock: { retries: 50, interval_ms: 100, stale_ms: 10_000 },
      questions: { renag_ms: 120_000, renag_limit: 5 },
      monitor: { on: ["done", "error"] },
      timeouts: { dispatch_ack_ms: 11, wait_ms: 22, adapter_command_ms: 33, notify_ms: 44, spawn_attach_ms: 55, spawn_attach_poll_ms: 66, command_lock_ms: 900_000, command_lock_poll_ms: 1_000 },
      notify: [{ id: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
      locked_commands: [],
      gated_commands: [],
      hosts: { gpu1: { dest: "bryan@gpu1" } },
      spaces: { wD: "Design" },
      daemon: { tcp_port: 4321, idle_shutdown_minutes: 30, outbox_drain_ms: 1000, work_tick_ms: 7_000, liveness_poll_ms: 5_000, report_timeout_ms: 500, bridge_reconnect_ms: 1000, outbox_max_attempts: 120 },
      doctor: { unclaimed_after_ms: 123_456 },
      tiling: { first_split: "columns" },
      logging: { level: "info", slow_tool_ms: 250, stall_ms: 100, stall_poll_ms: 250 },
      skills: { install: true, store: "~/.agents/skills", link: ["~/.claude/skills"] },
    });
  });

  test("reads question re-ask and retention sweep settings", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { questions: { renag_ms: 42, renag_limit: 3 }, retention: { sweep_interval_ms: 77 } });

    expect(fileSettingsManager(directory).current()).toMatchObject({
      questions: { renag_ms: 42, renag_limit: 3 },
      retention: { sweep_interval_ms: 77 },
    });
  });

  test("rejects a file without the current schemaVersion", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "settings.json"), JSON.stringify({ schemaVersion: 999 }));

    expect(() => fileSettingsManager(directory).current()).toThrow("schemaVersion");
    expect(() => fileSettingsManager(directory).current()).toThrow(/orch setup/);
  });

  test("rejects invalid JSON loudly", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "settings.json"), "{ not json");

    expect(() => fileSettingsManager(directory).current()).toThrow("expected valid JSON");
  });

  test("names the key path for invalid fields", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { queue: { max_retries: "once" } });

    expect(() => fileSettingsManager(directory).current()).toThrow(/queue\.max_retries/);
  });

  test("rejects unknown settings keys", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { junk: true });

    expect(() => fileSettingsManager(directory).current()).toThrow(/Unrecognized key.*junk/);
  });

  test("rejects removed spawn cap setting by name", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { fleet: { ["spawn_" + "cap"]: 4 } });

    expect(() => fileSettingsManager(directory).current()).toThrow(new RegExp("Unrecognized key.*spawn_" + "cap"));
  });

  test("parses models.allowed as a per-harness pattern map", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { models: { allowed: { pi: ["openrouter/a", "openrouter/b"] } } });

    expect(fileSettingsManager(directory).current().models.allowed.pi).toEqual(["openrouter/a", "openrouter/b"]);
  });

  test("rejects renamed fleet keys and loads their replacements", () => {
    const oldKeys = ["pack" + "_cap", "max" + "_agents", "space" + "_caps"];
    for (const key of oldKeys) {
      const directory = tempDir();
      writeSettingsFixture(directory, { fleet: { [key]: key === oldKeys[2] ? { main: 2 } : 2 } });
      expect(() => fileSettingsManager(directory).current()).toThrow(/Unrecognized key/);
      expect(() => fileSettingsManager(directory).current()).toThrow(new RegExp(key));
    }
    const directory = tempDir();
    writeSettingsFixture(directory, { fleet: { max_agents_per_pack: 2, max_agents_total: 4, max_agents_per_space: { main: 2 } } });
    expect(fileSettingsManager(directory).current().fleet).toMatchObject({ max_agents_per_pack: 2, max_agents_total: 4, max_agents_per_space: { main: 2 } });
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
      expect(() => fileSettingsManager(directory).current()).toThrow(/Unrecognized key/);
    }
  });

  test("rejects legacy notify type and unknown ids", () => {
    for (const entry of [{ type: "webhook", url: "https://example.test" }, { id: "email" }]) {
      const directory = tempDir();
      writeSettingsFixture(directory, { notify: [entry] });
      expect(() => fileSettingsManager(directory).current()).toThrow(/notify/);
    }
  });

  test("applies every settings default when sections are absent", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "settings.json"), JSON.stringify({ schemaVersion: SETTINGS_SCHEMA, runtime: "node" }));

    expect(fileSettingsManager(directory).current()).toEqual({
      runtime: "node",
      enabled: { adapters: [], backends: [] },
      defaults: { models: {}, thinking: "medium", thinking_by_harness: {}, worktree: false },
      fleet: { max_agents_total: undefined, max_agents_per_pack: 10, max_agents_per_tab: 4, max_depth: 1, max_agents_per_space: {}, worker_peer_tools: false, cross_space: false },
      mail: { to_spawner: "prompt-unless-focused", to_worker: "prompt" },
      models: { allowed: {}, preferred: {} },
      workers: { inherit_extensions: true, exclude_extensions: [], builtin_tools: true, allow_tools: [], verify_commands: [] },
      agents: { writable_settings: ["workers.verify_commands", "locked_commands"] },
      queue: { max_retries: 1, dispatch_concurrency: 4 },
      retention: { queue_days: 14, events_days: 7, runs_days: 30, outbox_days: 7, control_outcomes_days: 30, ended_agents_days: 90, logs_days: 7, sweep_interval_ms: 3_600_000 },
      lock: { retries: 50, interval_ms: 100, stale_ms: 10_000 },
      questions: { renag_ms: 120_000, renag_limit: 5 },
      monitor: { on: ["asking", "blocked", "done", "error", "aborted", "exited"] },
      timeouts: { dispatch_ack_ms: 10_000, wait_ms: 300_000, adapter_command_ms: 60_000, notify_ms: 3_000, spawn_attach_ms: 60_000, spawn_attach_poll_ms: 500, command_lock_ms: 900_000, command_lock_poll_ms: 1_000 },
      notify: [],
      locked_commands: [],
      gated_commands: [],
      hosts: {},
      spaces: {},
      daemon: { tcp_port: 3716, idle_shutdown_minutes: 30, outbox_drain_ms: 1000, work_tick_ms: 5_000, liveness_poll_ms: 5_000, report_timeout_ms: 500, bridge_reconnect_ms: 1000, outbox_max_attempts: 120 },
      doctor: { unclaimed_after_ms: 120_000 },
      tiling: { first_split: "rows" },
      logging: { level: "info", slow_tool_ms: 1_000, stall_ms: 500, stall_poll_ms: 1_000 },
      skills: { install: true, store: "~/.agents/skills", link: ["~/.claude/skills"] },
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

    expect(fileSettingsManager(directory).current()).toMatchObject({
      defaults: { models: {}, worktree: true },
      fleet: { max_depth: 3, max_agents_per_pack: 10, max_agents_per_space: {}, worker_peer_tools: false, cross_space: false },
      workers: { inherit_extensions: true, exclude_extensions: [], builtin_tools: true, allow_tools: ["read"], verify_commands: [] },
      retention: { logs_days: 2, queue_days: 14, events_days: 7, runs_days: 30, outbox_days: 7, ended_agents_days: 90, sweep_interval_ms: 3_600_000 },
      questions: { renag_ms: 120_000, renag_limit: 5 },
      timeouts: { dispatch_ack_ms: 10_000, wait_ms: 1234, adapter_command_ms: 60_000, notify_ms: 3_000, spawn_attach_ms: 60_000, spawn_attach_poll_ms: 500 },
      daemon: { tcp_port: 3716, idle_shutdown_minutes: 0, outbox_drain_ms: 1000, work_tick_ms: 5_000, bridge_reconnect_ms: 1000, outbox_max_attempts: 120 },
      tiling: { first_split: "columns" },
      skills: { install: false, store: "~/.agents/skills", link: ["~/.claude/skills"] },
    });
  });

  test("rejects non-positive and non-integer retention windows", () => {
    for (const [key, value] of [["queue_days", 0], ["events_days", 1.5]] as const) {
      const directory = tempDir();
      writeSettingsFixture(directory, { retention: { [key]: value } });
      expect(() => fileSettingsManager(directory).current()).toThrow(new RegExp(`retention\\.${key}`));
    }
  });

  test("rejects a host without dest", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { hosts: { gpu1: { timeout_ms: 5000 } } });

    expect(() => fileSettingsManager(directory).current()).toThrow(/dest/);
  });

  test("rejects an unknown id in enabled.adapters", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["nonexistent"], backends: [] } });

    expect(() => fileSettingsManager(directory).current()).toThrow(/unknown adapter "nonexistent".*supported adapters:/i);
  });

  test("rejects defaults.adapter not present in enabled.adapters", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: [] }, defaults: { adapter: "claude" } });

    expect(() => fileSettingsManager(directory).current()).toThrow(/defaults\.adapter.*"claude".*enabled: pi/);
  });

  test("rejects when settings.json is absent but a legacy config.toml exists", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "config.toml"), "[defaults]\nadapter = \"pi\"\n");

    expect(() => fileSettingsManager(directory).current()).toThrow(/settings\.json/);
    expect(() => fileSettingsManager(directory).current()).toThrow(/orch setup/);
  });
});

describe("allowedModelPatterns", () => {
  test("restricts nothing when settings contain no patterns", () => {
    // Orch ships no built-in allowlist: a hardcoded default silently pinned every
    // spawn to the one family it happened to list.
    const directory = tempDir();
    writeSettingsFixture(directory);
    expect(allowedModelPatterns(fileSettingsManager(directory).current(), "pi")).toEqual([]);
  });

  test("returns the configured patterns when set", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { models: { allowed: { pi: ["openrouter/x"] } } });

    const settings = fileSettingsManager(directory).current();
    expect(allowedModelPatterns(settings, "pi")).toEqual(["openrouter/x"]);
    expect(allowedModelPatterns(settings, "claude")).toEqual([]);
  });
});

describe("writeSettingsRuntime", () => {
  test("records the runtime as a top-level scalar with no defaults or enabled entry", () => {
    const directory = tempDir();
    writeSettingsRuntime(fileSettingsManager(directory), "node");

    const raw = readSettingsRecord(directory);
    expect(raw.runtime).toBe("node");
    expect(isRecord(raw.defaults) ? raw.defaults.runtime : undefined).toBeUndefined();
    expect(isRecord(raw.enabled) ? raw.enabled.runtimes : undefined).toBeUndefined();
    expect(fileSettingsManager(directory).current().runtime).toBe("node");
  });

  test("re-recording the same runtime leaves the file unchanged", () => {
    const directory = tempDir();
    writeSettingsRuntime(fileSettingsManager(directory), "node");
    const first = fs.readFileSync(path.join(directory, "settings.json"), "utf8");
    writeSettingsRuntime(fileSettingsManager(directory), "node");

    expect(fs.readFileSync(path.join(directory, "settings.json"), "utf8")).toBe(first);
  });

  test("a different runtime replaces the single value in place", () => {
    const directory = tempDir();
    writeSettingsRuntime(fileSettingsManager(directory), "node");
    writeSettingsRuntime(fileSettingsManager(directory), "bun");

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
    writeSettingsRuntime(fileSettingsManager(directory), "node");
    expect(fileSettingsManager(directory).current().runtime).toBe("node");
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
    writeSettingsRuntime(fileSettingsManager(directory), "node");
    writeSettingsEnabled(fileSettingsManager(directory), { adapters: ["pi", "claude"], backends: ["herdr", "headless"] });

    expect(fileSettingsManager(directory).current().enabled).toEqual({ adapters: ["pi", "claude"], backends: ["herdr", "headless"] });
  });
});

describe("writeSettingsDefault", () => {
  test("creates settings.json with the schemaVersion stamp and records entries", () => {
    const directory = tempDir();
    writeSettingsRuntime(fileSettingsManager(directory), "node");
    writeSettingsEnabled(fileSettingsManager(directory), { adapters: ["pi"], backends: ["herdr"] });
    writeSettingsDefault(fileSettingsManager(directory), "adapter", "pi");
    writeSettingsDefault(fileSettingsManager(directory), "backend", "herdr");

    const raw = readSettingsRecord(directory);
    expect(raw.schemaVersion).toBe(SETTINGS_SCHEMA);
    const settings = fileSettingsManager(directory).current();
    expect(settings.defaults.adapter).toBe("pi");
    expect(settings.defaults.backend).toBe("herdr");
  });

  test("replaces an existing entry without disturbing other sections", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["claude", "pi"], backends: [] }, defaults: { adapter: "claude", models: { claude: "sonnet" } }, queue: { max_retries: 3 } });
    writeSettingsDefault(fileSettingsManager(directory), "adapter", "pi");

    const settings = fileSettingsManager(directory).current();
    expect(settings.defaults.adapter).toBe("pi");
    expect(settings.defaults.models.claude).toBe("sonnet");
    expect(settings.queue.max_retries).toBe(3);
  });

  test("is idempotent when rewriting the same value", () => {
    const directory = tempDir();
    writeSettingsRuntime(fileSettingsManager(directory), "node");
    writeSettingsEnabled(fileSettingsManager(directory), { adapters: ["pi"], backends: [] });
    writeSettingsDefault(fileSettingsManager(directory), "adapter", "pi");
    const first = fs.readFileSync(path.join(directory, "settings.json"), "utf8");
    writeSettingsDefault(fileSettingsManager(directory), "adapter", "pi");
    const second = fs.readFileSync(path.join(directory, "settings.json"), "utf8");

    expect(second).toBe(first);
  });

  test("refuses to write through an out-of-version settings file", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "settings.json"), JSON.stringify({ schemaVersion: 999 }));

    expect(() => writeSettingsDefault(fileSettingsManager(directory), "adapter", "pi")).toThrow("schemaVersion");
  });

  test("switches defaults.adapter between two enabled ids and loads clean", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["claude", "pi"], backends: [] }, defaults: { adapter: "claude" } });
    writeSettingsDefault(fileSettingsManager(directory), "adapter", "pi");

    expect(fileSettingsManager(directory).current().defaults.adapter).toBe("pi");
  });
});

describe("writeSettingsFullTree", () => {
  test("round-trips defaults without inventing max_agents_total", () => {
    const directory = tempDir();
    writeSettingsRuntime(fileSettingsManager(directory), "node");
    writeSettingsFullTree(fileSettingsManager(directory));

    const raw = readSettingsRecord(directory);
    expect(raw.fleet).toEqual({ max_agents_per_pack: 10, max_agents_per_tab: 4, max_depth: 1, max_agents_per_space: {}, worker_peer_tools: false, cross_space: false });
    expect(Object.hasOwn(isRecord(raw.fleet) ? raw.fleet : {}, "max_agents_total")).toBe(false);
    expect(fileSettingsManager(directory).current().fleet.max_agents_total).toBeUndefined();
  });
});

describe("settings precedence", () => {
  test("uses the fallback when env and settings.json omit a setting", () => {
    delete process.env.ORCH_CONFIG_PRECEDENCE;
    const directory = tempDir();
    writeSettingsFixture(directory);
    const settings = fileSettingsManager(directory).current();

    expect(resolveSetting<number>({ env: "ORCH_CONFIG_PRECEDENCE", settings: settings.fleet.max_agents_total, fallback: 2 })).toBe(2);
  });

  test("uses the settings.json value over the fallback", () => {
    delete process.env.ORCH_CONFIG_PRECEDENCE;
    const directory = tempDir();
    writeSettingsFixture(directory, { fleet: { max_depth: 4 } });
    const settings = fileSettingsManager(directory).current();

    expect(resolveSetting<number>({ env: "ORCH_CONFIG_PRECEDENCE", settings: settings.fleet.max_depth, fallback: 2 })).toBe(4);
  });

  test("uses the ORCH_* environment value over settings.json", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { fleet: { max_depth: 4 } });
    process.env.ORCH_CONFIG_PRECEDENCE = "7";
    const settings = fileSettingsManager(directory).current();

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

    expect(fileSettingsManager(directory).current().models.preferred.pi).toEqual(["openrouter/a", "openrouter/b"]);
  });

  test("an absent preferred map normalizes to an empty map, not to allowed", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { models: { allowed: { pi: ["openrouter/a"] } } });

    const settings = fileSettingsManager(directory).current();
    expect(settings.models.preferred).toEqual({});
    expect(settings.models.allowed.pi).toEqual(["openrouter/a"]);
  });

  test("writing one list leaves the other byte-for-value intact", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi", "claude"], backends: [] } });

    writeSettingsAllowedModels(fileSettingsManager(directory), { pi: ["openrouter/a"] });
    writeSettingsPreferredModels(fileSettingsManager(directory), { pi: ["openrouter/b", "openrouter/c"] });
    const settings = fileSettingsManager(directory).current();
    expect(settings.models.allowed.pi).toEqual(["openrouter/a"]);
    expect(settings.models.preferred.pi).toEqual(["openrouter/b", "openrouter/c"]);

    writeSettingsAllowedModels(fileSettingsManager(directory), { pi: ["openrouter/a", "openrouter/z"] });
    expect(fileSettingsManager(directory).current().models.preferred.pi).toEqual(["openrouter/b", "openrouter/c"]);

    writeSettingsPreferredModels(fileSettingsManager(directory), { claude: ["sonnet"] });
    expect(fileSettingsManager(directory).current().models.allowed.pi).toEqual(["openrouter/a", "openrouter/z"]);
  });

  test("an empty list is recorded as no list at all, so a cleared picker really clears", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: [] } });

    writeSettingsPreferredModels(fileSettingsManager(directory), { pi: ["openrouter/a"] });
    writeSettingsPreferredModels(fileSettingsManager(directory), { pi: [] });
    expect(fileSettingsManager(directory).current().models.preferred).toEqual({});
  });

  test("the full tree seeds both maps when absent and preserves both when present", () => {
    const seeded = tempDir();
    writeSettingsFixture(seeded, { enabled: { adapters: ["pi"], backends: [] } });
    writeSettingsFullTree(fileSettingsManager(seeded));
    expect(fileSettingsManager(seeded).current().models).toEqual({ allowed: {}, preferred: {} });

    const filled = tempDir();
    writeSettingsFixture(filled, {
      enabled: { adapters: ["pi"], backends: [] },
      models: { allowed: { pi: ["openrouter/a"] }, preferred: { pi: ["openrouter/b"] } },
    });
    writeSettingsFullTree(fileSettingsManager(filled));
    expect(fileSettingsManager(filled).current().models).toEqual({ allowed: { pi: ["openrouter/a"] }, preferred: { pi: ["openrouter/b"] } });
  });

  test("the allowlist gate reads models.allowed only", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { models: { preferred: { pi: ["openrouter/b"] } } });

    // A preferred quicklist restricts nothing: with no allowed patterns every offered model passes.
    expect(allowedModelPatterns(fileSettingsManager(directory).current(), "pi")).toEqual([]);
  });
});
