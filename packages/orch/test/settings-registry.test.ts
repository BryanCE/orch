import type { OrchDir } from "../src/types/core.ts";
import type { SettingSpec } from "../src/types/settings.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";


import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { SETTINGS_FILE_SCHEMA, settingsPath } from "../src/settings/schema.ts";
import { fileSettingsManager } from "../src/settings/manager.ts";
import { writeSettingsFullTree } from "../src/settings/write.ts";
import { SETTINGS_REGISTRY, writeRegisteredSetting } from "../src/settings/registry.ts";
import { AGENT_SETTINGS_GRANT } from "../src/policy/agent-settings.ts";
import { parseSettingValue } from "../src/settings/parse.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

const dirs: OrchDir[] = [];

function tempDir(): OrchDir {
  const directory = tempOrchDir("orch-settings-registry-");
  dirs.push(directory);
  return directory;
}

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop() ?? "");
});

/** The registry entry for a key the test knows exists. */
function registered(key: string): SettingSpec {
  const setting = SETTINGS_REGISTRY.find((entry) => entry.key === key);
  if (setting === undefined) throw new Error(`no registered setting ${key}`);
  return setting;
}

interface SchemaWithShape { readonly shape?: Record<string, unknown> }

interface SchemaWithUnwrap { readonly unwrap: () => unknown }

function hasUnwrap(value: unknown): value is SchemaWithUnwrap {
  return value !== null && typeof value === "object" && "unwrap" in value
    && typeof value.unwrap === "function";
}

function unwrapSchema(value: unknown): unknown {
  let current = value;
  while (hasUnwrap(current)) current = current.unwrap();
  return current;
}

function hasShape(value: unknown): value is SchemaWithShape {
  const schema = unwrapSchema(value);
  if (schema === null || typeof schema !== "object" || !("shape" in schema)) return false;
  const shape = schema.shape;
  return shape === undefined || (shape !== null && typeof shape === "object");
}

function schemaSettingKeys(): string[] {
  const keys: string[] = [];
  // schemaVersion is the file-format stamp, not a user setting and has no OrchSettings value.

  const walk = (rawSchema: unknown, prefix: string): void => {
    const schema = unwrapSchema(rawSchema);
    if (!hasShape(schema)) {
      if (prefix !== "schemaVersion") keys.push(prefix);
      return;
    }
    if (schema.shape === undefined) return;
    for (const [key, child] of Object.entries(schema.shape)) {
      if (key === "schemaVersion") continue;
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (hasShape(child)) walk(child, fullKey);
      else keys.push(fullKey);
    }
  };
  walk(SETTINGS_FILE_SCHEMA, "");
  return keys;
}

function completeSettings(): Record<string, unknown> {
  return {
    runtime: "node",
    enabled: { adapters: ["pi"], backends: ["headless"] },
    defaults: {
      adapter: "pi",
      backend: "headless",
      models: { pi: "openai/test" },
      thinking: "medium",
      thinking_by_harness: { pi: "low" },
      worktree: true,
    },
    fleet: {
      max_agents_per_pack: 4,
      max_agents_per_tab: 3,
      max_depth: 2,
      max_agents_total: 5,
      max_agents_per_space: { main: 2 },
      worker_peer_tools: true,
      cross_space: true,
    },
    mail: { to_spawner: "events", to_worker: "prompt" },
    models: { allowed: { pi: ["openai/test"] }, preferred: { pi: ["openai/test"] } },
    workers: {
      inherit_extensions: false,
      exclude_extensions: ["one"],
      builtin_tools: false,
      allow_tools: ["read"],
    },
    queue: { max_retries: 2 },
    logging: { level: "debug" },
    retention: { ended_agents_days: 1, queue_days: 2, events_days: 3, runs_days: 4, outbox_days: 5, logs_days: 6 },
    timeouts: { dispatch_ack_ms: 1, wait_ms: 2, adapter_command_ms: 3, notify_ms: 4, spawn_attach_ms: 5, spawn_attach_poll_ms: 6, lock_wait_ms: 7, lock_poll_ms: 8 },
    notify: [{ id: "desktop" }],
    locked_commands: { commands: ["bun test"], applies_to: ["slave"] },
    gated_commands: ["git push"],
    hosts: { local: { dest: "localhost" } },
    spaces: { main: "/tmp/main" },
    daemon: { tcp_port: 3716, idle_shutdown_minutes: 0 },
    tiling: { first_split: "rows" },
    skills: { install: false, store: "/tmp/skills", link: ["/tmp/claude-skills"] },
  };
}

describe("settings registry", () => {
  test("declares every schema setting exactly once", () => {
    const schemaKeys = schemaSettingKeys();
    const registryKeys = SETTINGS_REGISTRY.map((setting) => setting.key);
    expect(registryKeys).toHaveLength(new Set(registryKeys).size);
    expect(registryKeys.slice().sort()).toEqual(schemaKeys.slice().sort());
  });

  test("every registry read resolves against loaded settings", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, completeSettings());
    const settings = fileSettingsManager(directory).current();
    for (const setting of SETTINGS_REGISTRY) {
      expect(setting.read(settings), setting.key).not.toBeUndefined();
    }
  });

  test("fleet help explains what each limit counts", () => {
    for (const key of ["fleet.max_depth", "fleet.max_agents_per_pack", "fleet.max_agents_per_tab", "fleet.max_agents_per_space", "fleet.max_agents_total"]) {
      const setting = SETTINGS_REGISTRY.find((entry) => entry.key === key);
      expect(setting, key).toBeDefined();
      expect(setting?.help.toLowerCase()).toMatch(/agents|levels/);
    }
  });

  test("fleet.max_depth round-trips through the full-tree writer", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, completeSettings());
    writeSettingsFullTree(fileSettingsManager(directory));
    expect(fileSettingsManager(directory).current().fleet.max_depth).toBe(2);
  });

  test("fleet.max_depth rejects zero through the registered writer", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, completeSettings());
    expect(() => writeRegisteredSetting(fileSettingsManager(directory), "fleet.max_depth", 0)).toThrow(/fleet[\s\S]*max_depth/);
  });

  test("fleet.max_depth writes its value to settings.json", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, completeSettings());
    writeRegisteredSetting(fileSettingsManager(directory), "fleet.max_depth", 2);
    const raw: unknown = JSON.parse(readFileSync(settingsPath(directory), "utf8"));
    expect(raw).toMatchObject({ fleet: { max_depth: 2 } });
  });

  test("retention.ended_agents_days is an integer that accepts none", () => {
    const setting = registered("retention.ended_agents_days");
    expect(setting.type).toMatchObject({ kind: "integer", min: 1, none: true });
    expect(parseSettingValue(setting, "none")).toEqual({ ok: true, value: null });
    expect(parseSettingValue(setting, "30")).toEqual({ ok: true, value: 30 });
    expect(parseSettingValue(setting, "forever").ok).toBe(false);
  });

  test("retention.ended_agents_days writes null and reads it back as null", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, completeSettings());
    writeRegisteredSetting(fileSettingsManager(directory), "retention.ended_agents_days", null);
    const raw: unknown = JSON.parse(readFileSync(settingsPath(directory), "utf8"));
    expect(raw).toMatchObject({ retention: { ended_agents_days: null } });
    expect(fileSettingsManager(directory).current().retention.ended_agents_days).toBeNull();
  });

  test("an integer without none refuses none", () => {
    const setting = registered("retention.queue_days");
    expect(setting.type).toMatchObject({ kind: "integer", min: 1 });
    expect(setting.type).not.toHaveProperty("none");
    expect(parseSettingValue(setting, "none").ok).toBe(false);
  });

  test("contains no duplicate keys", () => {
    const keys = SETTINGS_REGISTRY.map((setting) => setting.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("agents.writable_settings writes a list of registered keys", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, completeSettings());
    writeRegisteredSetting(fileSettingsManager(directory), AGENT_SETTINGS_GRANT, ["workers.verify_commands", "fleet.max_depth"]);
    expect(fileSettingsManager(directory).current().agents.writable_settings).toEqual(["workers.verify_commands", "fleet.max_depth"]);
  });

  test("agents.writable_settings refuses an unknown key", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, completeSettings());
    expect(() => writeRegisteredSetting(fileSettingsManager(directory), AGENT_SETTINGS_GRANT, ["fleet.max_dept"])).toThrow(/unknown setting "fleet.max_dept"/);
  });

  test("agents.writable_settings refuses a read-only key", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, completeSettings());
    expect(() => writeRegisteredSetting(fileSettingsManager(directory), AGENT_SETTINGS_GRANT, ["runtime"])).toThrow(/runtime is read-only/);
  });

  test("agents.writable_settings never grants itself", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, completeSettings());
    expect(() => writeRegisteredSetting(fileSettingsManager(directory), AGENT_SETTINGS_GRANT, [AGENT_SETTINGS_GRANT])).toThrow(/never grants itself/);
  });

  test("the model rows open the model picker and still parse JSON on the CLI", () => {
    for (const key of ["defaults.models", "models.allowed", "models.preferred"]) {
      const spec = registered(key);
      expect(spec.type).toEqual({ kind: "models" });
      expect(parseSettingValue(spec, "{\"pi\":[\"openai-codex/gpt-6-luna\"]}").ok).toBe(true);
    }
  });
});
