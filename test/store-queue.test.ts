import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { addTask, claimTask, listTasks, recordTaskDone, recordTaskFailure } from "../src/queue.ts";
import { deleteSettledTasksBefore } from "../src/store/task-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });
function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-store-tasks-")); dirs.push(dir);
  const db = openStore(dir);
  db.query("INSERT INTO harnesses(id,name) VALUES ('pi','Pi')").run();
  db.query("INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES ('a','a','pi','/tmp','a',1)").run();
  return dir;
}

describe("queue facade storage", () => {
  test("state is derived from attempts rather than stored on tasks", () => {
    const dir = fixture();
    const task = addTask(dir, "x", {}, "a");
    expect(openStore(dir).query("PRAGMA table_info(tasks)").all()).not.toContainEqual(expect.objectContaining({ name: "state" }));
    expect(claimTask(dir, task.id, "a", "d")).toBe(true);
    expect(listTasks(dir)[0]?.state).toBe("claimed");
    recordTaskDone(dir, task.id, { ok: true });
    expect(listTasks(dir)[0]).toMatchObject({ state: "done", attempts: [expect.objectContaining({ result: { ok: true } })] });
  });

  test("retention deletes only settled tasks older than the cutoff", () => {
    const dir = fixture();
    const old = addTask(dir, "old", {}, "a");
    claimTask(dir, old.id, "a", "old");
    recordTaskFailure(dir, old.id, "no");
    const queued = addTask(dir, "queued", {}, "a");
    const settled = openStore(dir).query("SELECT until FROM task_attempts WHERE task_id=?").get(old.id) as { until: number };
    expect(deleteSettledTasksBefore(dir, settled.until + 1)).toBe(1);
    expect(listTasks(dir).map((task) => task.id)).toEqual([queued.id]);
  });
});
