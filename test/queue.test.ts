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
  openPackIntake,
  requireTask,
  closePackIntake,
  packIntakes,
  recordTaskFailure,
  taskShouldRetry,
} from "../src/queue.ts";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { acquireLease, adoptLease, currentLease } from "../src/store/lease-rows.ts";
import { setSpace } from "../src/store/interval-rows.ts";

import { isRecord } from "../src/util.ts";
import { openTasksInScope, taskState } from "../src/store/task-rows.ts";
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
  test("malformed task options are refused instead of handed back as TaskOptions", () => {
    const dir = fixture();
    const task = addTask(dir, "malformed", {}, "a1");
    openStore(dir).query("UPDATE tasks SET opts=? WHERE id=?").run(JSON.stringify("not-options"), task.id);
    expect(() => listTasks(dir)).toThrow(/malformed task options/i);
  });

  test("enqueue selects exactly one typed scope and defaults to the enqueuer pack", () => {
    const dir = fixture();
    expect(addTask(dir, "default", {}, "a1")).toMatchObject({ enqueuedBy: "a1", scopePackId: "orch-a", state: "queued" });
    setSpace(dir, "a1", 2, "space-1");
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

  test("Cq1: the gate is on enqueuing into a scope, and adoption earns it", () => {
    const dir = fixture();
    // Provenance never grants it: orch-b spawned nothing in pack orch-a.
    expect(() => addTask(dir, "intruder", {}, "orch-b", { packId: "orch-a" })).toThrow(/hold/i);
    // Adoption does. One held live member of the pack is the whole right.
    acquireLease(dir, "a1", "orch-b", 2);
    expect(addTask(dir, "adopted", {}, "orch-b", { packId: "orch-a" })).toMatchObject({ scopePackId: "orch-a" });
    // A space it is not in is not a scope it may publish into.
    expect(() => addTask(dir, "outsider", {}, "b1", { spaceId: "space-1" })).toThrow(/space/i);
    setSpace(dir, "b1", 3, "space-1");
    expect(addTask(dir, "insider", {}, "b1", { spaceId: "space-1" })).toMatchObject({ scopeSpaceId: "space-1" });
  });

  test("Cq1: a pack drains its queue with its orch dead and no lease in force", () => {
    const dir = fixture();
    const task = addTask(dir, "keep working", {}, "a1");
    openStore(dir).query("INSERT INTO agent_endings(agent_id,ended_at,closed_by) VALUES ('orch-a',2,NULL)").run();
    expect(currentLease(dir, "a2")).toBeNull();
    // Claiming is pull. No holder need be present, and the dead orch gates nothing.
    expect(nextQueuedTask(dir, "a2", 1)?.id).toBe(task.id);
    expect(claimTask(dir, task.id, "a2", "d1")).toBe(true);
    expect(listTasks(dir).find((entry) => entry.id === task.id)?.state).toBe("claimed");
  });

  test("claiming excludes another pack and space claims require open intake", () => {
    const dir = fixture();
    const packTask = addTask(dir, "pack work", {}, "a1");
    expect(nextQueuedTask(dir, "b1", 1)).toBeUndefined();
    expect(nextQueuedTask(dir, "a2", 1)?.id).toBe(packTask.id);

    setSpace(dir, "a1", 2, "space-1");
    const spaceTask = addTask(dir, "shared", {}, "a1", { spaceId: "space-1" });
    expect(nextQueuedTask(dir, "b1", 1)).toBeUndefined();
    openPackIntake(dir, "orch-b", "space-1", "orch-b", 3);
    expect(nextQueuedTask(dir, "b1", 1)?.id).toBe(spaceTask.id);
  });

  test("Cq3: a space-scoped task is an offer, and only an opted-in pack consumes it", () => {
    const dir = fixture();
    setSpace(dir, "a1", 2, "space-1");
    const task = addTask(dir, "offered", {}, "a1", { spaceId: "space-1" });
    // Publishing is one side. Pack orch-b never agreed, so it sees nothing.
    expect(nextQueuedTask(dir, "b1", 1)).toBeUndefined();
    expect(claimTask(dir, task.id, "b1", "d1")).toBe(false);
    // Both halves of the gate: the scope query offers it to nobody, and with no
    // pack consuming the space the derived state is unrunnable, not queued.
    expect(openTasksInScope(dir, { agentId: "b1" })).toEqual([]);
    expect(taskState(dir, task.id)).toBe("unrunnable");
    // The consuming side is the pack holder's act, and nobody else's.
    expect(() => openPackIntake(dir, "orch-b", "space-1", "orch-a")).toThrow(/hold/i);
    const opened = openPackIntake(dir, "orch-b", "space-1", "orch-b");
    expect(opened).toHaveLength(1);
    expect(opened[0]).toMatchObject({ packId: "orch-b", spaceId: "space-1", until: null });
    expect(packIntakes(dir, "orch-b")).toEqual(opened);
    expect(openTasksInScope(dir, { agentId: "b1" }).map((row) => row.id)).toEqual([task.id]);
    expect(taskState(dir, task.id)).toBe("queued");
    expect(nextQueuedTask(dir, "b1", 1)?.id).toBe(task.id);
    expect(claimTask(dir, task.id, "b1", "d2")).toBe(true);
    // Consent is withdrawable, and withdrawing it stops consumption again.
    expect(recordTaskFailure(dir, task.id, "boom").state).toBe("failed");
    expect(closePackIntake(dir, "orch-b", "space-1", "orch-b")[0]).toMatchObject({ packId: "orch-b", spaceId: "space-1" });
    expect(nextQueuedTask(dir, "b1", 1)).toBeUndefined();
    expect(claimTask(dir, task.id, "b1", "d3")).toBe(false);
    expect(() => closePackIntake(dir, "orch-b", "space-1", "orch-b")).toThrow(/no open intake/i);
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

  test("Cq5: an agent-scoped binding is to the agent and survives adoption", () => {
    const dir = fixture();
    acquireLease(dir, "a1", "orch-a", 2);
    const task = addTask(dir, "pinned", {}, "orch-a", { agentId: "a1" });
    // The lease moves; the binding does not follow it, because it was never to
    // the orch. The new holder drives the same pinned task.
    adoptLease(dir, "a1", "orch-b", 3);
    expect(currentLease(dir, "a1")?.orchId).toBe("orch-b");
    expect(requireTask(dir, task.id)).toMatchObject({ scopeAgentId: "a1", state: "queued" });
    expect(nextQueuedTask(dir, "a2", 1)).toBeUndefined();
    expect(nextQueuedTask(dir, "a1", 1)?.id).toBe(task.id);
    expect(claimTask(dir, task.id, "a2", "wrong")).toBe(false);
    expect(claimTask(dir, task.id, "a1", "right")).toBe(true);
  });

  test("Cq13: adoption carries the queue — pack work comes with the agents", () => {
    const dir = fixture();
    const task = addTask(dir, "pack work", {}, "a1");
    openStore(dir).query("INSERT INTO agent_endings(agent_id,ended_at,closed_by) VALUES ('orch-a',2,NULL)").run();
    adoptLease(dir, "a1", "orch-b", 3);
    adoptLease(dir, "a2", "orch-b", 3);
    // Nothing to re-parent: the task is scoped to the pack, not to the dead orch.
    expect(requireTask(dir, task.id)).toMatchObject({ scopePackId: "orch-a", state: "queued" });
    expect(nextQueuedTask(dir, "a1", 1)?.id).toBe(task.id);
    // And it does not leak into the adopter's own pack on the way across.
    expect(nextQueuedTask(dir, "b1", 1)).toBeUndefined();
    expect(claimTask(dir, task.id, "b1", "foreign")).toBe(false);
    expect(claimTask(dir, task.id, "a1", "adopted")).toBe(true);
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
    const refused = cancelTask(dir, own.id, "orch-b");
    expect(refused.state).toBe("queued");
    expect(refused.error).toContain("permitted");
    expect(cancelTask(dir, own.id, "a1")).toMatchObject({ state: "cancelled" });

    const targeted = addTask(dir, "targeted", {}, "orch-a", { agentId: "a1" });
    expect(cancelTask(dir, targeted.id, "orch-a")).toMatchObject({ state: "cancelled" });
    const human = addTask(dir, "human", {}, "a1");
    expect(cancelTask(dir, human.id, "orch-b", { human: true })).toMatchObject({ state: "cancelled" });
  });

  test("Cq7: origin_workspace is gone from the tasks table, scope replaces it", () => {
    const dir = fixture();
    const columns = openStore(dir).query("PRAGMA table_info(tasks)").all()
      .flatMap((value): string[] => (isRecord(value) && typeof value.name === "string" ? [value.name] : []));
    expect(columns).toEqual([
      "id", "text", "opts", "enqueued_by", "scope_agent_id", "scope_pack_id", "scope_space_id", "created_at",
    ]);
    expect(() => openStore(dir).query("SELECT origin_workspace FROM tasks").all()).toThrow(/origin_workspace/);
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
