import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, openStore } from "../src/store/connection.ts";
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
