import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SETTINGS_DEFAULTS, loadConfig } from "../src/config.ts";
import { cmdSpawn, spawnPolicyError } from "../src/commands/spawn.ts";
import { headlessBackend } from "../src/backends/headless/index.ts";
import { presenceAgentDir } from "../src/presence/store.ts";
import { agentViews } from "../src/store/agent-view.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { orm } from "../src/store/connection.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { maySpawnFrom } from "../src/worker-prompt.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import type { AgentView } from "../src/types/store.ts";
import type { PresenceEntry } from "../src/types/presence.ts";
import type { OrchConfig } from "../src/types/config.ts";
import { seedAgent } from "./helpers/agent.ts";
import { agentViewFixture } from "./helpers/views.ts";
import { sql } from "drizzle-orm";

import { numberField, row } from "./helpers/rows.ts";
const tempDirs: string[] = [];
const oldOrchDir = process.env.ORCH_DIR;
const oldAgentKey = process.env[LAUNCH_ENV];
afterEach(() => {
  while (tempDirs.length) rmSync(tempDirs.pop()!, { recursive: true, force: true });
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldOrchDir;
  if (oldAgentKey === undefined) delete process.env[LAUNCH_ENV]; else process.env[LAUNCH_ENV] = oldAgentKey;
});

const fleet = (max_agents_per_pack = 10): OrchConfig["fleet"] => ({
  ...SETTINGS_DEFAULTS.fleet,
  max_agents_per_space: {},
  max_agents_per_pack,
});

function fixtureMaps(agents: AgentView[]): { views: Map<string, AgentView>; presence: Map<string, PresenceEntry> } {
  return {
    views: new Map(agents.map((view): [string, AgentView] => [view.id, view])),
    presence: new Map(agents.map((view): [string, PresenceEntry] => [view.id, {
      key: view.id,
      dir: "",
      status: null,
      result: null,
      alive: true,
    }])),
  };
}

function policy(max_agents_per_pack: number, agents: AgentView[], spawnerId = "root", requested = 1): string | null {
  const { views, presence } = fixtureMaps(agents);
  return spawnPolicyError({ fleet: fleet(max_agents_per_pack) }, "space", requested, views, presence, spawnerId);
}

describe("spawn policy caps", () => {
  test("launch env uses the minted agent id name", () => {
    expect(LAUNCH_ENV).toBe("ORCH_AGENT_ID");
  });
  describe("worker prompt depth", () => {
    test("root worker maySpawn follows max_depth", () => {
      const dir = mkdtempSync(join(tmpdir(), "orch-worker-depth-"));
      tempDirs.push(dir);
      expect(maySpawnFrom(dir, "root", 1)).toBe(false);
      expect(maySpawnFrom(dir, "root", 2)).toBe(true);
    });
  });

  test("allows a pack spawn while under the cap", () => {
    const agents = Array.from({ length: 8 }, (_, index) => agentViewFixture(`slave-${index}`, {
      spawnedBy: "root", spawnedByName: "root", rootAgentId: "root", environment: { space: "space" },
    }));
    expect(policy(10, agents)).toBeNull();
  });

  test("blocks an at-cap spawn and offers dispatch or the pack queue", () => {
    const agents = Array.from({ length: 9 }, (_, index) => agentViewFixture(`slave-${index}`, {
      spawnedBy: "root", spawnedByName: "root", rootAgentId: "root", environment: { space: "space" },
    }));
    const error = policy(10, agents);
    expect(error).toContain("pack cap 10");
    expect(error).toContain("fleet.max_agents_per_pack");
    expect(error).toContain("orch dispatch <name>");
    expect(error).toContain("orch queue add");
  });

  test("a slave may not spawn by default: fleet.max_depth is 1", () => {
    const error = policy(10, [
      agentViewFixture("child", {
        spawnedBy: "root", spawnedByName: "root", rootAgentId: "root", environment: { space: "space" },
      }),
    ], "child");
    expect(error).toContain("maximum spawn depth is 1");
    expect(error).toContain("depth 1");
    expect(error).toContain("fleet.max_depth");
    expect(error).toContain("orch dispatch <name>");
    expect(error).toContain("orch queue add");
    expect(error).toContain("orch settings");
  });

  test("fleet.max_depth 2 lets a slave spawn and refuses its child", () => {
    const tree = [
      agentViewFixture("child", {
        spawnedBy: "root", spawnedByName: "root", rootAgentId: "root", environment: { space: "space" },
      }),
      agentViewFixture("grandchild", {
        spawnedBy: "child", spawnedByName: "child", rootAgentId: "root", environment: { space: "space" },
      }),
    ];
    const { views, presence } = fixtureMaps(tree);
    const settings = { fleet: { ...fleet(10), max_depth: 2 } };
    expect(spawnPolicyError(settings, "space", 1, views, presence, "child")).toBeNull();
    const error = spawnPolicyError(settings, "space", 1, views, presence, "grandchild");
    expect(error).toContain("maximum spawn depth is 2");
    expect(error).toContain("depth 2");
  });

  test("reads a pack cap override from settings", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-spawn-policy-"));
    tempDirs.push(dir);
    writeSettingsFixture(dir, { fleet: { max_agents_per_pack: 2 } });
    const config = loadConfig(dir);
    expect(config.fleet.max_agents_per_pack).toBe(2);
    const { views, presence } = fixtureMaps([agentViewFixture("slave", {
      spawnedBy: "root", spawnedByName: "root", rootAgentId: "root", environment: { space: "space" },
    })]);
    expect(spawnPolicyError(config, "space", 1, views, presence, "root")).toContain("pack cap 2");
  });

  test("a refused cmdSpawn makes no name, worktree, registry, or queue mutation", async () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-spawn-policy-refused-"));
    tempDirs.push(dir);
    process.env.ORCH_DIR = dir;
    writeSettingsFixture(dir, {
      enabled: { adapters: ["pi"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless", models: { pi: "openrouter/openai/gpt-5.6-luna" } },
      fleet: { max_agents_per_pack: 1 },
    });
    const key = "liveagent1";
    // A space is USER-created and never minted (A7), so the fixture creates the
    // one the claimant sits in before placing an agent in it.
    orm(dir).run(sql`INSERT INTO spaces (id, name, created_by, created_at) VALUES (${"space"}, ${"space"}, NULL, ${1})`);
    seedAgent(key, { adapter: "pi", backend: "headless", space: "space", handle: key });
    const statusDir = presenceAgentDir(key, dir);
    mkdirSync(statusDir, { recursive: true });
    writeFileSync(join(statusDir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, state: "idle" }));
    const beforeRegistry = agentViews(dir).map((view) => view.id);
    const beforeTasks = numberField(row(orm(dir), sql`SELECT COUNT(*) AS count FROM tasks`), "count");
    // Inject a backend claimant: policy refusal must happen before allocation.
    const originalSpawn = headlessBackend.spawn.bind(headlessBackend);
    let backendAllocations = 0;
    const refusingSpawn: typeof headlessBackend.spawn = (..._args) => {
      backendAllocations++;
      throw new Error("backend allocation should not occur after policy refusal");
    };
    Object.defineProperty(headlessBackend, "spawn", { value: refusingSpawn, configurable: true, writable: true });
    const originalExit = process.exit.bind(process);
    const originalWrite = process.stdout.write.bind(process.stdout);
    let stdout = "";
    function stdoutWrite(chunk: string | Uint8Array, _callback?: (error: Error | null | undefined) => void): boolean;
    function stdoutWrite(chunk: string | Uint8Array, _encoding: BufferEncoding, _callback?: (error: Error | null | undefined) => void): boolean;
    function stdoutWrite(chunk: string | Uint8Array): boolean {
      stdout += String(chunk);
      return true;
    }
    process.stdout.write = stdoutWrite;
    process.exit = (code?: number): never => { throw new Error(`exit ${code ?? 0}`); };
    let refusal: unknown;
    try {
      await cmdSpawn(["capped", "--agent", "pi", "--backend", "headless", "--prompt", "work", "--worktree", "--json"]);
    } catch (error: unknown) {
      refusal = error;
    } finally {
      process.exit = originalExit;
      process.stdout.write = originalWrite;
      Object.defineProperty(headlessBackend, "spawn", { value: originalSpawn, configurable: true, writable: true });
    }
    // A refusal THROWS a typed error and prints nothing itself: `die()` belongs to
    // the CLI boundary, never inside a function another command calls (bug 1.11).
    // runSetupSmoke catches this; a process.exit here killed setup mid-verdict.
    expect(refusal).toBeInstanceOf(Error);
    if (!(refusal instanceof Error)) throw new Error("refusal was not an Error");
    expect(refusal.message).toMatch(/spawn refused:.*pack cap 1/);
    expect(stdout).toBe("");
    expect(backendAllocations).toBe(0);
    // The live registry row above is the injected name claimant; it must remain the sole claim.
    expect(agentViews(dir).map((view) => view.id)).toEqual(beforeRegistry);
    expect(numberField(row(orm(dir), sql`SELECT COUNT(*) AS count FROM tasks`), "count")).toBe(beforeTasks);
    expect(existsSync(join(dir, "agents", key))).toBe(true);
    expect(existsSync(join(dir, ".orch-worktrees"))).toBe(false);
  });
});
