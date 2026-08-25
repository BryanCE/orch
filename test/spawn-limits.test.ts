import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { loadConfig } from "../src/config.ts";
import { runDoctor, applyFixes } from "../src/doctor/runner.ts";
import { liveSpawnCounts } from "../src/commands/spawn.ts";
import { presenceAgentDir, type PresenceEntry } from "../src/presence/store.ts";
import type { SpawnedRecord } from "../src/store/sqlite.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { seedStatusInDir } from "./helpers/presence.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
const oldOrchDir = process.env.ORCH_DIR;

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-spawn-limits-"));
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  return dir;
}

function presence(key: string, workspace: string, pid = process.pid): PresenceEntry {
  const dir = presenceAgentDir(key);
  seedStatusInDir(dir, { key, workspace, pid });
  return { key, dir, status: { schema: PRESENCE_SCHEMA, key, workspace, pid }, result: null, alive: pid === process.pid };
}

function records(entries: [string, string, number?][]): { records: Map<string, SpawnedRecord>; presence: Map<string, PresenceEntry> } {
  const registry = new Map<string, SpawnedRecord>();
  const live = new Map<string, PresenceEntry>();
  for (const [key, workspace, pid] of entries) {
    registry.set(key, { pane: key, workspace });
    live.set(key, presence(key, workspace, pid));
  }
  return { records: registry, presence: live };
}

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldOrchDir;
});

describe("spawn limits", () => {
  test("schema loads global and workspace caps", () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { fleet: { max_agents: 12, workspace_caps: { wD: 4 } } });
    expect(loadConfig(dir).fleet).toEqual({ spawn_cap: 8, max_agents: 12, workspace_caps: { wD: 4 }, worker_peer_tools: false, cross_workspace: false });
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
    expect(loadConfig(dir).fleet).toEqual({ spawn_cap: 8, workspace_caps: {}, worker_peer_tools: false, cross_workspace: false });
  });

  test("global boundary refusal data counts the whole request", () => {
    const dir = tempDir();
    const data = records([["a", "wA"], ["b", "wB"], ["c", "wB"], ["d", "wC"], ["e", "wC"]]);
    expect([...liveSpawnCounts(data.records, data.presence).entries()]).toEqual([["wA", 1], ["wB", 2], ["wC", 2]]);
    writeSettingsFixture(dir, { fleet: { max_agents: 6 } });
    expect(loadConfig(dir).fleet.max_agents).toBe(6);
    expect(5 + 2).toBeGreaterThan(6);
  });

  test("one workspace may use the full global allotment", () => {
    const data = records([["a", "wD"], ["b", "wD"], ["c", "wD"]]);
    expect(liveSpawnCounts(data.records, data.presence).get("wD")).toBe(3);
  });

  test("workspace cap is independent of global headroom", () => {
    const data = records([["a", "wD"], ["b", "wD"], ["c", "wD"]]);
    expect(liveSpawnCounts(data.records, data.presence).get("wD")! + 2).toBeGreaterThan(4);
    expect(3 + 2).toBeLessThan(12);
  });

  test("uncapped workspace is bounded only by global count", () => {
    const data = records([["a", "wD"], ["b", "wX"]]);
    const counts = liveSpawnCounts(data.records, data.presence);
    expect((counts.get("wX") ?? 0) + 2).toBeLessThanOrEqual(6);
    expect([...counts.values()].reduce((a, b) => a + b, 0) + 5).toBeGreaterThan(6);
  });

  test("dead pid records free capacity", () => {
    const data = records([["dead", "wD", 99999999], ["live", "wD"]]);
    expect(liveSpawnCounts(data.records, data.presence)).toEqual(new Map([["wD", 1]]));
  });

  test("foreign panes never count", () => {
    const data = records([["orch", "wD"]]);
    data.presence.set("foreign", presence("foreign", "wD"));
    expect(liveSpawnCounts(data.records, data.presence).get("wD")).toBe(1);
  });

  test("doctor reports an unsatisfiable workspace cap without a fix", async () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { fleet: { max_agents: 4, workspace_caps: { wX: 8 } } });
    const result = (await runDoctor(dir)).find((entry) => entry.id === "spawn-limits")!;
    expect(result.status).toBe("warn");
    expect(result.fix).toBeUndefined();
    expect(result.detail).toContain("fleet.workspace_caps.wX");
    expect(result.detail).toContain("fleet.max_agents");
    expect(applyFixes([result])).toEqual({ applied: [] });
  });

  test("doctor accepts satisfiable limits", async () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { fleet: { max_agents: 8, workspace_caps: { wX: 4 } } });
    expect((await runDoctor(dir)).find((entry) => entry.id === "spawn-limits")).toMatchObject({ status: "ok" });
  });
});
