import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SETTINGS_DEFAULTS, loadConfig, type OrchConfig } from "../src/config.ts";
import { cmdSpawn, spawnPolicyError } from "../src/commands/spawn.ts";
import { presenceAgentDir, recordSpawned, spawnedRecords } from "../src/presence/store.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { openStore } from "../src/store/connection.ts";
import type { PresenceEntry } from "../src/presence/store.ts";
import type { SpawnedRecord } from "../src/store/spawned-rows.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

const tempDirs: string[] = [];
const oldOrchDir = process.env.ORCH_DIR;
const oldAgentKey = process.env.ORCH_AGENT_KEY;
afterEach(() => {
  while (tempDirs.length) rmSync(tempDirs.pop()!, { recursive: true, force: true });
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldOrchDir;
  if (oldAgentKey === undefined) delete process.env.ORCH_AGENT_KEY; else process.env.ORCH_AGENT_KEY = oldAgentKey;
});

const fleet = (pack_cap = 10): OrchConfig["fleet"] => ({
  ...SETTINGS_DEFAULTS.fleet,
  workspace_caps: {},
  pack_cap,
});

function policy(pack_cap: number, records: SpawnedRecord[], spawnerKey = "root", requested = 1): string | null {
  const registry = new Map(records.map((record) => [record.pane, record]));
  const presence = new Map(records.map((record): [string, PresenceEntry] => [record.pane, {
    key: record.pane,
    dir: "",
    status: null,
    result: null,
    alive: true,
  }]));
  return spawnPolicyError({ fleet: fleet(pack_cap) }, "workspace", requested, registry, presence, spawnerKey);
}

describe("spawn policy caps", () => {
  test("allows a pack spawn while under the cap", () => {
    const records = Array.from({ length: 8 }, (_, index) => ({ pane: `slave-${index}`, spawnedBy: "root", workspace: "workspace" }));
    expect(policy(10, records)).toBeNull();
  });

  test("blocks an at-cap spawn and offers dispatch or the pack queue", () => {
    const records = Array.from({ length: 9 }, (_, index) => ({ pane: `slave-${index}`, spawnedBy: "root", workspace: "workspace" }));
    const error = policy(10, records);
    expect(error).toContain("pack cap 10");
    expect(error).toContain("orch dispatch <name>");
    expect(error).toContain("orch queue add");
  });

  test("blocks a spawn that would create depth three", () => {
    const error = policy(10, [
      { pane: "child", spawnedBy: "root", workspace: "workspace" },
      { pane: "grandchild", spawnedBy: "child", workspace: "workspace" },
    ], "grandchild");
    expect(error).toContain("depth 2");
    expect(error).toContain("orch dispatch <name>");
    expect(error).toContain("orch queue add");
  });

  test("reads a pack cap override from settings", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-spawn-policy-"));
    tempDirs.push(dir);
    writeSettingsFixture(dir, { fleet: { pack_cap: 2 } });
    const config = loadConfig(dir);
    expect(config.fleet.pack_cap).toBe(2);
    const records = [{ pane: "slave", spawnedBy: "root", workspace: "workspace" }];
    const registry = new Map(records.map((record) => [record.pane, record]));
    const presence = new Map(records.map((record): [string, PresenceEntry] => [record.pane, { key: record.pane, dir: "", status: null, result: null, alive: true }]));
    expect(spawnPolicyError(config, "workspace", 1, registry, presence, "root")).toContain("pack cap 2");
  });

  test("a refused cmdSpawn makes no name, worktree, registry, or queue mutation", async () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-spawn-policy-refused-"));
    tempDirs.push(dir);
    process.env.ORCH_DIR = dir;
    writeSettingsFixture(dir, {
      enabled: { adapters: ["pi"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless", models: { pi: "openrouter/openai/gpt-5.6-luna" } },
      fleet: { pack_cap: 1 },
    });
    const key = "headless~workspace~live";
    recordSpawned(key, { backend: "headless", workspace: "workspace", handle: key, name: "work-1" });
    const statusDir = presenceAgentDir(key, dir);
    mkdirSync(statusDir, { recursive: true });
    writeFileSync(join(statusDir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, state: "idle" }));
    const beforeRegistry = [...spawnedRecords().entries()];
    const beforeTasks = (openStore(dir).query("SELECT COUNT(*) AS count FROM tasks").get() as { count: number }).count;
    const originalExit = process.exit.bind(process);
    const originalWrite = process.stderr.write.bind(process.stderr);
    let stderr = "";
    process.stderr.write = (...args: unknown[]) => { stderr += String(args[0]); return true; };
    process.exit = (code?: number): never => { throw new Error(`exit ${code ?? 0}`); };
    let refusal: unknown;
    try {
      await cmdSpawn(["1", "--agent", "pi", "--backend", "headless", "--prompt", "work", "--worktree", "--json"]);
    } catch (error: unknown) {
      refusal = error;
    } finally {
      process.exit = originalExit;
      process.stderr.write = originalWrite;
    }
    expect(refusal).toBeInstanceOf(Error);
    expect((refusal as Error).message).toBe("exit 1");
    expect(stderr).toMatch(/spawn refused:.*pack cap 1/);
    expect([...spawnedRecords().entries()]).toEqual(beforeRegistry);
    expect((openStore(dir).query("SELECT COUNT(*) AS count FROM tasks").get() as { count: number }).count).toBe(beforeTasks);
    expect(existsSync(join(dir, "agents", key))).toBe(true);
    expect(existsSync(join(dir, ".orch-worktrees"))).toBe(false);
  });
});
