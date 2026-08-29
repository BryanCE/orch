import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore, closeAllStores } from "../src/store/connection.ts";
import { insertSpawnedRecord, selectSpawnedRecords, deleteSpawnedRecord, isSpawnedRow } from "../src/store/spawned-rows.ts";
import { setOwner, getOwner, deleteOwner } from "../src/store/ownership-rows.ts";
import { reapSpawnedRecord } from "../src/presence/store.ts";
import { removeDeadAgentDirs } from "../src/commands/clean.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { HeadlessBackend } from "../src/backends/headless/index.ts";
import type { AgentAdapter } from "../src/adapters/adapter.ts";
import type { SpawnedRecord } from "../src/store/spawned-rows.ts";

interface TableColumn {
  name: string;
}

const tempDirs: string[] = [];
const spawnedPids: number[] = [];
const oldOrchDir = process.env.ORCH_DIR;

function makeOrchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-store-spawned-"));
  tempDirs.push(dir);
  process.env.ORCH_DIR = dir;
  return dir;
}

function seedSpawnedRecord(dir: string, pane: string): void {
  deleteSpawnedRecord(dir, pane);
  insertSpawnedRecord(dir, { pane, backend: "headless", workspace: "local" });
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

describe("spawned and ownership store rows", () => {
  test("spawned-row guard rejects arrays", () => {
    expect(isSpawnedRow([])).toBe(false);
  });

  test("round-trips name and workspace through the public spawned seam", () => {
    const dir = makeOrchDir();
    insertSpawnedRecord(dir, { pane: "herdr~w1~a1", name: "recon-1", workspace: "w1" });
    const records = selectSpawnedRecords(dir);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ pane: "herdr~w1~a1", name: "recon-1", workspace: "w1" });
  });

  test("ownership table has no workspace column", () => {
    const dir = makeOrchDir();
    const columns = openStore(dir).query("PRAGMA table_info(ownership)").all() as TableColumn[];

    expect(columns.some((column) => column.name === "workspace")).toBe(false);
  });

  test("selectSpawnedRecords joins every row to its owner", () => {
    const dir = makeOrchDir();
    for (let index = 0; index < 20; index++) {
      const pane = `headless~local~worker-${index}`;
      seedSpawnedRecord(dir, pane);
      setOwner(dir, pane, `orch-${index}`);
    }

    const records = selectSpawnedRecords(dir);


    expect(records).toHaveLength(20);
    expect(records.every((record) => record.owner === `orch-${Number(record.pane.split("-").at(-1))}`)).toBe(true);
  });

  test("deleteOwner removes an ownership row", () => {
    const dir = makeOrchDir();
    setOwner(dir, "headless~local~worker", "orch-a");

    deleteOwner(dir, "headless~local~worker");

    expect(getOwner(dir, "headless~local~worker")).toBeUndefined();
  });

  test("reapSpawnedRecord removes the spawned and ownership rows", () => {
    const dir = makeOrchDir();
    const key = "headless~local~close-reap";
    seedSpawnedRecord(dir, key);
    setOwner(dir, key, "orch-close");

    reapSpawnedRecord(key);

    expect(selectSpawnedRecords(dir).some((record) => record.pane === key)).toBe(false);
    expect(getOwner(dir, key)).toBeUndefined();
  });

  test("removeDeadAgentDirs removes the spawned and ownership rows", () => {
    const dir = makeOrchDir();
    const key = "headless~local~clean-reap";
    seedStatus(dir, key, { pid: 99999999 });
    seedSpawnedRecord(dir, key);
    setOwner(dir, key, "orch-clean");

    expect(removeDeadAgentDirs(true)).toContain(`${key} (pid 99999999)`);
    expect(selectSpawnedRecords(dir).some((record) => record.pane === key)).toBe(false);
    expect(getOwner(dir, key)).toBeUndefined();
  });

  test("headless spawn records the spawned table and does not create spawned.jsonl", () => {
    const dir = makeOrchDir();
    const key = "headless~local~table-only";
    const adapter = {
      id: "pi",
      headlessCmd: () => [process.execPath, "-e", ""],
    } as unknown as AgentAdapter;
    const handle = new HeadlessBackend().spawn(adapter, { key, prompt: "work", orchDir: dir, cwd: dir });
    spawnedPids.push(handle.pid);

    expect(selectSpawnedRecords(dir)).toEqual([
      expect.objectContaining({ pane: key, backend: "headless", adapter: "pi" }) as unknown as SpawnedRecord,
    ]);
    expect(existsSync(join(dir, "spawned.jsonl"))).toBe(false);
  });
});
