import { afterEach, describe, expect, test } from "bun:test";
import { appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTask, cancelTask, claimTask, history, listTasks, unclaimTask } from "../src/queue";

const tempDirs: string[] = [];

function makeOrchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-queue-"));
  tempDirs.push(dir);
  return dir;
}

function appendEvent(orchDir: string, event: Record<string, unknown>): void {
  appendFileSync(join(orchDir, "queue", "queue.jsonl"), `${JSON.stringify(event)}\n`);
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("queue", () => {
  test("add then list shows a queued task", () => {
    const orchDir = makeOrchDir();
    const task = addTask(orchDir, "fix the failing tests", { agent: "pi", worktree: true });

    expect(listTasks(orchDir)).toEqual([
      expect.objectContaining({
        id: task.id,
        text: "fix the failing tests",
        opts: { agent: "pi", worktree: true },
        state: "queued",
        retries: 0,
      }),
    ]);
  });

  test("exactly one claimer wins, including parallel attempts", async () => {
    const orchDir = makeOrchDir();
    const task = addTask(orchDir, "claim me");

    expect(claimTask(orchDir, task.id, "agent-one")).toBe(true);
    expect(claimTask(orchDir, task.id, "agent-two")).toBe(false);

    const anotherTask = addTask(orchDir, "race me");
    const claims = await Promise.all(
      Array.from({ length: 32 }, (_, index) => Promise.resolve().then(() => claimTask(orchDir, anotherTask.id, `agent-${index}`))),
    );

    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(listTasks(orchDir).find((candidate) => candidate.id === anotherTask.id)).toMatchObject({ state: "claimed" });
  });

  test("replays done, failed, and retry transitions", () => {
    const orchDir = makeOrchDir();
    const done = addTask(orchDir, "finish");
    const failed = addTask(orchDir, "break");
    const retried = addTask(orchDir, "try again");

    expect(claimTask(orchDir, done.id, "agent-a")).toBe(true);
    appendEvent(orchDir, { ev: "done", id: done.id, ts: "2026-01-01T00:00:00.000Z", result: "ok" });

    expect(claimTask(orchDir, failed.id, "agent-b")).toBe(true);
    appendEvent(orchDir, { ev: "fail", id: failed.id, ts: "2026-01-01T00:00:01.000Z", error: "boom" });

    expect(claimTask(orchDir, retried.id, "agent-c")).toBe(true);
    unclaimTask(orchDir, retried.id);

    expect(listTasks(orchDir)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: done.id, state: "done", result: "ok" }),
        expect.objectContaining({ id: failed.id, state: "failed", lastError: "boom" }),
        expect.objectContaining({ id: retried.id, state: "queued", retries: 1 }),
      ]),
    );
    expect(history(orchDir).map((task) => task.id).sort()).toEqual([done.id, failed.id].sort());
  });

  test("cancels queued tasks and returns an error result for claimed tasks", () => {
    const orchDir = makeOrchDir();
    const queued = addTask(orchDir, "cancel me");
    const claimed = addTask(orchDir, "do not cancel me");

    expect(cancelTask(orchDir, queued.id)).toMatchObject({ state: "cancelled" });
    expect(claimTask(orchDir, claimed.id, "agent-a")).toBe(true);
    expect(cancelTask(orchDir, claimed.id)).toMatchObject({ state: "claimed", error: "Cannot cancel claimed task" });
  });

  test("skips a corrupt trailing event line", () => {
    const orchDir = makeOrchDir();
    const task = addTask(orchDir, "survive corruption");
    appendFileSync(join(orchDir, "queue", "queue.jsonl"), '{"ev":"claim"');

    expect(listTasks(orchDir)).toEqual([expect.objectContaining({ id: task.id, state: "queued" })]);
  });
});
