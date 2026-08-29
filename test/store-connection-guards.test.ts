import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertStoreRecreatable, closeAllStores, openStore } from "../src/store/connection.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
const originalAgentKey = process.env.ORCH_AGENT_KEY;

afterEach(() => {
  closeAllStores();
  if (originalAgentKey === undefined) delete process.env.ORCH_AGENT_KEY;
  else process.env.ORCH_AGENT_KEY = originalAgentKey;
  while (dirs.length > 0) removeTempDir(dirs.pop()!);
});

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-store-guard-"));
  dirs.push(dir);
  return dir;
}

/** A store carrying orch's tables with no record of the migrations that create
 *  them — what every file written before orch adopted drizzle looks like. */
function unmigrated(dir: string): string {
  openStore(dir);
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

    expect(() => openStore(dir)).toThrow(/does not match orch's migrations/i);
    expect(() => openStore(dir)).toThrow(/db:reset/i);
    expect(readFileSync(path)).toEqual(before);
    expect(existsSync(join(dir, "orch.db-wal"))).toBe(false);
  });

  test("names live presence as the thing to close before rebuilding", () => {
    const dir = fixture();
    const path = unmigrated(dir);
    const before = readFileSync(path);
    const presenceDir = join(dir, "agents", "herdr~w1~p1");
    mkdirSync(presenceDir, { recursive: true });
    writeFileSync(join(presenceDir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, pid: process.pid, state: "working" }));

    expect(() => openStore(dir)).toThrow(/live agents/i);
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

function seedLivePresence(dir: string, key: string, pid: number): void {
  const presenceDir = join(dir, "agents", key);
  mkdirSync(presenceDir, { recursive: true });
  writeFileSync(join(presenceDir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, pid, state: "working" }));
}

describe("a slave never reaps or recreates the store", () => {
  test("a spawned agent hitting a schema-mismatched store errors and mutates nothing", () => {
    const dir = fixture();
    const path = unmigrated(dir);
    const before = readFileSync(path);
    process.env.ORCH_AGENT_KEY = "herdr~w1~agent-1";

    const message = refusalMessage(() => openStore(dir));

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
    openStore(dir);
    closeAllStores();
    seedLivePresence(dir, "herdr~w1~p1", process.pid);

    // No ORCH_AGENT_KEY: this is the user, and the living agent's identity is
    // still not collateral.
    const message = refusalMessage(() => assertStoreRecreatable(dir));

    expect(message).toMatch(/live/i);
    expect(message).toContain("herdr~w1~p1");
  });

  test("the user may recreate once nothing is live", () => {
    const dir = fixture();
    openStore(dir);
    closeAllStores();
    seedLivePresence(dir, "herdr~w1~dead", 999999);

    expect(() => assertStoreRecreatable(dir)).not.toThrow();
  });

  test("a spawned agent is refused a recreate even with nothing live", () => {
    const dir = fixture();
    openStore(dir);
    closeAllStores();
    process.env.ORCH_AGENT_KEY = "herdr~w1~agent-1";

    expect(refusalMessage(() => assertStoreRecreatable(dir))).toMatch(/spawned agent/i);
  });
});
