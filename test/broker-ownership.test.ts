import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTask, listTasks, nextQueuedTask } from "../src/queue.ts";
import { checkWall } from "../src/policy/workspace.ts";
import { checkOwnerWrite, getOwner, setOwner } from "../src/store/sqlite.ts";

const tempDirs: string[] = [];

function makeOrchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-broker-ownership-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe("broker ownership and workspace governance", () => {
  test("refuses foreign-owner writes until the actor steals ownership", () => {
    const orchDir = makeOrchDir();
    setOwner(orchDir, "pane-1", "orchA");

    const refused = checkOwnerWrite(orchDir, "pane-1", "orchB", {});
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.reason).toContain("orchA");

    expect(checkOwnerWrite(orchDir, "pane-1", "orchB", { steal: true })).toEqual({
      ok: true,
      reassigned: true,
    });
    expect(getOwner(orchDir, "pane-1")).toBe("orchB");
    expect(checkOwnerWrite(orchDir, "pane-9", "orchB", {})).toEqual({ ok: true });
  });

  test("refuses cross-workspace writes unless explicitly overridden", () => {
    expect(checkWall("herdr~w1~p1", "herdr~w1~p3", { crossWorkspace: false })).toEqual({ allowed: true });

    const refused = checkWall("herdr~w1~p1", "herdr~w2~p2", { crossWorkspace: false });
    expect(refused.allowed).toBe(false);
    expect(refused.reason).toContain("w1");
    expect(refused.reason).toContain("w2");

    expect(checkWall("herdr~w1~p1", "herdr~w2~p2", { crossWorkspace: true })).toEqual({ allowed: true });
  });

  test("work-loop selection stays within the origin workspace", () => {
    const orchDir = makeOrchDir();
    const origin = addTask(orchDir, "origin task", {}, "w1");
    const foreign = addTask(orchDir, "foreign task", {}, "w2");
    const legacy = addTask(orchDir, "legacy task");
    const tasks = listTasks(orchDir);

    expect(nextQueuedTask(tasks, "worker", "w1")?.id).toBe(origin.id);
    expect(nextQueuedTask(tasks, "worker", "w2")?.id).toBe(foreign.id);
    expect(nextQueuedTask(tasks, "worker", "w3")?.id).toBe(legacy.id);
    expect(nextQueuedTask(tasks.filter((task) => task.id === foreign.id), "worker", "w1")).toBeUndefined();
  });
});
