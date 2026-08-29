import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addTask,
  claimTask,
  listTasks,
  nextQueuedTask,
  reapTask,
  recordTaskFailure,
  takeOnTask,
  STALE_TASK_AGE_MS,
} from "../src/queue.ts";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { deleteSettledTasksBefore, taskState } from "../src/store/task-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-queue-reaping-"));
  dirs.push(dir);
  const db = openStore(dir);
  db.query("INSERT INTO harnesses(id,name) VALUES ('pi','Pi')").run();
  for (const [id, root, parent] of [
    ["orch-a", "orch-a", null], ["a1", "orch-a", "orch-a"],
    ["orch-b", "orch-b", null],
  ] as const) {
    db.query("INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES (?,?,?,?,?,?,1)")
      .run(id, parent, root, "pi", "/repo", id);
  }
  return dir;
}

function end(dir: string, agentId: string, at: number): void {
  openStore(dir).query("INSERT INTO agent_endings(agent_id,ended_at,closed_by) VALUES (?,?,NULL)").run(agentId, at);
}

describe("Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable", () => {
  test("a failed task whose scope is gone is unrunnable and survives every retention sweep", () => {
    const dir = fixture();
    const task = addTask(dir, "pack work", {}, "a1");
    expect(claimTask(dir, task.id, "a1", "d1")).toBe(true);
    expect(recordTaskFailure(dir, task.id, "boom").state).toBe("failed");
    end(dir, "a1", 2);
    end(dir, "orch-a", 3);
    // Settled work ages out; unrunnable work is not settled, it is stranded.
    expect(taskState(dir, task.id)).toBe("unrunnable");
    expect(deleteSettledTasksBefore(dir, Date.now() + 1_000)).toBe(0);
    expect(listTasks(dir).map((row) => row.id)).toEqual([task.id]);
    // Reaping it is the deliberate act, and it is available.
    expect(reapTask(dir, task.id, "orch-b")).toBe(true);
    expect(listTasks(dir)).toEqual([]);
  });

  test("unrunnable is about who is alive now — a new pack member makes it claimable again", () => {
    const dir = fixture();
    const task = addTask(dir, "pack work", {}, "a1");
    end(dir, "a1", 2);
    end(dir, "orch-a", 3);
    expect(taskState(dir, task.id)).toBe("unrunnable");
    openStore(dir).query("INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES ('a2','orch-a','orch-a','pi','/repo','a2',4)").run();
    expect(taskState(dir, task.id)).toBe("queued");
    expect(nextQueuedTask(dir, "a2", 1)?.id).toBe(task.id);
    // And a task nobody can ever claim is exactly the one a reap refuses now.
    expect(() => reapTask(dir, task.id, "orch-b")).toThrow(/unrunnable/);
  });

  test("stale is surfaced beside its state and never deleted on age", () => {
    const dir = fixture();
    const task = addTask(dir, "left overnight", {}, "a1");
    openStore(dir).query("UPDATE tasks SET created_at=? WHERE id=?").run(Date.now() - STALE_TASK_AGE_MS - 1, task.id);
    expect(listTasks(dir)[0]).toMatchObject({ id: task.id, state: "queued", stale: true });
    expect(deleteSettledTasksBefore(dir, Date.now() + 1_000)).toBe(0);
    expect(nextQueuedTask(dir, "a1", 1)?.id).toBe(task.id);
  });
});

describe("Cq12: an orphaned task has take-on, leave and reap, all deliberate", () => {
  test("take-on re-scopes to the taker's own pack and the work becomes claimable there", () => {
    const dir = fixture();
    const task = addTask(dir, "stranded", {}, "a1", { agentId: "a1" });
    end(dir, "a1", 2);
    expect(taskState(dir, task.id)).toBe("unrunnable");
    const taken = takeOnTask(dir, task.id, "orch-b");
    expect(taken).toMatchObject({ scopeAgentId: null, scopePackId: "orch-b", scopeSpaceId: null, state: "queued" });
    expect(nextQueuedTask(dir, "orch-b", 1)?.id).toBe(task.id);
    // Leaving it is doing nothing, so a second take-on has nothing to take.
    expect(() => takeOnTask(dir, task.id, "orch-b")).toThrow(/unrunnable/);
  });

  test("take-on refuses a taker that is not itself live", () => {
    const dir = fixture();
    const task = addTask(dir, "stranded", {}, "a1", { agentId: "a1" });
    end(dir, "a1", 2);
    end(dir, "orch-b", 2);
    expect(() => takeOnTask(dir, task.id, "orch-b")).toThrow(/live task taker/);
    expect(() => takeOnTask(dir, task.id, "nobody")).toThrow(/live task taker/);
  });
});
