import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { loadConfig } from "../src/config.ts";
import { runDoctor, applyFixes } from "../src/doctor/runner.ts";
import { SpawnRefusalError, assertSpawnCapacity, liveSpawnCounts, spawnPolicyError } from "../src/commands/spawn.ts";
import { presenceAgentDir } from "../src/presence/store.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { seedStatusInDir } from "./helpers/presence.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { AgentView } from "../src/types/store.ts";
import type { PresenceEntry } from "../src/types/presence.ts";

const dirs: string[] = [];
const oldOrchDir = process.env.ORCH_DIR;

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-spawn-limits-"));
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  return dir;
}

function presence(key: string, pid = process.pid): PresenceEntry {
  const dir = presenceAgentDir(key);
  seedStatusInDir(dir, { key, pid });
  return { key, dir, status: { schema: PRESENCE_SCHEMA, key, pid }, result: null, alive: pid === process.pid };
}

/** A complete AgentView: the space is an ENVIRONMENT axis and provenance is its
 *  own immutable fact — neither is a column on a wide row (A1). */
function agentViewFixture(id: string, space: string, spawnedBy: string | null): AgentView {
  return {
    id, name: id, label: null, harnessId: "pi", cwd: "/repo", createdAt: 1,
    spawnedBy, spawnedByName: spawnedBy, rootAgentId: spawnedBy ?? id, heldBy: null,
    environment: { plexer: "headless", handle: null, space, worktree: null, branch: null },
    tuning: { model: null, thinking: null },
    endedAt: null,
  };
}

/** Both maps are keyed by the MINTED ID; presence joins to an agent by identity,
 *  never by the pane-bearing key. */
function records(entries: [string, string, number?, string?][]): { views: Map<string, AgentView>; presence: Map<string, PresenceEntry> } {
  const views = new Map<string, AgentView>();
  const live = new Map<string, PresenceEntry>();
  for (const [id, space, pid, spawnedBy] of entries) {
    views.set(id, agentViewFixture(id, space, spawnedBy ?? null));
    live.set(id, presence(id, pid));
  }
  return { views, presence: live };
}

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldOrchDir;
});

function capacityRefusal(
  settings: Parameters<typeof assertSpawnCapacity>[0],
  workspace: string,
  requested: number,
  data: { views: Map<string, AgentView>; presence: Map<string, PresenceEntry> },
): string {
  // A refusal THROWS and prints nothing: `die()` belongs to the CLI boundary,
  // never inside a function another command calls (bug 1.11). The message the
  // caller would print is the error's own.
  try {
    assertSpawnCapacity(settings, workspace, requested, data.views, data.presence);
  } catch (error: unknown) {
    if (error instanceof SpawnRefusalError) return error.message;
    throw error;
  }
  throw new Error("expected spawn capacity refusal");
}

describe("spawn limits", () => {
  test("schema loads global and workspace caps", () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { fleet: { max_agents: 12, space_caps: { wD: 4 } } });
    expect(loadConfig(dir).fleet).toEqual({ spawn_cap: 8, max_agents: 12, pack_cap: 10, space_caps: { wD: 4 }, worker_peer_tools: false, cross_space: false });
  });

  test.each([0, -1, 1.5])("rejects invalid cap %s with file and key", (value) => {
    const dir = tempDir();
    writeSettingsFixture(dir, { fleet: { max_agents: value } });
    expect(() => loadConfig(dir)).toThrow(/settings\.json/);
    expect(() => loadConfig(dir)).toThrow(/fleet\.max_agents/);
  });

  test("omitted fleet caps normalize to defaults", () => {
    const dir = tempDir();
    writeSettingsFixture(dir);
    expect(loadConfig(dir).fleet).toEqual({ spawn_cap: 8, max_agents: undefined, pack_cap: 10, space_caps: {}, worker_peer_tools: false, cross_space: false });
  });

  test("global boundary refusal data counts the whole request", () => {
    const dir = tempDir();
    const data = records([["a", "wA"], ["b", "wB"], ["c", "wB"], ["d", "wC"], ["e", "wC"]]);
    expect([...liveSpawnCounts(data.views, data.presence).entries()]).toEqual([["wA", 1], ["wB", 2], ["wC", 2]]);
    writeSettingsFixture(dir, { fleet: { max_agents: 6 } });
    const settings = loadConfig(dir);
    expect(settings.fleet.max_agents).toBe(6);
    expect(capacityRefusal(settings, "wA", 2, data)).toBe("spawn refused: would put all spaces at 7/6 agents (5 live + 2 requested; fleet.max_agents)");
  });

  test("one workspace may use the full global allotment", () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { fleet: { max_agents: 6 } });
    const settings = loadConfig(dir);
    const data = records([["a", "wD"], ["b", "wD"], ["c", "wD"]]);
    expect(liveSpawnCounts(data.views, data.presence).get("wD")).toBe(3);
    expect(() => assertSpawnCapacity(settings, "wD", 3, data.views, data.presence)).not.toThrow();
  });

  test("workspace cap is independent of global headroom", () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { fleet: { max_agents: 12, space_caps: { wD: 4 } } });
    const settings = loadConfig(dir);
    const data = records([["a", "wD"], ["b", "wD"], ["c", "wD"]]);
    expect(capacityRefusal(settings, "wD", 2, data)).toBe("spawn refused: would put wD at 5/4 agents (3 live + 2 requested; fleet.space_caps.wD)");
  });

  test("uncapped space is bounded only by global count", () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { fleet: { max_agents: 6 } });
    const settings = loadConfig(dir);
    const data = records([["a", "wD"], ["b", "wX"]]);
    expect(() => assertSpawnCapacity(settings, "wX", 4, data.views, data.presence)).not.toThrow();
    expect(capacityRefusal(settings, "wX", 5, data)).toBe("spawn refused: would put all spaces at 7/6 agents (2 live + 5 requested; fleet.max_agents)");
  });

  test("foreign pack members do not consume the caller's pack cap", () => {
    const data = records([
      ["root-child-1", "wD", undefined, "root"], ["root-child-2", "wD", undefined, "root"],
      ["root-child-3", "wD", undefined, "root"], ["root-child-4", "wD", undefined, "root"],
      ["root-child-5", "wD", undefined, "root"], ["root-child-6", "wD", undefined, "root"],
      ["root-child-7", "wD", undefined, "root"], ["root-child-8", "wD", undefined, "root"],
      ["foreign-1", "wD", undefined, "other-root"], ["foreign-2", "wD", undefined, "other-root"],
    ]);
    expect(spawnPolicyError({ fleet: { pack_cap: 10, space_caps: {}, worker_peer_tools: false, cross_space: false, spawn_cap: 8 } }, "wD", 1, data.views, data.presence, "root")).toBeNull();
  });

  test("dead pid records free capacity", () => {
    const data = records([["dead", "wD", 99999999], ["live", "wD"]]);
    expect(liveSpawnCounts(data.views, data.presence)).toEqual(new Map([["wD", 1]]));
  });

  test("foreign panes never count", () => {
    const data = records([["orch", "wD"]]);
    data.presence.set("foreign", presence("foreignag1"));
    expect(liveSpawnCounts(data.views, data.presence).get("wD")).toBe(1);
  });

  test("doctor reports an unsatisfiable workspace cap without a fix", async () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { fleet: { max_agents: 4, space_caps: { wX: 8 } } });
    const result = (await runDoctor(dir)).find((entry) => entry.id === "spawn-limits")!;
    expect(result.status).toBe("warn");
    expect(result.fix).toBeUndefined();
    expect(result.detail).toContain("fleet.space_caps.wX");
    expect(result.detail).toContain("fleet.max_agents");
    expect(applyFixes([result])).toEqual({ applied: [] });
  });

  test("doctor accepts satisfiable limits", async () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { fleet: { max_agents: 8, space_caps: { wX: 4 } } });
    expect((await runDoctor(dir)).find((entry) => entry.id === "spawn-limits")).toMatchObject({ status: "ok" });
  });
});
