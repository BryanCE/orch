import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { HARNESS_SESSION_ENV } from "../src/adapters/session-env.ts";
import { Database } from "bun:sqlite";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { claimAgent, ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { assertStoreRecreatable, closeAllStores, orm } from "../src/store/connection.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { seedAgent, seedLiveProcess } from "./helpers/agent.ts";

import type { OrchDir } from "../src/types/core.ts";
const dirs: OrchDir[] = [];
const originalOrchDir = process.env.ORCH_DIR;
const originalAgentKey = process.env[LAUNCH_ENV];
const originalHarnessMarker = process.env[HARNESS_SESSION_ENV.pi.marker];
const originalSessionId = process.env[HARNESS_SESSION_ENV.pi.sessionId];
const SPAWNED_SESSION_TOKEN = "store-guard-session";

/** A1: `launch env` carries a minted agent id and nothing else. */
const SPAWNED_AGENT_KEY = "s3p4wn3d01";

beforeEach(() => {
  // Every test starts as the user; the spawned-agent tests set the credential themselves.
  delete process.env[LAUNCH_ENV];
});

afterEach(() => {
  closeAllStores();
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  if (originalAgentKey === undefined) delete process.env[LAUNCH_ENV];
  else process.env[LAUNCH_ENV] = originalAgentKey;
  if (originalHarnessMarker === undefined) delete process.env[HARNESS_SESSION_ENV.pi.marker];
  else process.env[HARNESS_SESSION_ENV.pi.marker] = originalHarnessMarker;
  if (originalSessionId === undefined) delete process.env[HARNESS_SESSION_ENV.pi.sessionId];
  else process.env[HARNESS_SESSION_ENV.pi.sessionId] = originalSessionId;
  while (dirs.length > 0) removeTempDir(dirs.pop()!);
});

function fixture(): OrchDir {
  const dir = tempOrchDir("orch-store-guard-");
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  return dir;
}

/** A store carrying orch's tables with no record of the migrations that create
 *  them — what every file written before orch adopted drizzle looks like. */
function unmigrated(dir: OrchDir): string {
  orm(dir);
  closeAllStores();
  const path = join(dir, "orch.db");
  const database = new Database(path);
  database.exec("DROP TABLE __drizzle_migrations");
  database.close();
  return path;
}

function seedUnmigratedLiveProcess(path: string): void {
  const database = new Database(path);
  database.exec("INSERT INTO harnesses(id,name) VALUES ('pi','pi')");
  database.exec("INSERT INTO hosts(id,name,os,created_at) VALUES ('test-host','test-host','linux',1)");
  database.exec("INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES ('herdr~w1~p1','herdr~w1~p1','pi','/tmp','herdr~w1~p1',1)");
  database.exec(`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES ('herdr~w1~p1',1,'test-host',${process.pid},NULL)`);
  database.close();
}

describe("store migration guards", () => {
  test("a store predating the migrations is refused, not rebuilt over", () => {
    const dir = fixture();
    const path = unmigrated(dir);
    const before = readFileSync(path);

    expect(() => orm(dir)).toThrow(/does not match orch's migrations/i);
    expect(() => orm(dir)).toThrow(/db:reset/i);
    expect(readFileSync(path)).toEqual(before);
    expect(existsSync(join(dir, "orch.db-wal"))).toBe(false);
  });

  test("names live presence as the thing to close before rebuilding", () => {
    const dir = fixture();
    const path = unmigrated(dir);
    seedUnmigratedLiveProcess(path);
    const before = readFileSync(path);

    expect(() => orm(dir)).toThrow(/live agents/i);
    expect(readFileSync(path)).toEqual(before);
    expect(existsSync(join(dir, "orch.db-wal"))).toBe(false);
  });
});

/** The message a refusal carried, so a test can assert what it named AND what it
 *  did not — a remedy handed to the wrong caller is the defect H10 records. */
function refusalMessage(body: () => unknown): string {
  try {
    body();
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected a refusal, got none");
}

function claimSpawnedAgent(dir: OrchDir): void {
  seedAgent(SPAWNED_AGENT_KEY, { adapter: "pi" }, dir);
  const result = claimAgent(dir, SPAWNED_AGENT_KEY, SPAWNED_SESSION_TOKEN, 1);
  if (result.kind !== "stamped") throw new Error(`failed to claim fixture agent: ${result.kind}`);
}

function exportSpawnedIdentity(): void {
  process.env[LAUNCH_ENV] = SPAWNED_AGENT_KEY;
  process.env[HARNESS_SESSION_ENV.pi.marker] = "1";
  process.env[HARNESS_SESSION_ENV.pi.sessionId] = SPAWNED_SESSION_TOKEN;
}

describe("a slave never reaps or recreates the store", () => {
  test("a spawned agent hitting a schema-mismatched store errors and mutates nothing", () => {
    const dir = fixture();
    claimSpawnedAgent(dir);
    const path = unmigrated(dir);
    const before = readFileSync(path);
    exportSpawnedIdentity();

    const message = refusalMessage(() => orm(dir));

    // The skew, named.
    expect(message).toContain("does not match orch's migrations");
    // The fix, addressed to whoever may actually apply it - never a rebuild
    // instruction handed to the agent that must not run one.
    expect(message).toMatch(/spawned agent/i);
    expect(message).not.toContain("db:reset");
    expect(readFileSync(path)).toEqual(before);
    expect(existsSync(join(dir, "orch.db-wal"))).toBe(false);
  });

  test("a recreate is refused while a live worker exists, for the user too", () => {
    const dir = fixture();
    orm(dir);
    closeAllStores();
    // Deliberately not a minted id: the refusal names whatever id it found.
    ensureHarness(dir, "pi", "pi", 1);
    insertAgent(dir, { id: "herdr~spawner~p0", harnessId: "pi", cwd: process.cwd(), name: "herdr~spawner~p0", createdAt: 1 });
    insertAgent(dir, { id: "herdr~w1~p1", harnessId: "pi", cwd: process.cwd(), name: "herdr~w1~p1", createdAt: 1, spawnedBy: "herdr~spawner~p0" });
    seedLiveProcess(dir, "herdr~w1~p1");

    // No [LAUNCH_ENV]: this is the user, and the living agent's identity is
    // still not collateral.
    const message = refusalMessage(() => assertStoreRecreatable(dir));

    expect(message).toMatch(/live/i);
    expect(message).toContain("worker");
    expect(message).toContain("herdr~w1~p1");
  });

  test("a live driving session is refused without --with-sessions and allowed with it", () => {
    const dir = fixture();
    orm(dir);
    closeAllStores();
    ensureHarness(dir, "pi", "pi", 1);
    insertAgent(dir, { id: "herdr~w1~p1", harnessId: "pi", cwd: process.cwd(), name: "herdr~w1~p1", createdAt: 1 });
    seedLiveProcess(dir, "herdr~w1~p1");

    const message = refusalMessage(() => assertStoreRecreatable(dir));

    expect(message).toContain("driving session");
    expect(message).toContain("--with-sessions");
    expect(message).toContain("herdr~w1~p1");
    expect(() => assertStoreRecreatable(dir, { withSessions: true })).not.toThrow();
  });

  test("the user may recreate once nothing is live", () => {
    const dir = fixture();
    orm(dir);
    closeAllStores();
    // Same unparseable id, dead pid: still not a live holder.
    seedAgent("herdr~w1~dead", { adapter: "pi" }, dir);

    expect(() => assertStoreRecreatable(dir)).not.toThrow();
  });

  test("a spawned agent is refused a recreate even with nothing live", () => {
    const dir = fixture();
    claimSpawnedAgent(dir);
    closeAllStores();
    exportSpawnedIdentity();

    expect(refusalMessage(() => assertStoreRecreatable(dir))).toMatch(/spawned agent/i);
  });
});
