import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { addTask, claimTask, listTasks, recordTaskDone, recordTaskFailure } from "../src/queue.ts";
import { deleteSettledTasksBefore } from "../src/store/task-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

import { row } from "./helpers/rows.ts";
const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });
function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-store-tasks-")); dirs.push(dir);
  const db = orm(dir);
  db.run(sql`INSERT INTO harnesses(id,name) VALUES ('pi','Pi')`);
  db.run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES ('a','a','pi','/tmp','a',1)`);
  return dir;
}

describe("queue facade storage", () => {
  test("state is derived from attempts rather than stored on tasks", () => {
    const dir = fixture();
    const task = addTask(dir, "x", {}, "a");
    expect(orm(dir).all(sql`PRAGMA table_info(tasks)`)).not.toContainEqual(expect.objectContaining({ name: "state" }));
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
    const settled = row(orm(dir), sql`SELECT until FROM task_attempts WHERE task_id=${old.id}`) as { until: number };
    expect(deleteSettledTasksBefore(dir, settled.until + 1)).toBe(1);
    expect(listTasks(dir).map((task) => task.id)).toEqual([queued.id]);
  });

  test("retention never removes a queued task based on its age", () => {
    const dir = fixture();
    const queued = addTask(dir, "old queued", {}, "a");
    orm(dir).run(sql`UPDATE tasks SET created_at=1 WHERE id=${queued.id}`);
    expect(deleteSettledTasksBefore(dir, Date.now())).toBe(0);
    expect(listTasks(dir).map((task) => task.id)).toEqual([queued.id]);
  });

  test("agent-scoped tasks become unrunnable when their agent ends", () => {
    const dir = fixture();
    const task = addTask(dir, "target", {}, "a", { agentId: "a" });
    orm(dir).run(sql`INSERT INTO agent_endings(agent_id,ended_at,closed_by) VALUES ('a',2,NULL)`);
    expect(listTasks(dir)[0]).toMatchObject({ id: task.id, state: "unrunnable" });
  });

  test("completed tasks stay done after their scope agent ends", () => {
    const dir = fixture();
    const task = addTask(dir, "finished", {}, "a", { agentId: "a" });
    claimTask(dir, task.id, "a", "done");
    recordTaskDone(dir, task.id);
    orm(dir).run(sql`INSERT INTO agent_endings(agent_id,ended_at,closed_by) VALUES ('a',2,NULL)`);
    expect(listTasks(dir)[0]).toMatchObject({ id: task.id, state: "done" });
  });

  test("a dead orch does not make a pack task unrunnable while a member lives", () => {
    const dir = fixture();
    orm(dir).run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at,spawned_by) VALUES ('b','a','pi','/tmp','b',1,'a')`);
    const task = addTask(dir, "pack work", {}, "a");
    orm(dir).run(sql`INSERT INTO agent_endings(agent_id,ended_at,closed_by) VALUES ('a',2,NULL)`);
    expect(listTasks(dir)[0]).toMatchObject({ id: task.id, state: "queued" });
  });

  test("pack-scoped tasks become unrunnable when every pack member ends", () => {
    const dir = fixture();
    const task = addTask(dir, "pack work", {}, "a");
    orm(dir).run(sql`INSERT INTO agent_endings(agent_id,ended_at,closed_by) VALUES ('a',2,NULL)`);
    expect(listTasks(dir)[0]).toMatchObject({ id: task.id, state: "unrunnable" });
  });
});
