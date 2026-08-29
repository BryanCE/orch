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
import type { AgentView } from "../src/types/store.ts";
import type { PresenceEntry } from "../src/types/presence.ts";
import type { OrchConfig } from "../src/types/config.ts";
import { seedAgent } from "./helpers/agent.ts";
import { sql } from "drizzle-orm";

import { row } from "./helpers/rows.ts";
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
  space_caps: {},
  pack_cap,
});

/** A complete AgentView; provenance is the spawner's ID, never a pane key. */
function agentViewFixture(id: string, spawnedBy: string | null, space: string): AgentView {
  return {
    id, name: id, label: null, harnessId: "pi", cwd: "/repo", createdAt: 1,
    spawnedBy, spawnedByName: spawnedBy, rootAgentId: spawnedBy ?? id, heldBy: null,
    environment: { plexer: "headless", handle: null, space, worktree: null, branch: null },
    tuning: { model: null, thinking: null },
    endedAt: null,
  };
}

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

function policy(pack_cap: number, agents: AgentView[], spawnerId = "root", requested = 1): string | null {
  const { views, presence } = fixtureMaps(agents);
  return spawnPolicyError({ fleet: fleet(pack_cap) }, "space", requested, views, presence, spawnerId);
}

describe("spawn policy caps", () => {
  test("allows a pack spawn while under the cap", () => {
    const agents = Array.from({ length: 8 }, (_, index) => agentViewFixture(`slave-${index}`, "root", "space"));
    expect(policy(10, agents)).toBeNull();
  });

  test("blocks an at-cap spawn and offers dispatch or the pack queue", () => {
    const agents = Array.from({ length: 9 }, (_, index) => agentViewFixture(`slave-${index}`, "root", "space"));
    const error = policy(10, agents);
    expect(error).toContain("pack cap 10");
    expect(error).toContain("orch dispatch <name>");
    expect(error).toContain("orch queue add");
  });

  test("blocks a spawn that would create depth three", () => {
    const error = policy(10, [
      agentViewFixture("child", "root", "space"),
      agentViewFixture("grandchild", "child", "space"),
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
    const { views, presence } = fixtureMaps([agentViewFixture("slave", "root", "space")]);
    expect(spawnPolicyError(config, "space", 1, views, presence, "root")).toContain("pack cap 2");
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
    const key = "liveagent1";
    // A space is USER-created and never minted (A7), so the fixture creates the
    // one the claimant sits in before placing an agent in it.
    orm(dir).run(sql`INSERT INTO spaces (id, name, created_by, created_at) VALUES (${"space"}, ${"space"}, NULL, ${1})`);
    seedAgent(key, { adapter: "pi", backend: "headless", space: "space", handle: key });
    const statusDir = presenceAgentDir(key, dir);
    mkdirSync(statusDir, { recursive: true });
    writeFileSync(join(statusDir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, state: "idle" }));
    const beforeRegistry = agentViews(dir).map((view) => view.id);
    const beforeTasks = (row(orm(dir), sql`SELECT COUNT(*) AS count FROM tasks`) as { count: number }).count;
    // Inject a backend claimant: policy refusal must happen before allocation.
    const backend = headlessBackend as unknown as { spawn: typeof headlessBackend.spawn };
    const originalSpawn = backend.spawn;
    let backendAllocations = 0;
    backend.spawn = (..._args: Parameters<typeof backend.spawn>): ReturnType<typeof backend.spawn> => {
      backendAllocations++;
      throw new Error("backend allocation should not occur after policy refusal");
    };
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
      backend.spawn = originalSpawn;
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
    expect((row(orm(dir), sql`SELECT COUNT(*) AS count FROM tasks`) as { count: number }).count).toBe(beforeTasks);
    expect(existsSync(join(dir, "agents", key))).toBe(true);
    expect(existsSync(join(dir, ".orch-worktrees"))).toBe(false);
  });
});
