import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { loadConfig } from "../src/config.ts";
import { runDoctor, applyFixes } from "../src/doctor/runner.ts";
import { assertSpawnCapacity, liveSpawnCounts, spawnPolicyError } from "../src/commands/spawn.ts";
import { presenceAgentDir, type PresenceEntry } from "../src/presence/store.ts";
import type { SpawnedRecord } from "../src/store/spawned-rows.ts";
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
  seedStatusInDir(dir, { key, pid });
  return { key, dir, status: { schema: PRESENCE_SCHEMA, key, pid }, result: null, alive: pid === process.pid };
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

function capacityRefusal(
  settings: Parameters<typeof assertSpawnCapacity>[0],
  workspace: string,
  requested: number,
  data: { records: Map<string, SpawnedRecord>; presence: Map<string, PresenceEntry> },
): string {
  const originalExit = process.exit.bind(process);
  const originalWrite = process.stderr.write.bind(process.stderr);
  let stderr = "";
  function stderrWrite(chunk: string | Uint8Array, _callback?: (error: Error | null | undefined) => void): boolean;
  function stderrWrite(chunk: string | Uint8Array, _encoding: BufferEncoding, _callback?: (error: Error | null | undefined) => void): boolean;
  function stderrWrite(chunk: string | Uint8Array): boolean {
    stderr += String(chunk);
    return true;
  }
  process.stderr.write = stderrWrite;
  process.exit = (code?: number): never => { throw new Error(`exit ${code ?? 0}`); };
  try {
    assertSpawnCapacity(settings, workspace, requested, data.records, data.presence);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("exit ")) return stderr;
    throw error;
  } finally {
    process.exit = originalExit;
    process.stderr.write = originalWrite;
  }
  throw new Error("expected spawn capacity refusal");
}

describe("spawn limits", () => {
  test("schema loads global and workspace caps", () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { fleet: { max_agents: 12, workspace_caps: { wD: 4 } } });
    expect(loadConfig(dir).fleet).toEqual({ spawn_cap: 8, max_agents: 12, pack_cap: 10, workspace_caps: { wD: 4 }, worker_peer_tools: false, cross_workspace: false });
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
    expect(loadConfig(dir).fleet).toEqual({ spawn_cap: 8, max_agents: undefined, pack_cap: 10, workspace_caps: {}, worker_peer_tools: false, cross_workspace: false });
  });

  test("global boundary refusal data counts the whole request", () => {
    const dir = tempDir();
    const data = records([["a", "wA"], ["b", "wB"], ["c", "wB"], ["d", "wC"], ["e", "wC"]]);
    expect([...liveSpawnCounts(data.records, data.presence).entries()]).toEqual([["wA", 1], ["wB", 2], ["wC", 2]]);
    writeSettingsFixture(dir, { fleet: { max_agents: 6 } });
    const settings = loadConfig(dir);
    expect(settings.fleet.max_agents).toBe(6);
    expect(capacityRefusal(settings, "wA", 2, data)).toBe("spawn refused: would put all workspaces at 7/6 agents (5 live + 2 requested; fleet.max_agents)\n");
  });

  test("one workspace may use the full global allotment", () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { fleet: { max_agents: 6 } });
    const settings = loadConfig(dir);
    const data = records([["a", "wD"], ["b", "wD"], ["c", "wD"]]);
    expect(liveSpawnCounts(data.records, data.presence).get("wD")).toBe(3);
    expect(() => assertSpawnCapacity(settings, "wD", 3, data.records, data.presence)).not.toThrow();
  });

  test("workspace cap is independent of global headroom", () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { fleet: { max_agents: 12, workspace_caps: { wD: 4 } } });
    const settings = loadConfig(dir);
    const data = records([["a", "wD"], ["b", "wD"], ["c", "wD"]]);
    expect(capacityRefusal(settings, "wD", 2, data)).toBe("spawn refused: would put wD at 5/4 agents (3 live + 2 requested; fleet.workspace_caps.wD)\n");
  });

  test("uncapped workspace is bounded only by global count", () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { fleet: { max_agents: 6 } });
    const settings = loadConfig(dir);
    const data = records([["a", "wD"], ["b", "wX"]]);
    expect(() => assertSpawnCapacity(settings, "wX", 4, data.records, data.presence)).not.toThrow();
    expect(capacityRefusal(settings, "wX", 5, data)).toBe("spawn refused: would put all workspaces at 7/6 agents (2 live + 5 requested; fleet.max_agents)\n");
  });

  test("foreign pack members do not consume the caller's pack cap", () => {
    const data = records([
      ["root-child-1", "wD"], ["root-child-2", "wD"], ["root-child-3", "wD"], ["root-child-4", "wD"],
      ["root-child-5", "wD"], ["root-child-6", "wD"], ["root-child-7", "wD"], ["root-child-8", "wD"],
      ["foreign-1", "wD"], ["foreign-2", "wD"],
    ]);
    for (const key of ["root-child-1", "root-child-2", "root-child-3", "root-child-4", "root-child-5", "root-child-6", "root-child-7", "root-child-8"])
      data.records.get(key)!.spawnedBy = "root";
    data.records.get("foreign-1")!.spawnedBy = "other-root";
    data.records.get("foreign-2")!.spawnedBy = "other-root";
    expect(spawnPolicyError({ fleet: { pack_cap: 10, workspace_caps: {}, worker_peer_tools: false, cross_workspace: false, spawn_cap: 8 } }, "wD", 1, data.records, data.presence, "root")).toBeNull();
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
