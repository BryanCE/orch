import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addTask,
  cancelTask,
  claimTask,
  listTasks,
  nextQueuedTask,
  recordTaskFailure,
  taskShouldRetry,
} from "../src/queue.ts";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { openIntake } from "../src/store/task-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-queue-"));
  dirs.push(dir);
  const db = openStore(dir);
  db.query("INSERT INTO harnesses(id,name) VALUES ('pi','Pi')").run();
  for (const [id, root, parent] of [
    ["orch-a", "orch-a", null], ["a1", "orch-a", "orch-a"], ["a2", "orch-a", "orch-a"],
    ["orch-b", "orch-b", null], ["b1", "orch-b", "orch-b"],
  ] as const) {
    db.query("INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES (?,?,?,?,?,?,1)")
      .run(id, parent, root, "pi", "/repo", id);
  }
  db.query("INSERT INTO spaces(id,name,created_by,created_at) VALUES ('space-1','One','orch-a',1)").run();
  return dir;
}

describe("queue facade on tasks and attempts", () => {
  test("enqueue selects exactly one typed scope and defaults to the enqueuer pack", () => {
    const dir = fixture();
    expect(addTask(dir, "default", {}, "a1")).toMatchObject({ enqueuedBy: "a1", scopePackId: "orch-a", state: "queued" });
    expect(addTask(dir, "space", {}, "a1", { spaceId: "space-1" })).toMatchObject({ scopeSpaceId: "space-1" });
    expect(() => addTask(dir, "none", {}, "missing")).toThrow(/enqueuer/i);
    expect(() => addTask(dir, "many", {}, "a1", { agentId: "a2", spaceId: "space-1" })).toThrow(/exactly one/i);
  });

  test("agent scope requires the enqueuer to lease the target", () => {
    const dir = fixture();
    expect(() => addTask(dir, "pin", {}, "orch-a", { agentId: "a1" })).toThrow(/lease/i);
    acquireLease(dir, "a1", "orch-a", 2);
    expect(addTask(dir, "pin", {}, "orch-a", { agentId: "a1" })).toMatchObject({ scopeAgentId: "a1" });
  });

  test("claiming excludes another pack and space claims require open intake", () => {
    const dir = fixture();
    const packTask = addTask(dir, "pack work", {}, "a1");
    expect(nextQueuedTask(dir, "b1", 1)).toBeUndefined();
    expect(nextQueuedTask(dir, "a2", 1)?.id).toBe(packTask.id);

    const spaceTask = addTask(dir, "shared", {}, "a1", { spaceId: "space-1" });
    expect(nextQueuedTask(dir, "b1", 1)).toBeUndefined();
    openIntake(dir, "orch-b", "space-1", 3);
    expect(nextQueuedTask(dir, "b1", 1)?.id).toBe(spaceTask.id);
  });

  test("a failed pack attempt retries on another member, never outside the pack", () => {
    const dir = fixture();
    const task = addTask(dir, "flaky", {}, "a1");
    expect(claimTask(dir, task.id, "a1", "d1")).toBe(true);
    const failed = recordTaskFailure(dir, task.id, "boom");
    expect(failed.state).toBe("failed");
    expect(failed.attempts).toHaveLength(1);
    expect(failed.attempts[0]).toMatchObject({ agentId: "a1", dispatchId: "d1", outcome: "failed", error: "boom" });
    expect(taskShouldRetry(failed, 1)).toBe(true);

    // Cq6: the failed attempt is history, not a pin. Another member of the
    // same pack can claim the retry, while an unrelated pack cannot.
    expect(nextQueuedTask(dir, "a2", 1)?.id).toBe(task.id);
    expect(nextQueuedTask(dir, "b1", 1)).toBeUndefined();
    expect(claimTask(dir, task.id, "a2", "d2")).toBe(true);
    expect(listTasks(dir).find((entry) => entry.id === task.id)?.attempts).toEqual([
      expect.objectContaining({ agentId: "a1", dispatchId: "d1", outcome: "failed" }),
      expect.objectContaining({ agentId: "a2", dispatchId: "d2", outcome: null, until: null }),
    ]);
    expect(recordTaskFailure(dir, task.id, "again").attempts).toHaveLength(2);
    expect(nextQueuedTask(dir, "a1", 1)).toBeUndefined();
  });

  test("a claim is an insert and a lost race returns false", () => {
    const dir = fixture();
    const task = addTask(dir, "race", {}, "a1");
    expect(claimTask(dir, task.id, "a1", "d1")).toBe(true);
    expect(claimTask(dir, task.id, "a2", "d2")).toBe(false);
    expect(listTasks(dir)[0]?.attempts).toHaveLength(1);
  });

  test("cancel rights are enqueuer, targeted agent's leasing orch, or human", () => {
    const dir = fixture();
    acquireLease(dir, "a1", "orch-a", 2);
    const own = addTask(dir, "own", {}, "a1");
    expect(cancelTask(dir, own.id, "orch-b")).toMatchObject({ state: "queued", error: expect.stringContaining("permitted") as unknown as string });
    expect(cancelTask(dir, own.id, "a1")).toMatchObject({ state: "cancelled" });

    const targeted = addTask(dir, "targeted", {}, "orch-a", { agentId: "a1" });
    expect(cancelTask(dir, targeted.id, "orch-a")).toMatchObject({ state: "cancelled" });
    const human = addTask(dir, "human", {}, "a1");
    expect(cancelTask(dir, human.id, "orch-b", { human: true })).toMatchObject({ state: "cancelled" });
  });

  test("state and attempt-derived values have no legacy flattened fields", () => {
    const dir = fixture();
    const task = addTask(dir, "shape", {}, "a1");
    expect(task).not.toHaveProperty("workspace");
    expect(task).not.toHaveProperty("retries");
    expect(task).not.toHaveProperty("lastError");
    expect(task).not.toHaveProperty("agentKey");
    expect(task.attempts).toEqual([]);
  });
});
