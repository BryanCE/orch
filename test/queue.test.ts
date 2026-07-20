import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TaskRec } from "../src/queue";
import {
  addTask,
  cancelTask,
  claimTask,
  history,
  listTasks,
  nextQueuedTask,
  recordTaskDone,
  recordTaskFailure,
  requeueTask,
  taskShouldRetry,
  unclaimTask,
} from "../src/queue";

const tempDirs: string[] = [];

function makeOrchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-queue-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    removeTempDir(tempDirs.pop()!);
  }
});

describe("queue", () => {
  test("add then list shows a queued task", () => {
    const orchDir = makeOrchDir();
    const task = addTask(orchDir, "fix the failing tests", { agent: "pi", worktree: true }, "w1");

    expect(listTasks(orchDir)).toEqual([
      expect.objectContaining({
        id: task.id,
        text: "fix the failing tests",
        opts: { agent: "pi", worktree: true },
        state: "queued",
        retries: 0,
      }) as unknown as TaskRec,
    ]);
  });

  test("exactly one claimer wins, including parallel attempts", async () => {
    const orchDir = makeOrchDir();
    const task = addTask(orchDir, "claim me", {}, "w1");

    expect(claimTask(orchDir, task.id, "agent-one")).toBe(true);
    expect(claimTask(orchDir, task.id, "agent-two")).toBe(false);

    const anotherTask = addTask(orchDir, "race me", {}, "w1");
    const claims = await Promise.all(
      Array.from({ length: 32 }, (_, index) => Promise.resolve().then(() => claimTask(orchDir, anotherTask.id, `agent-${index}`))),
    );

    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(listTasks(orchDir).find((candidate) => candidate.id === anotherTask.id)).toMatchObject({ state: "claimed" });
  });

  test("replays done, failed, and retry transitions", () => {
    const orchDir = makeOrchDir();
    const done = addTask(orchDir, "finish", {}, "w1");
    const failed = addTask(orchDir, "break", {}, "w1");
    const retried = addTask(orchDir, "try again", {}, "w1");

    expect(claimTask(orchDir, done.id, "agent-a")).toBe(true);
    recordTaskDone(orchDir, done.id, "ok");

    expect(claimTask(orchDir, failed.id, "agent-b")).toBe(true);
    recordTaskFailure(orchDir, failed.id, "boom");

    expect(claimTask(orchDir, retried.id, "agent-c")).toBe(true);
    unclaimTask(orchDir, retried.id);

    expect(listTasks(orchDir)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: done.id, state: "done", result: "ok" }),
        expect.objectContaining({ id: failed.id, state: "failed", lastError: "boom" }),
        expect.objectContaining({ id: retried.id, state: "queued", retries: 1 }),
      ]) as unknown as TaskRec[],
    );
    expect(history(orchDir).map((task) => task.id).sort()).toEqual([done.id, failed.id].sort());
  });

  test("cancels queued tasks and returns an error result for claimed tasks", () => {
    const orchDir = makeOrchDir();
    const queued = addTask(orchDir, "cancel me", {}, "w1");
    const claimed = addTask(orchDir, "do not cancel me", {}, "w1");

    expect(cancelTask(orchDir, queued.id)).toMatchObject({ state: "cancelled" });
    expect(claimTask(orchDir, claimed.id, "agent-a")).toBe(true);
    expect(cancelTask(orchDir, claimed.id)).toMatchObject({ state: "claimed", error: "Cannot cancel claimed task" });
  });

  test("picks queued tasks FIFO, honoring the agent constraint", () => {
    const orchDir = makeOrchDir();
    const first = addTask(orchDir, "first", {}, "w1");
    addTask(orchDir, "second", {}, "w1");
    const pinned = addTask(orchDir, "pi only", { agent: "pi" }, "w1");

    const tasks = listTasks(orchDir);
    expect(nextQueuedTask(tasks, "claude")?.id).toBe(first.id);
    expect(nextQueuedTask(tasks.filter((task) => task.id === pinned.id), "claude")).toBeUndefined();
    expect(nextQueuedTask(tasks.filter((task) => task.id === pinned.id), "pi")?.id).toBe(pinned.id);
  });

  test("caps retries: requeue below the cap, terminal failed at it", () => {
    const orchDir = makeOrchDir();
    const task = addTask(orchDir, "flaky", {}, "w1");

    expect(claimTask(orchDir, task.id, "agent-a")).toBe(true);
    let current = requeueTask(orchDir, task.id, "turn died");
    expect(current).toMatchObject({ state: "queued", retries: 1, lastError: "turn died" });
    expect(taskShouldRetry(current, 1)).toBe(false);

    expect(claimTask(orchDir, task.id, "agent-a")).toBe(true);
    current = recordTaskFailure(orchDir, task.id, "died again");
    expect(current).toMatchObject({ state: "failed", lastError: "died again" });
    expect(claimTask(orchDir, task.id, "agent-b")).toBe(false);
  });

  test("settles a claimed task to done and blocks any later claim", () => {
    const orchDir = makeOrchDir();
    const task = addTask(orchDir, "one shot", {}, "w1");

    expect(claimTask(orchDir, task.id, "agent-a")).toBe(true);
    expect(recordTaskDone(orchDir, task.id, "ok")).toMatchObject({ state: "done", result: "ok" });
    expect(claimTask(orchDir, task.id, "agent-b")).toBe(false);
  });

  test("exactly one of two racing claimers wins", () => {
    const orchDir = makeOrchDir();
    const task = addTask(orchDir, "contended", {}, "w1");

    const outcomes = [claimTask(orchDir, task.id, "runner-1"), claimTask(orchDir, task.id, "runner-2")];
    expect(outcomes.filter(Boolean)).toHaveLength(1);
    expect(listTasks(orchDir)[0]).toMatchObject({ state: "claimed", agentKey: "runner-1" });
  });

  test("rejects an unscoped task at enqueue", () => {
    const orchDir = makeOrchDir();
    expect(() => addTask(orchDir, "no workspace")).toThrow(/origin workspace/i);
    expect(() => addTask(orchDir, "blank workspace", {}, "   ")).toThrow(/origin workspace/i);
    expect(listTasks(orchDir)).toHaveLength(0);
  });

  test("a malformed null-workspace row is skipped at claim, never dispatched", () => {
    const orchDir = makeOrchDir();
    // A valid enqueue creates the store + schema; then seed a malformed row
    // directly, since addTask now refuses to write one.
    const scoped = addTask(orchDir, "scoped", {}, "w1");
    const ts = new Date("2000-01-01T00:00:00.000Z").toISOString();
    const db = new Database(join(orchDir, "orch.db"));
    db.query(
      "INSERT INTO queue (id, text, opts, origin_workspace, created_at, updated_at, state, retries) VALUES (?, ?, '{}', NULL, ?, ?, 'queued', 0)",
    ).run("orphan-row", "orphan", ts, ts);
    db.close();

    const tasks = listTasks(orchDir);
    expect(tasks.find((task) => task.id === "orphan-row")?.workspace).toBeUndefined();
    // The malformed row is older (FIFO would pick it first if eligible), yet no
    // work loop ever claims it — in its own workspace or with none supplied.
    expect(nextQueuedTask(tasks, "worker", "w1")?.id).toBe(scoped.id);
    expect(nextQueuedTask(tasks, "worker")?.id).toBe(scoped.id);
    expect(nextQueuedTask(tasks.filter((task) => task.id === "orphan-row"), "worker")).toBeUndefined();
    expect(nextQueuedTask(tasks.filter((task) => task.id === "orphan-row"), "worker", "w1")).toBeUndefined();
  });
});
