import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { STORE_SCHEMA } from "../src/store/schema.ts";
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

function mismatch(dir: string, stamp = STORE_SCHEMA - 1): string {
  openStore(dir);
  closeAllStores();
  const path = join(dir, "orch.db");
  const database = new Database(path);
  database.exec(`PRAGMA user_version = ${stamp}`);
  database.close();
  return path;
}

describe("store schema guards", () => {
  test("a slave cannot recreate a mismatched store and leaves its bytes unchanged", () => {
    const dir = fixture();
    const path = mismatch(dir);
    const before = readFileSync(path);
    process.env.ORCH_AGENT_KEY = "herdr~w1~p1";

    expect(() => openStore(dir)).toThrow(/schema.*(mismatch|skew)|stamp/i);
    expect(() => openStore(dir)).toThrow(/rebuild|reinstall/i);
    expect(readFileSync(path)).toEqual(before);
    expect(existsSync(join(dir, "orch.db-wal"))).toBe(false);
  });

  test("refuses schema-mismatch recreation while any live presence exists", () => {
    const dir = fixture();
    const path = mismatch(dir);
    const before = readFileSync(path);
    const presenceDir = join(dir, "agents", "herdr~w1~p1");
    mkdirSync(presenceDir, { recursive: true });
    writeFileSync(join(presenceDir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, pid: process.pid, state: "working" }));
    delete process.env.ORCH_AGENT_KEY;

    expect(() => openStore(dir)).toThrow(/live presence/i);
    expect(readFileSync(path)).toEqual(before);
    expect(existsSync(join(dir, "orch.db-wal"))).toBe(false);
  });
});
