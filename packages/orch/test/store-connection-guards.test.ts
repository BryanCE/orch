import { afterEach, describe, expect, test } from "bun:test";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { HARNESS_SESSION_ENV } from "../src/adapters/session-env.ts";
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { claimAgent } from "../src/store/agent-rows.ts";
import { assertStoreRecreatable, closeAllStores, orm } from "../src/store/connection.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedAgent } from "./helpers/agent.ts";

const dirs: string[] = [];
const originalOrchDir = process.env.ORCH_DIR;
const originalAgentKey = process.env[LAUNCH_ENV];
const originalHarnessMarker = process.env[HARNESS_SESSION_ENV.pi.marker];
const originalSessionId = process.env[HARNESS_SESSION_ENV.pi.sessionId];
const SPAWNED_SESSION_TOKEN = "store-guard-session";

/** A1: `launch env` carries a minted agent id and nothing else. */
const SPAWNED_AGENT_KEY = "s3p4wn3d01";

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

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-store-guard-"));
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  return dir;
}

/** A store carrying orch's tables with no record of the migrations that create
 *  them — what every file written before orch adopted drizzle looks like. */
function unmigrated(dir: string): string {
  orm(dir);
  closeAllStores();
  const path = join(dir, "orch.db");
  const database = new Database(path);
  database.exec("DROP TABLE __drizzle_migrations");
  database.close();
  return path;
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
    const before = readFileSync(path);
    // The guard asks only whether a presence record is LIVE, never what shape
    // its directory name has, so this fixture keeps a name orch would never
    // mint: a directory on disk can be called anything, and the refusal has to
    // survive one that is.
    const presenceDir = join(dir, "agents", "herdr~w1~p1");
    mkdirSync(presenceDir, { recursive: true });
    writeFileSync(join(presenceDir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, pid: process.pid, state: "working" }));

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

function claimSpawnedAgent(dir: string): void {
  seedAgent(SPAWNED_AGENT_KEY, { adapter: "pi" }, dir);
  const result = claimAgent(dir, SPAWNED_AGENT_KEY, SPAWNED_SESSION_TOKEN, 1);
  if (result.kind !== "stamped") throw new Error(`failed to claim fixture agent: ${result.kind}`);
}

function exportSpawnedIdentity(): void {
  process.env[LAUNCH_ENV] = SPAWNED_AGENT_KEY;
  process.env[HARNESS_SESSION_ENV.pi.marker] = "1";
  process.env[HARNESS_SESSION_ENV.pi.sessionId] = SPAWNED_SESSION_TOKEN;
}

function seedLivePresence(dir: string, key: string, pid: number): void {
  const presenceDir = join(dir, "agents", key);
  mkdirSync(presenceDir, { recursive: true });
  writeFileSync(join(presenceDir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, pid, state: "working" }));
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

  test("a recreate is refused while a live presence dir exists, for the user too", () => {
    const dir = fixture();
    orm(dir);
    closeAllStores();
    // Deliberately not a minted id: the refusal names whatever directory it
    // found, and must not silently skip one whose name it cannot parse.
    seedLivePresence(dir, "herdr~w1~p1", process.pid);

    // No [LAUNCH_ENV]: this is the user, and the living agent's identity is
    // still not collateral.
    const message = refusalMessage(() => assertStoreRecreatable(dir));

    expect(message).toMatch(/live/i);
    expect(message).toContain("herdr~w1~p1");
  });

  test("the user may recreate once nothing is live", () => {
    const dir = fixture();
    orm(dir);
    closeAllStores();
    // Same unparseable directory name, dead pid: still not a live holder.
    seedLivePresence(dir, "herdr~w1~dead", 999999);

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
