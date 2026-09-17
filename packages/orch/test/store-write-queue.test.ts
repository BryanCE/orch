import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { closeAllStores, orm, queueWrite, reportDrains, withTransaction, type DrainRecord } from "../src/store/connection.ts";
import { runs } from "../src/db/schema.ts";
import { selectRun, upsertRun } from "../src/store/run-rows.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";

const tempDirs: OrchDir[] = [];

afterEach(() => {
  closeAllStores();
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
  reportDrains((drain) => { void drain; });
});

function fixture(): OrchDir {
  const directory = tempOrchDir("orch-write-queue-");
  tempDirs.push(directory);
  return directory;
}

function run(dispatchId: string) {
  return {
    dispatchId,
    agentKey: "agent",
    state: "running",
    startedAt: 1,
  };
}

describe("store write queue", () => {
  test("reads a queued run in the same tick", () => {
    const directory = fixture();
    upsertRun(directory, run("same-tick"));
    expect(selectRun(directory, "same-tick")?.dispatchId).toBe("same-tick");
  });

  test("closeAllStores drains queued writes", () => {
    const directory = fixture();
    upsertRun(directory, run("before-close"));
    closeAllStores();
    expect(selectRun(directory, "before-close")?.dispatchId).toBe("before-close");
  });

  test("reports one record per queue drain", () => {
    const directory = fixture();
    const drains: DrainRecord[] = [];
    reportDrains((drain) => drains.push(drain));
    upsertRun(directory, run("first"));
    upsertRun(directory, run("second"));
    orm(directory);
    expect(drains).toHaveLength(1);
    expect(drains[0]?.rows).toBe(2);
    expect(drains[0]?.batched).toBe(true);
    expect(typeof drains[0]?.elapsedMs).toBe("number");
  });

  test("writes queued in a transaction are visible in its body", () => {
    const directory = fixture();
    withTransaction(directory, () => {
      queueWrite(directory, (db) => {
        db.insert(runs).values(run("transaction")).run();
      });
      expect(orm(directory).select().from(runs).where(eq(runs.dispatchId, "transaction")).get()?.dispatchId)
        .toBe("transaction");
    });
  });
});
