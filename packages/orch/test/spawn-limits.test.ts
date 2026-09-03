import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { loadSettings } from "../src/settings/read.ts";
import { runDoctor, applyFixes } from "../src/doctor/runner.ts";
import { assertSpawnCapacity, liveSpawnCounts, spawnPolicyError } from "../src/commands/spawn/admission.ts";
import { SpawnRefusalError } from "../src/refusal.ts";
import { presenceAgentDir } from "../src/presence/writer.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { seedStatusInDir } from "./helpers/presence.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { agentViewFixture } from "./helpers/views.ts";
import type { AgentView } from "../src/types/store.ts";
import type { PresenceEntry } from "../src/types/presence.ts";

const dirs: string[] = [];
const oldOrchDir = process.env.ORCH_DIR;
let storeUnderTest = "";

/** `records()` seeds real status files, and where they land is whatever ORCH_DIR says.
 *  Every test gets its own store before it runs, so a test that never names one cannot
 *  write its fixtures into the live ~/.orch. */
beforeEach(() => {
  storeUnderTest = fs.mkdtempSync(path.join(os.tmpdir(), "orch-spawn-limits-"));
  dirs.push(storeUnderTest);
  process.env.ORCH_DIR = storeUnderTest;
});

function storeDir(): string {
  return storeUnderTest;
}

function presence(key: string, pid = process.pid): PresenceEntry {
  const dir = presenceAgentDir(key);
  seedStatusInDir(dir, { key, pid });
  return { key, dir, status: { schema: PRESENCE_SCHEMA, key, pid }, result: null, alive: pid === process.pid };
}

/** Both maps are keyed by the MINTED ID; presence joins to an agent by identity,
 *  never by the pane-bearing key. */
function records(entries: [string, string, number?, string?][]): { views: Map<string, AgentView>; presence: Map<string, PresenceEntry> } {
  const views = new Map<string, AgentView>();
  const live = new Map<string, PresenceEntry>();
  for (const [id, space, pid, spawnedBy] of entries) {
    views.set(id, agentViewFixture(id, {
      spawnedBy: spawnedBy ?? null,
      spawnedByName: spawnedBy ?? null,
      rootAgentId: spawnedBy ?? id,
      environment: { space },
    }));
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
    const dir = storeDir();
    writeSettingsFixture(dir, { fleet: { max_agents_total: 12, max_agents_per_space: { wD: 4 } } });
    expect(loadSettings(dir).fleet).toEqual({ max_agents_total: 12, max_agents_per_pack: 10, max_depth: 1, max_agents_per_space: { wD: 4 }, worker_peer_tools: false, cross_space: false });
  });

  test.each([0, -1, 1.5])("rejects invalid cap %s with file and key", (value) => {
    const dir = storeDir();
    writeSettingsFixture(dir, { fleet: { max_agents_total: value } });
    expect(() => loadSettings(dir)).toThrow(/settings\.json/);
    expect(() => loadSettings(dir)).toThrow(/fleet\.max_agents_total/);
  });

  test("omitted fleet caps normalize to defaults", () => {
    const dir = storeDir();
    writeSettingsFixture(dir);
    expect(loadSettings(dir).fleet).toEqual({ max_agents_total: undefined, max_agents_per_pack: 10, max_depth: 1, max_agents_per_space: {}, worker_peer_tools: false, cross_space: false });
  });

  test("global boundary refusal data counts the whole request", () => {
    const dir = storeDir();
    const data = records([["a", "wA"], ["b", "wB"], ["c", "wB"], ["d", "wC"], ["e", "wC"]]);
    expect([...liveSpawnCounts(data.views, data.presence).entries()]).toEqual([["wA", 1], ["wB", 2], ["wC", 2]]);
    writeSettingsFixture(dir, { fleet: { max_agents_total: 6 } });
    const settings = loadSettings(dir);
    expect(settings.fleet.max_agents_total).toBe(6);
    expect(capacityRefusal(settings, "wA", 2, data)).toBe("spawn refused: would put all spaces at 7/6 agents (5 live + 2 requested; fleet.max_agents_total)");
  });

  test("one workspace may use the full global allotment", () => {
    const dir = storeDir();
    writeSettingsFixture(dir, { fleet: { max_agents_total: 6 } });
    const settings = loadSettings(dir);
    const data = records([["a", "wD"], ["b", "wD"], ["c", "wD"]]);
    expect(liveSpawnCounts(data.views, data.presence).get("wD")).toBe(3);
    expect(() => assertSpawnCapacity(settings, "wD", 3, data.views, data.presence)).not.toThrow();
  });

  test("workspace cap is independent of global headroom", () => {
    const dir = storeDir();
    writeSettingsFixture(dir, { fleet: { max_agents_total: 12, max_agents_per_space: { wD: 4 } } });
    const settings = loadSettings(dir);
    const data = records([["a", "wD"], ["b", "wD"], ["c", "wD"]]);
    expect(capacityRefusal(settings, "wD", 2, data)).toBe("spawn refused: would put wD at 5/4 agents (3 live + 2 requested; fleet.max_agents_per_space.wD)");
  });

  test("uncapped space is bounded only by global count", () => {
    const dir = storeDir();
    writeSettingsFixture(dir, { fleet: { max_agents_total: 6 } });
    const settings = loadSettings(dir);
    const data = records([["a", "wD"], ["b", "wX"]]);
    expect(() => assertSpawnCapacity(settings, "wX", 4, data.views, data.presence)).not.toThrow();
    expect(capacityRefusal(settings, "wX", 5, data)).toBe("spawn refused: would put all spaces at 7/6 agents (2 live + 5 requested; fleet.max_agents_total)");
  });

  test("foreign pack members do not consume the caller's pack cap", () => {
    const data = records([
      ["root-child-1", "wD", undefined, "root"], ["root-child-2", "wD", undefined, "root"],
      ["root-child-3", "wD", undefined, "root"], ["root-child-4", "wD", undefined, "root"],
      ["root-child-5", "wD", undefined, "root"], ["root-child-6", "wD", undefined, "root"],
      ["root-child-7", "wD", undefined, "root"], ["root-child-8", "wD", undefined, "root"],
      ["foreign-1", "wD", undefined, "other-root"], ["foreign-2", "wD", undefined, "other-root"],
    ]);
    expect(spawnPolicyError({ fleet: { max_agents_per_pack: 10, max_depth: 1, max_agents_per_space: {}, worker_peer_tools: false, cross_space: false } }, "wD", 1, data.views, data.presence, "root")).toBeNull();
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
    const dir = storeDir();
    writeSettingsFixture(dir, { fleet: { max_agents_total: 4, max_agents_per_space: { wX: 8 } } });
    const result = (await runDoctor(dir)).find((entry) => entry.id === "spawn-limits")!;
    expect(result.status).toBe("warn");
    expect(result.fix).toBeUndefined();
    expect(result.detail).toContain("fleet.max_agents_per_space.wX");
    expect(result.detail).toContain("fleet.max_agents_total");
    expect(applyFixes([result])).toEqual({ applied: [] });
  });

  test("doctor accepts satisfiable limits", async () => {
    const dir = storeDir();
    writeSettingsFixture(dir, { fleet: { max_agents_total: 8, max_agents_per_space: { wX: 4 } } });
    expect((await runDoctor(dir)).find((entry) => entry.id === "spawn-limits")).toMatchObject({ status: "ok" });
  });
});
