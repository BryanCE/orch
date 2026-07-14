import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTask, listTasks, nextQueuedTask } from "../src/queue";

const tempDirs: string[] = [];

function makeOrchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-queue-workspace-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("queue workspace replay", () => {
  test("persists workspace through append-only replay", () => {
    const orchDir = makeOrchDir();
    const task = addTask(orchDir, "do x", {}, "w8");

    const replayed = listTasks(orchDir).find((candidate) => candidate.id === task.id);
    expect(replayed).toMatchObject({ id: task.id, workspace: "w8" });
  });

  test("keeps legacy tasks without a workspace", () => {
    const orchDir = makeOrchDir();
    const task = addTask(orchDir, "legacy task");

    const replayed = listTasks(orchDir).find((candidate) => candidate.id === task.id);
    expect(replayed).toBeDefined();
    expect(replayed?.workspace).toBeUndefined();
  });

  test("replays separate workspace values for multiple tasks", () => {
    const orchDir = makeOrchDir();
    const w1 = addTask(orchDir, "workspace one", {}, "w1");
    const w8 = addTask(orchDir, "workspace eight", {}, "w8");

    const replayed = listTasks(orchDir);
    expect(replayed.find((task) => task.id === w1.id)?.workspace).toBe("w1");
    expect(replayed.find((task) => task.id === w8.id)?.workspace).toBe("w8");
  });

  test("selects only tasks eligible for the requested workspace", () => {
    const orchDir = makeOrchDir();
    const w1 = addTask(orchDir, "workspace one", {}, "w1");
    const w8 = addTask(orchDir, "workspace eight", {}, "w8");
    const legacy = addTask(orchDir, "legacy task");

    const replayed = listTasks(orchDir);
    const next = nextQueuedTask(replayed, "agent", "w8");

    expect(next?.id).toBe(w8.id);
    expect([w8.id, legacy.id]).toContain(next?.id);
    expect(next?.id).not.toBe(w1.id);
  });
});
