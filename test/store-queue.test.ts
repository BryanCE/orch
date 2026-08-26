import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, openStore, withTransaction } from "../src/store/connection.ts";
import {
  countTasksInState,
  deleteSettledTasksBefore,
  insertQueueTask,
  selectQueueTask,
  selectQueueTasks,
  selectTasksInStates,
  writeTaskClaim,
  writeTaskDone,
} from "../src/store/queue-rows.ts";
import type { TaskRec, TaskState } from "../src/queue.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const tempDirs: string[] = [];

afterEach(() => {
  closeAllStores();
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

function fixture(): string {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-store-queue-"));
  tempDirs.push(orchDir);
  openStore(orchDir);
  return orchDir;
}

function task(id: string, state: TaskState, createdAt: string, updatedAt = createdAt): TaskRec {
  return {
    id,
    text: `task ${id}`,
    opts: {},
    createdAt,
    updatedAt,
    state,
    retries: 0,
    workspace: "workspace-a",
  };
}

describe("queue store rows", () => {
  test("countTasksInState returns a count per state and zero for an empty state", () => {
    const orchDir = fixture();
    insertQueueTask(orchDir, task("queued-1", "queued", "2026-01-01T00:00:00.000Z"));
    insertQueueTask(orchDir, task("queued-2", "queued", "2026-01-01T00:00:01.000Z"));
    insertQueueTask(orchDir, task("claimed-1", "claimed", "2026-01-01T00:00:02.000Z"));
    insertQueueTask(orchDir, task("done-1", "done", "2026-01-01T00:00:03.000Z"));

    expect(countTasksInState(orchDir, "queued")).toBe(2);
    expect(countTasksInState(orchDir, "claimed")).toBe(1);
    expect(countTasksInState(orchDir, "done")).toBe(1);
    expect(countTasksInState(orchDir, "failed")).toBe(0);
  });

  test("selectTasksInStates returns only named states in created-at order", () => {
    const orchDir = fixture();
    insertQueueTask(orchDir, task("done", "done", "2026-01-01T00:00:02.000Z"));
    insertQueueTask(orchDir, task("queued", "queued", "2026-01-01T00:00:03.000Z"));
    insertQueueTask(orchDir, task("claimed", "claimed", "2026-01-01T00:00:01.000Z"));
    insertQueueTask(orchDir, task("failed", "failed", "2026-01-01T00:00:04.000Z"));

    const selected = selectTasksInStates(orchDir, ["queued", "claimed"]);
    expect(selected.map((row) => row.id)).toEqual(["claimed", "queued"]);
    expect(selected.every((row) => row.state === "queued" || row.state === "claimed")).toBe(true);
  });

  test("deleteSettledTasksBefore removes only old settled rows and returns the number removed", () => {
    const orchDir = fixture();
    const cutoff = "2026-01-10T00:00:00.000Z";
    insertQueueTask(orchDir, task("old-done", "done", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"));
    insertQueueTask(orchDir, task("old-failed", "failed", "2026-01-02T00:00:00.000Z", "2026-01-02T00:00:00.000Z"));
    insertQueueTask(orchDir, task("old-cancelled", "cancelled", "2026-01-03T00:00:00.000Z", "2026-01-03T00:00:00.000Z"));
    insertQueueTask(orchDir, task("new-done", "done", "2026-01-04T00:00:00.000Z", "2026-01-11T00:00:00.000Z"));
    insertQueueTask(orchDir, task("at-cutoff", "done", "2026-01-04T12:00:00.000Z", cutoff));
    insertQueueTask(orchDir, task("old-queued", "queued", "2026-01-05T00:00:00.000Z", "2026-01-05T00:00:00.000Z"));
    insertQueueTask(orchDir, task("old-claimed", "claimed", "2026-01-06T00:00:00.000Z", "2026-01-06T00:00:00.000Z"));

    expect(deleteSettledTasksBefore(orchDir, cutoff)).toBe(3);
    expect(selectQueueTasks(orchDir).map((row) => row.id)).toEqual([
      "new-done",
      "at-cutoff",
      "old-queued",
      "old-claimed",
    ]);
  });

  test("withTransaction commits every write on normal return", () => {
    const orchDir = fixture();
    const result = withTransaction(orchDir, () => {
      insertQueueTask(orchDir, task("committed-1", "queued", "2026-01-01T00:00:00.000Z"));
      insertQueueTask(orchDir, task("committed-2", "queued", "2026-01-01T00:00:01.000Z"));
      expect(writeTaskClaim(orchDir, "committed-1", "agent-a", "2026-01-01T00:00:02.000Z", "dispatch-1")).toBe(true);
      writeTaskDone(orchDir, "committed-1", "2026-01-01T00:00:03.000Z", { ok: true });
      return "committed";
    });

    expect(result).toBe("committed");
    expect(selectQueueTask(orchDir, "committed-1")).toEqual(
      expect.objectContaining({ state: "done", result: { ok: true } }) as unknown as TaskRec,
    );
    expect(selectQueueTask(orchDir, "committed-2")).toEqual(
      expect.objectContaining({ state: "queued" }) as unknown as TaskRec,
    );
  });

  test("withTransaction rolls back every write when the body throws", () => {
    const orchDir = fixture();
    insertQueueTask(orchDir, task("preexisting", "queued", "2026-01-01T00:00:00.000Z"));

    expect(() => withTransaction(orchDir, () => {
      expect(writeTaskClaim(orchDir, "preexisting", "agent-a", "2026-01-01T00:00:01.000Z", "dispatch-1")).toBe(true);
      writeTaskDone(orchDir, "preexisting", "2026-01-01T00:00:02.000Z", { should: "vanish" });
      insertQueueTask(orchDir, task("rolled-back", "queued", "2026-01-01T00:00:03.000Z"));
      throw new Error("rollback me");
    })).toThrow("rollback me");

    expect(selectQueueTask(orchDir, "preexisting")).toEqual(
      expect.objectContaining({ id: "preexisting", state: "queued" }) as unknown as TaskRec,
    );
    expect(selectQueueTask(orchDir, "rolled-back")).toBeUndefined();
  });

  test("selectQueueTask finds a claimed row without scanning settled rows", () => {
    const orchDir = fixture();
    for (let i = 0; i < 50; i += 1) {
      insertQueueTask(orchDir, task(`settled-${i}`, i % 2 === 0 ? "done" : "failed", `2026-01-01T00:00:${String(i).padStart(2, "0")}.000Z`));
    }
    const claimed = task("claimed-target", "claimed", "2026-01-02T00:00:00.000Z");
    insertQueueTask(orchDir, claimed);

    const byId = selectQueueTask(orchDir, claimed.id);
    const byScan = selectQueueTasks(orchDir).find((row) => row.id === claimed.id);
    expect(byId).toEqual(byScan);
  });
});
