import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTask, listTasks, nextQueuedTask } from "../src/queue";

/** Seed a malformed queue row with a NULL origin workspace — addTask refuses to write one. */
function seedUnscopedRow(orchDir: string, id: string): void {
  const ts = new Date("2000-01-01T00:00:00.000Z").toISOString();
  const db = new Database(join(orchDir, "orch.db"));
  db.query(
    "INSERT INTO queue (id, text, opts, origin_workspace, created_at, updated_at, state, retries) VALUES (?, ?, '{}', NULL, ?, ?, 'queued', 0)",
  ).run(id, "legacy task", ts, ts);
  db.close();
}

const tempDirs: string[] = [];

function makeOrchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-queue-workspace-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    removeTempDir(tempDirs.pop()!);
  }
});

describe("queue workspace replay", () => {
  test("persists workspace through append-only replay", () => {
    const orchDir = makeOrchDir();
    const task = addTask(orchDir, "do x", {}, "w8");

    const replayed = listTasks(orchDir).find((candidate) => candidate.id === task.id);
    expect(replayed).toMatchObject({ id: task.id, workspace: "w8" });
  });

  test("a malformed null-workspace row replays but is never claimable", () => {
    const orchDir = makeOrchDir();
    addTask(orchDir, "scoped", {}, "w1"); // creates the store + schema
    seedUnscopedRow(orchDir, "orphan-row");

    const replayed = listTasks(orchDir).find((candidate) => candidate.id === "orphan-row");
    expect(replayed).toBeDefined();
    expect(replayed?.workspace).toBeUndefined();
    expect(nextQueuedTask(listTasks(orchDir).filter((task) => task.id === "orphan-row"), "agent", "w9")).toBeUndefined();
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
    seedUnscopedRow(orchDir, "orphan-row");

    const replayed = listTasks(orchDir);
    const next = nextQueuedTask(replayed, "agent", "w8");

    // Only the w8 task is eligible: w1 is a foreign workspace, the orphan is malformed.
    expect(next?.id).toBe(w8.id);
    expect(next?.id).not.toBe(w1.id);
    expect(next?.id).not.toBe("orphan-row");
  });
});
