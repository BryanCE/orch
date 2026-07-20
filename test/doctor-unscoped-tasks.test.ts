import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { addTask } from "../src/queue.ts";
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
  const db = new Database(path.join(orchDir, "orch.db"));
  db.query(
    "INSERT INTO queue (id, text, opts, origin_workspace, created_at, updated_at, state, retries) VALUES (?, ?, '{}', NULL, ?, ?, 'queued', 0)",
  ).run(id, "orphaned task", ts, ts);
  db.close();
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
