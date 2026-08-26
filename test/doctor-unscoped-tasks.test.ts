import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import type { TaskRec } from "../src/queue.ts";
import { addTask } from "../src/queue.ts";
import { insertQueueTask } from "../src/store/queue-rows.ts";
import { checkUnscopedTasks } from "../src/doctor/presence.ts";
import { runDoctor } from "../src/doctor/runner.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const directories: string[] = [];

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-unscoped-"));
  directories.push(directory);
  return directory;
}

/** Seed a queued row with a NULL origin workspace — addTask refuses to write one. */
function seedUnscopedRow(orchDir: string, id: string): void {
  const ts = new Date().toISOString();
  const task: TaskRec = {
    id,
    text: "orphaned task",
    opts: {},
    createdAt: ts,
    updatedAt: ts,
    state: "queued",
    retries: 0,
  };
  insertQueueTask(orchDir, task);
}

afterEach(() => {
  while (directories.length) removeTempDir(directories.pop()!);
});

describe("doctor unscoped queue tasks", () => {
  test("only scoped tasks pass", () => {
    const orchDir = tempDir();
    addTask(orchDir, "scoped", {}, "w1");
    const result = checkUnscopedTasks(orchDir);
    expect(result.status).toBe("ok");
  });

  test("reports a null-workspace row as reappable and names it", () => {
    const orchDir = tempDir();
    addTask(orchDir, "scoped", {}, "w1"); // creates the store + schema
    seedUnscopedRow(orchDir, "orphan-row");
    const result = checkUnscopedTasks(orchDir);
    expect(result.status).toBe("warn");
    expect(result.detail).toContain("orphan-row");
    expect(result.detail).toContain("orch clean");
  });

  test("stays report-only — no pre-selected destructive fix", () => {
    const orchDir = tempDir();
    addTask(orchDir, "scoped", {}, "w1");
    seedUnscopedRow(orchDir, "orphan-row");
    const result = checkUnscopedTasks(orchDir);
    expect(result.fix).toBeUndefined();
  });

  test("the check is wired into runDoctor", async () => {
    const orchDir = tempDir();
    addTask(orchDir, "scoped", {}, "w1");
    seedUnscopedRow(orchDir, "orphan-row");
    const results = await runDoctor(orchDir);
    const result = results.find((entry) => entry.id === "unscoped-tasks");
    expect(result?.status).toBe("warn");
  });
});
