import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { currentLease } from "../src/store/lease-rows.ts";
import { currentHandle, currentTuning } from "../src/store/interval-rows.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-spawn-registry-"));
  dirs.push(dir);
  ensureHarness(dir, "pi", "pi", 1);
  insertAgent(dir, { id: "orch-agent", harnessId: "pi", cwd: "/repo", name: "orch", createdAt: 1 });
  return dir;
}

function register(dir: string, overrides: Partial<Parameters<typeof registerSpawnedAgent>[1]> = {}): string {
  const key = "herdr~wF~worker0001";
  registerSpawnedAgent(dir, {
    key,
    harnessId: "pi",
    backendId: "herdr",
    pane: true,
    handle: "%42",
    cwd: "/repo",
    name: "worker-1",
    model: "openai/gpt-5:high",
    spawner: "orch-agent",
    now: 10,
    ...overrides,
  });
  return key;
}

describe("spawn agent registration", () => {
  test("writes the hub, environment, tuning, and lease", () => {
    const dir = fixture();
    register(dir);
    expect(openStore(dir).query("SELECT id, spawned_by, root_agent_id, harness_id, cwd, name FROM agents WHERE id = ?").get("worker0001"))
      .toEqual({ id: "worker0001", spawned_by: "orch-agent", root_agent_id: "orch-agent", harness_id: "pi", cwd: "/repo", name: "worker-1" });
    expect(openStore(dir).query("SELECT plexer_id FROM agent_plexers WHERE agent_id = ?").get("worker0001")).toEqual({ plexer_id: "herdr" });
    expect(currentHandle(dir, "worker0001")).toMatchObject({ handle: "%42", since: 10, until: null });
    expect(currentTuning(dir, "worker0001")).toMatchObject({ model: "openai/gpt-5", thinking: "high", since: 10, until: null });
    expect(currentLease(dir, "worker0001")).toMatchObject({ agentId: "worker0001", orchId: "orch-agent", since: 10, until: null });
  });

  test("headless writes no plexer or handle row", () => {
    const dir = fixture();
    register(dir, { key: "headless~local~worker0002", backendId: "headless", pane: false, handle: undefined });
    expect(openStore(dir).query("SELECT * FROM agent_plexers WHERE agent_id = ?").get("worker0002")).toBeNull();
    expect(currentHandle(dir, "worker0002")).toBeNull();
  });

  test("worktree row is present only for a worktree launch", () => {
    const dir = fixture();
    register(dir, { worktree: { path: "/trees/worker", branch: "orch/worker" } });
    expect(openStore(dir).query("SELECT path, branch FROM agent_worktrees WHERE agent_id = ?").get("worker0001"))
      .toEqual({ path: "/trees/worker", branch: "orch/worker" });

    register(dir, { key: "herdr~wF~worker0002", name: "worker-2", spawner: null });
    expect(openStore(dir).query("SELECT * FROM agent_worktrees WHERE agent_id = ?").get("worker0002")).toBeNull();
  });

  test("an unknown or absent spawner produces a root pack of one and no lease", () => {
    const dir = fixture();
    register(dir, { spawner: "not-registered" });
    expect(openStore(dir).query("SELECT spawned_by, root_agent_id FROM agents WHERE id = ?").get("worker0001"))
      .toEqual({ spawned_by: null, root_agent_id: "worker0001" });
    expect(currentLease(dir, "worker0001")).toBeNull();
  });
});
