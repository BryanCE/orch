import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTask, listTasks, nextQueuedTask } from "../src/queue.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

describe("queue replay keeps typed scope", () => {
  test("stored scope offers pack work only to that pack", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-queue-replay-")); dirs.push(dir);
    const db = orm(dir);
    db.run(sql`INSERT INTO harnesses(id,name) VALUES ('pi','Pi')`);
    for (const [id, root, parent] of [["a","a",null],["a1","a","a"],["b","b",null]] as const) {
      db.run(sql`INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES (${id},${parent},${root},${"pi"},${"/tmp"},${id},1)`);
    }
    const task = addTask(dir, "do x", {}, "a");
    expect(listTasks(dir)[0]?.scopePackId).toBe("a");
    expect(nextQueuedTask(dir, "a1", 1)?.id).toBe(task.id);
    expect(nextQueuedTask(dir, "b", 1)).toBeUndefined();
  });
});
