import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";



import { addTask, listTasks, nextQueuedTask } from "../src/queue.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { seedAgentRow } from "./helpers/agent.ts";
import { sql } from "drizzle-orm";

const dirs: OrchDir[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

describe("queue replay keeps typed scope", () => {
  test("stored scope offers pack work only to that pack", () => {
    const dir = tempOrchDir("orch-queue-replay-"); dirs.push(dir);
    const db = orm(dir);
    db.run(sql`INSERT INTO harnesses(id,name) VALUES ('pi','Pi')`);
    for (const [id, parent] of [["a",null],["a1","a"],["b",null]] as const) {
      seedAgentRow(dir, { id, spawnedBy: parent, cwd: "/tmp", createdAt: 1 });
    }
    const task = addTask(dir, "do x", {}, "a");
    expect(listTasks(dir)[0]?.scopePackId).toBe("a");
    expect(nextQueuedTask(dir, "a1", 1)?.id).toBe(task.id);
    expect(nextQueuedTask(dir, "b", 1)).toBeUndefined();
  });
});
