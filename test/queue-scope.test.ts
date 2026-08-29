import { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addTask,
  cancelTask,
  claimTask,
  editTask,
  listTasks,
  recordTaskFailure,
  reapTask,
  takeOnTask,
} from "../src/queue.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { attemptsOf, enqueueTask } from "../src/store/task-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

import { row } from "./helpers/rows.ts";
const dirs: string[] = [];
afterEach(() => {
  closeAllStores();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-queue-scope-"));
  dirs.push(dir);
  const db = orm(dir);
  db.run(sql`INSERT INTO harnesses(id,name) VALUES ('pi','Pi')`);
  const agents: readonly [string, string, string | null][] = [
    ["pack", "pack", null],
    ["x", "pack", "pack"],
    ["y", "pack", "pack"],
    ["other", "other", null],
  ];
  for (const [id, root, parent] of agents) {
    db.run(sql`INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES (${id},${parent},${root},${"pi"},${"/repo"},${id},1)`);
  }
  return dir;
}

describe("queue scope invariants", () => {
  test("a failed pack task retries on another pack member, while an agent task stays pinned", () => {
    const dir = fixture();
    const packTask = addTask(dir, "pack retry", {}, "x");
    expect(claimTask(dir, packTask.id, "x", "pack-x")).toBe(true);
    expect(recordTaskFailure(dir, packTask.id, "failed on x").state).toBe("failed");
    expect(claimTask(dir, packTask.id, "y", "pack-y")).toBe(true);
    expect(attemptsOf(dir, packTask.id).map((attempt) => attempt.agentId)).toEqual(["x", "y"]);

    enqueueTask(dir, {
      id: "agent-retry",
      text: "agent retry",
      opts: {},
      enqueuedBy: "pack",
      scopeAgentId: "x",
    });
    expect(claimTask(dir, "agent-retry", "x", "agent-x")).toBe(true);
    expect(recordTaskFailure(dir, "agent-retry", "failed on x").state).toBe("failed");
    expect(claimTask(dir, "agent-retry", "y", "agent-y")).toBe(false);
    expect(attemptsOf(dir, "agent-retry").map((attempt) => attempt.agentId)).toEqual(["x"]);
  });

  test("cancel is allowed for the enqueuer or a lease holder of a targeted agent", () => {
    const dir = fixture();
    orm(dir).run(sql`INSERT INTO agent_leases(agent_id,orch_id,since) VALUES ('x','other',1)`);
    const byEnqueuer = addTask(dir, "cancel me", {}, "x", { agentId: "x" });
    expect(cancelTask(dir, byEnqueuer.id, "x").state).toBe("cancelled");
    const byLease = addTask(dir, "cancel leased", {}, "x", { agentId: "x" });
    expect(cancelTask(dir, byLease.id, "other").state).toBe("cancelled");
  });

  test("cancel refuses a caller who is neither enqueuer nor targeted lease holder", () => {
    const dir = fixture();
    const task = addTask(dir, "protected", {}, "x", { agentId: "x" });
    const result = cancelTask(dir, task.id, "y");
    expect(result.error).toContain("not permitted");
    expect(result.state).toBe("queued");
  });

  test("edit is allowed only for the enqueuer while queued", () => {
    const dir = fixture();
    const task = addTask(dir, "editable", {}, "x");
    expect(editTask(dir, task.id, "x", { text: "edited" }).text).toBe("edited");
    const refused = editTask(dir, task.id, "y", { text: "no" });
    expect(refused.error).toContain("not editable");
    expect(claimTask(dir, task.id, "x", "dispatch")).toBe(true);
    const afterClaim = editTask(dir, task.id, "x", { text: "no" });
    expect(afterClaim.error).toContain("not editable");
  });

  test("an orphan has exactly take-on, leave, and reap resolutions", () => {
    const dir = fixture();
    const task = addTask(dir, "orphan", {}, "x", { agentId: "x" });
    orm(dir).run(sql`INSERT INTO agent_endings(agent_id,ended_at,closed_by) VALUES ('x',2,NULL)`);
    expect(takeOnTask(dir, task.id, "other").scopePackId).toBe("other");
    expect(() => reapTask(dir, task.id, "other")).toThrow(/unrunnable/);
    const orphan = addTask(dir, "orphan again", {}, "x", { agentId: "x" });
    expect(reapTask(dir, orphan.id, "other")).toBe(true);
    expect(row(orm(dir), sql`SELECT id FROM tasks WHERE id=${orphan.id}`)).toBeUndefined();
  });

  test("stale queued work is surfaced distinctly and never deleted by age", () => {
    const dir = fixture();
    const task = addTask(dir, "old but claimable", {}, "x");
    orm(dir).run(sql`UPDATE tasks SET created_at=${Date.now() - 3 * 24 * 60 * 60 * 1000} WHERE id=${task.id}`);
    const listed = listTasks(dir);
    expect(listed[0]).toMatchObject({ id: task.id, state: "queued", stale: true });
    expect(() => reapTask(dir, task.id, "x")).toThrow(/unrunnable/);
    expect(row(orm(dir), sql`SELECT id FROM tasks WHERE id=${task.id}`)).not.toBeUndefined();
  });

  test("two concurrent claims have one winner and one one_open_attempt violation", async () => {
    const dir = fixture();
    enqueueTask(dir, {
      id: "race",
      text: "race",
      opts: {},
      enqueuedBy: "pack",
      scopePackId: "pack",
    });
    // Remove the interval trigger so the loser must come from one_open_attempt.
    const first = new Database(join(dir, "orch.db"));
    const second = new Database(join(dir, "orch.db"));
    try {
      const outcomes = await Promise.allSettled([
        Promise.resolve().then(() => first.run("INSERT INTO task_attempts (task_id,since,agent_id,dispatch_id) VALUES (?,?,?,?)", ["race", 10, "x", "d1"])),
        Promise.resolve().then(() => second.run("INSERT INTO task_attempts (task_id,since,agent_id,dispatch_id) VALUES (?,?,?,?)", ["race", 11, "y", "d2"])),
      ]);
      expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
      const rejected = outcomes.find((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected");
      if (!rejected) throw new Error("expected one rejected claim");
      expect(String(rejected.reason)).toMatch(/UNIQUE constraint failed: task_attempts\.task_id/i);
      expect(attemptsOf(dir, "race")).toHaveLength(1);
    } finally {
      first.close();
      second.close();
    }
  });
});
