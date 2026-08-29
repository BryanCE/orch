import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore, closeAllStores } from "../src/store/connection.ts";
import { recordSpawned, reapSpawnedRecord } from "../src/presence/store.ts";
import { agentView, agentViews, holderOf, liveAgentViews } from "../src/store/agent-view.ts";
import { removeDeadAgentDirs } from "../src/commands/clean.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { HeadlessBackend } from "../src/backends/headless/index.ts";
import { fakeAdapter } from "./helpers/adapter.ts";

const tempDirs: string[] = [];
const spawnedPids: number[] = [];
const oldOrchDir = process.env.ORCH_DIR;

function makeOrchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-store-spawned-"));
  tempDirs.push(dir);
  process.env.ORCH_DIR = dir;
  return dir;
}

afterEach(() => {
  for (const pid of spawnedPids.splice(0)) {
    try { process.kill(pid, "SIGTERM"); } catch {}
  }
  closeAllStores();
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldOrchDir;
});

// A1: the wide `spawned` row is gone. Its primary key was the PANE, so moving an
// agent minted a new identity; every fact it welded now lives in the table that
// owns it and is read back only through the composer.
describe("the agent store replaces the spawned row", () => {
  test("records the four facts apart and composes them back together", () => {
    const dir = makeOrchDir();
    recordSpawned("aaaaaaaaa1", {
      adapter: "pi", backend: "headless", space: "w1", handle: "handle-1",
      name: "recon-1", cwd: dir, model: "openai/gpt-5.6", owner: "bbbbbbbbb1",
    });

    expect(agentView(dir, "aaaaaaaaa1")).toMatchObject({
      id: "aaaaaaaaa1",
      name: "recon-1",
      harnessId: "pi",
      cwd: dir,
      environment: { plexer: "headless", space: "w1", handle: "handle-1", worktree: null, branch: null },
      tuning: { model: "openai/gpt-5.6" },
      endedAt: null,
    });
    expect(holderOf(dir, "aaaaaaaaa1")?.orchId).toBe("bbbbbbbbb1");
  });

  test("moving an agent between plexer handles keeps its identity", () => {
    const dir = makeOrchDir();
    recordSpawned("aaaaaaaaa1", { adapter: "pi", backend: "headless", handle: "first" });
    recordSpawned("aaaaaaaaa1", { handle: "second" });

    expect(agentViews(dir).map((view) => view.id)).toEqual(["aaaaaaaaa1"]);
    expect(agentView(dir, "aaaaaaaaa1")?.environment.handle).toBe("second");
  });

  test("an agent with no handle is still an agent, just without a shortcut", () => {
    const dir = makeOrchDir();
    recordSpawned("aaaaaaaaa1", { adapter: "pi" });

    expect(agentView(dir, "aaaaaaaaa1")?.environment).toMatchObject({ plexer: null, handle: null, space: null });
    expect(liveAgentViews(dir).map((view) => view.id)).toEqual(["aaaaaaaaa1"]);
  });

  test("a key that is not a minted identity registers nothing", () => {
    const dir = makeOrchDir();
    recordSpawned("headless~local~worker", { adapter: "pi", backend: "headless" });

    expect(agentViews(dir)).toEqual([]);
  });

  test("reapSpawnedRecord removes the agent and every fact hanging off it", () => {
    const dir = makeOrchDir();
    const key = "aaaaaaaaa1";
    recordSpawned(key, { adapter: "pi", backend: "headless", space: "local", handle: "h", owner: "bbbbbbbbb1" });
    seedStatus(dir, key, { pid: 99999999 });

    reapSpawnedRecord(key);

    expect(agentView(dir, key)).toBeNull();
    expect(openStore(dir).query("SELECT COUNT(*) AS n FROM agent_leases WHERE agent_id = ?").get(key)).toEqual({ n: 0 });
    expect(openStore(dir).query("SELECT COUNT(*) AS n FROM agent_handles WHERE agent_id = ?").get(key)).toEqual({ n: 0 });
    expect(existsSync(join(dir, "agents", key))).toBe(false);
  });

  test("removeDeadAgentDirs reaps the agent behind a dead presence dir", () => {
    const dir = makeOrchDir();
    const key = "aaaaaaaaa2";
    seedStatus(dir, key, { pid: 99999999 });
    recordSpawned(key, { adapter: "pi", backend: "headless", space: "local", owner: "bbbbbbbbb1" });

    expect(removeDeadAgentDirs(true)).toContain(`${key} (pid 99999999)`);
    expect(agentView(dir, key)).toBeNull();
  });

  test("headless spawn registers the agent hub and never writes spawned.jsonl", () => {
    const dir = makeOrchDir();
    const key = "aaaaaaaaa3";
    const adapter = fakeAdapter({ headlessCmd: () => [process.execPath, "-e", ""] });
    const handle = new HeadlessBackend().spawn(adapter, { key, prompt: "work", orchDir: dir, cwd: dir });
    spawnedPids.push(handle.pid);

    expect(agentView(dir, key)).toMatchObject({
      id: key,
      harnessId: "pi",
      environment: { plexer: "headless", handle: JSON.stringify({ pid: handle.pid, key }) },
    });
    expect(existsSync(join(dir, "spawned.jsonl"))).toBe(false);
  });
});
