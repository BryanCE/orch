import { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import {
  attemptsOf,
  cancelTask,
  claimTask,
  closeIntake,
  editTask,
  enqueueTask,
  intakesOf,
  openIntake,
  openTasksInScope,
  settleAttempt,
  taskById,
  taskState,
} from "../src/store/task-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });
function fixture() { const d = mkdtempSync(join(tmpdir(), "orch-task-rows-")); dirs.push(d); return d; }
function seed(d: string) {
  const db = openStore(d);
  db.query("INSERT INTO harnesses(id,name) VALUES (?,?)").run("pi", "Pi");
  db.query("INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (?,?,?,?,?,?)").run("a", "a", "pi", "/tmp", "a", 1);
  db.query("INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at,spawned_by) VALUES (?,?,?,?,?,?,?)").run("b", "a", "pi", "/tmp", "b", 1, "a");
  db.query("INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (?,?,?,?,?,?)").run("c", "c", "pi", "/tmp", "c", 1);
  db.query("INSERT INTO spaces(id,name,created_at) VALUES (?,?,?)").run("s", "S", 1);
}

function addTask(d: string, id: string, scope: { scopeAgentId: string } | { scopePackId: string } | { scopeSpaceId: string }, enqueuedBy = "a") {
  enqueueTask(d, { id, text: id, opts: { id, nested: [1, true] }, enqueuedBy, ...scope });
}

describe("task and attempt rows", () => {
  test("malformed task rows are refused instead of handed back as typed data", () => {
    const d = fixture(); seed(d); addTask(d, "bad-task", { scopeAgentId: "a" });
    openStore(d).query("UPDATE tasks SET opts='not-json' WHERE id='bad-task'").run();
    expect(() => taskById(d, "bad-task")).toThrow(/malformed task row/i);
  });

  test("malformed attempt rows are refused instead of handing back NaN", () => {
    const d = fixture(); seed(d); addTask(d, "bad-attempt", { scopeAgentId: "a" });
    claimTask(d, "bad-attempt", "a", "dispatch", 10);
    openStore(d).query("UPDATE task_attempts SET result='not-json' WHERE task_id='bad-attempt'").run();
    expect(() => attemptsOf(d, "bad-attempt")).toThrow(/malformed task attempt row/i);
  });

  test("enqueue accepts exactly one typed scope and round-trips JSON opts", () => {
    const d = fixture(); seed(d);
    addTask(d, "t", { scopeAgentId: "a" });
    expect(openStore(d).query("SELECT typeof(created_at), typeof(opts) FROM tasks WHERE id='t'").get()).toEqual({ "typeof(created_at)": "integer", "typeof(opts)": "text" });
    expect(openTasksInScope(d, { agentId: "a" })[0]?.opts).toEqual({ id: "t", nested: [1, true] });
    expect(() => enqueueTask(d, { id: "bad", text: "x", opts: {}, enqueuedBy: "a" } as never)).toThrow();
    expect(() => enqueueTask(d, { id: "bad2", text: "x", opts: {}, enqueuedBy: "a", scopeAgentId: "a", scopePackId: "a" } as never)).toThrow();
  });

  test("queued tasks can be edited only by their enqueuer", () => {
    const d = fixture(); seed(d); addTask(d, "t", { scopeAgentId: "a" });
    editTask(d, "t", "a", { text: "edited", opts: { changed: true } });
    expect(openTasksInScope(d, { agentId: "a" })[0]).toMatchObject({ text: "edited", opts: { changed: true } });
    claimTask(d, "t", "a", "d1", 10);
    expect(() => editTask(d, "t", "a", { text: "nope" })).toThrow();
    addTask(d, "q", { scopeAgentId: "a" });
    expect(() => editTask(d, "q", "b", { text: "nope" })).toThrow();
  });

  test("two concurrent claims have one winner and one index violation", async () => {
    const d = fixture(); seed(d); addTask(d, "t", { scopePackId: "a" });
    // The interval trigger also rejects overlapping open rows. Remove it for
    // this probe so the expected loser must come from one_open_attempt.
    openStore(d).exec("DROP TRIGGER task_attempts_no_overlap");
    const first = new Database(join(d, "orch.db"));
    const second = new Database(join(d, "orch.db"));
    try {
      const outcomes = await Promise.allSettled([
        Promise.resolve().then(() => first.query("INSERT INTO task_attempts (task_id,since,agent_id,dispatch_id) VALUES (?,?,?,?)").run("t", 10, "a", "d1")),
        Promise.resolve().then(() => second.query("INSERT INTO task_attempts (task_id,since,agent_id,dispatch_id) VALUES (?,?,?,?)").run("t", 11, "b", "d2")),
      ]);
      expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
      const rejected = outcomes.find((outcome) => outcome.status === "rejected");
      if (rejected?.status !== "rejected") throw new Error("expected one rejected claim");
      expect(String(rejected.reason)).toMatch(/UNIQUE constraint failed: task_attempts\.task_id/i);
      expect(attemptsOf(d, "t")).toHaveLength(1);
    } finally {
      first.close();
      second.close();
    }
  });

  test("failed attempts remain in history and retries are new attempts", () => {
    const d = fixture(); seed(d); addTask(d, "t", { scopePackId: "a" }); addTask(d, "outside", { scopePackId: "c" });
    claimTask(d, "t", "a", "dispatch-x", 10); settleAttempt(d, "t", 10, 15, "failed", { error: "no" });
    claimTask(d, "t", "b", "dispatch-y", 20);
    expect(attemptsOf(d, "t")).toEqual([
      { taskId: "t", since: 10, until: 15, agentId: "a", dispatchId: "dispatch-x", outcome: "failed", result: null, error: "no" },
      { taskId: "t", since: 20, until: null, agentId: "b", dispatchId: "dispatch-y", outcome: null, result: null, error: null },
    ]);
    expect(openTasksInScope(d, { agentId: "b" }).map((row) => row.id)).toEqual([]);
    expect(openTasksInScope(d, { agentId: "c" }).map((row) => row.id)).toEqual(["outside"]);
    expect(openTasksInScope(d, { packId: "a" }).map((row) => row.id)).toEqual([]);
    expect(openTasksInScope(d, { packId: "c" }).map((row) => row.id)).toEqual(["outside"]);
  });

  test("settlement stores exact integer instants and outcome payloads", () => {
    const d = fixture(); seed(d); addTask(d, "done", { scopeAgentId: "a" }); claimTask(d, "done", "a", "dispatch", 100);
    settleAttempt(d, "done", 100, 123, "done", { result: { ok: true } });
    expect(attemptsOf(d, "done")[0]).toMatchObject({ since: 100, until: 123, outcome: "done", result: { ok: true }, error: null });
    expect(openStore(d).query("SELECT typeof(since),typeof(until) FROM task_attempts WHERE task_id='done'").get()).toEqual({ "typeof(since)": "integer", "typeof(until)": "integer" });
    addTask(d, "failed", { scopeAgentId: "a" }); claimTask(d, "failed", "a", "dispatch-f", 200);
    expect(() => settleAttempt(d, "failed", 200, 201, "failed")).toThrow();
    settleAttempt(d, "failed", 200, 201, "failed", { error: "bad" });
    expect(attemptsOf(d, "failed")[0]?.error).toBe("bad");
  });

  test("task state precedence covers queued, claimed, failed, done and cancelled", () => {
    const d = fixture(); seed(d);
    addTask(d, "queued", { scopeAgentId: "a" });
    addTask(d, "claimed", { scopeAgentId: "a" }); claimTask(d, "claimed", "a", "c", 1);
    addTask(d, "failed", { scopeAgentId: "a" }); claimTask(d, "failed", "a", "f", 1); settleAttempt(d, "failed", 1, 2, "failed", { error: "x" });
    addTask(d, "done", { scopeAgentId: "a" }); claimTask(d, "done", "a", "d", 1); settleAttempt(d, "done", 1, 2, "done", { result: true });
    addTask(d, "cancelled", { scopeAgentId: "a" }); claimTask(d, "cancelled", "a", "x", 1); cancelTask(d, "cancelled", "a", 3);
    expect(["queued", "claimed", "failed", "done", "cancelled"].map((id) => taskState(d, id))).toEqual(["queued", "claimed", "failed", "done", "cancelled"]);
  });

  test("intakes are half-open history and duplicate open intake is rejected", () => {
    const d = fixture(); seed(d); addTask(d, "t", { scopeSpaceId: "s" });
    expect(openTasksInScope(d, { agentId: "b" })).toHaveLength(0);
    openIntake(d, "a", "s", 10);
    expect(() => openIntake(d, "a", "s", 11)).toThrow();
    expect(intakesOf(d, "a")).toEqual([{ packId: "a", spaceId: "s", since: 10, until: null }]);
    expect(openTasksInScope(d, { agentId: "b" })).toHaveLength(1);
    closeIntake(d, "a", "s", 20);
    expect(intakesOf(d, "a")).toEqual([{ packId: "a", spaceId: "s", since: 10, until: 20 }]);
    expect(openTasksInScope(d, { agentId: "b" })).toHaveLength(0);
    expect(openStore(d).query("SELECT typeof(since),typeof(until) FROM pack_intakes").get()).toEqual({ "typeof(since)": "integer", "typeof(until)": "integer" });
  });
});
