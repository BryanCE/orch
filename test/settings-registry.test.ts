import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SETTINGS_FILE_SCHEMA, loadConfig } from "../src/config.ts";
import { SETTINGS_REGISTRY } from "../src/settings/registry.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

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
  // schemaVersion is the file-format stamp, not a user setting and has no OrchConfig value.

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
      max_depth: 2,
      max_agents_total: 5,
      max_agents_per_space: { main: 2 },
      worker_peer_tools: true,
      cross_space: true,
    },
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
    timeouts: { dispatch_ack_ms: 1, wait_ms: 2, adapter_command_ms: 3, notify_ms: 4 },
    notify: [{ id: "desktop" }],
    locked_commands: ["bun test"],
    hosts: { local: { dest: "localhost" } },
    spaces: { main: "/tmp/main" },
    daemon: { tcp_port: 3716, idle_shutdown_minutes: 0 },
    tiling: { first_split: "rows" },
    skills: { install: false, roots: ["/tmp/skills"] },
  };
}

describe("settings registry", () => {
  test("declares every schema setting exactly once", () => {
    const schemaKeys = schemaSettingKeys();
    const registryKeys = SETTINGS_REGISTRY.map((setting) => setting.key);
    expect(registryKeys).toHaveLength(new Set(registryKeys).size);
    expect(registryKeys.slice().sort()).toEqual(schemaKeys.slice().sort());
  });

  test("every registry read resolves against a loaded config", () => {
    const directory = mkdtempSync(join(tmpdir(), "orch-settings-registry-"));
    writeSettingsFixture(directory, completeSettings());
    const config = loadConfig(directory);
    for (const setting of SETTINGS_REGISTRY) {
      expect(setting.read(config), setting.key).not.toBeUndefined();
    }
  });

  test("fleet help explains what each limit counts", () => {
    for (const key of ["fleet.max_depth", "fleet.max_agents_per_pack", "fleet.max_agents_per_space", "fleet.max_agents_total"]) {
      const setting = SETTINGS_REGISTRY.find((entry) => entry.key === key);
      expect(setting, key).toBeDefined();
      expect(setting?.help.toLowerCase()).toMatch(/agents|levels/);
    }
  });

  test("contains no duplicate keys", () => {
    const keys = SETTINGS_REGISTRY.map((setting) => setting.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
