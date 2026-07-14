import { describe, expect, test } from "bun:test";
import { entityWorkspace, scopeEntitiesToWorkspace, workspaceOf, type Entity } from "../src/entities.ts";
import { nextQueuedTask, type TaskRec } from "../src/queue.ts";

function fakeEntity(key: string, paneId: string | null): Entity {
  return { key, paneId, name: null, tabLabel: null, agent: null, focused: false, herdrStatus: null, presence: null, sessionPath: null, presenceOnly: true };
}

function fakeTask(id: string, createdAt: string, workspace?: string, agent?: string): TaskRec {
  return {
    id,
    text: id,
    workspace,
    opts: agent ? { agent } : {},
    createdAt,
    updatedAt: createdAt,
    state: "queued",
    retries: 0,
  };
}

describe("workspace helpers", () => {
  test("extracts workspace ids only from pane ids", () => {
    expect(workspaceOf("w6:p21")).toBe("w6");
    expect(workspaceOf("w12:p3")).toBe("w12");
    expect(workspaceOf("session-123")).toBeNull();
    expect(workspaceOf(null)).toBeNull();
    expect(workspaceOf("nocolon")).toBeNull();
  });

  test("derives an entity workspace from paneId or key", () => {
    expect(entityWorkspace(fakeEntity("fallback", "w6:p21"))).toBe("w6");
    expect(entityWorkspace(fakeEntity("w12:p3", null))).toBe("w12");
  });

  test("returns the same entities when all workspaces are requested", () => {
    const entities = [fakeEntity("w6:p1", "w6:p1")];
    expect(scopeEntitiesToWorkspace(entities, { all: true })).toBe(entities);
  });
});

describe("workspace-aware queued task selection", () => {
  test("excludes tasks pinned to another workspace", () => {
    const task = fakeTask("w8-task", "2026-01-01T00:00:00.000Z", "w8");
    expect(nextQueuedTask([task], "pi", "w1")).toBeUndefined();
    expect(nextQueuedTask([task], "pi", "w8")).toBe(task);
  });

  test("keeps legacy tasks eligible in any workspace", () => {
    const task = fakeTask("legacy", "2026-01-01T00:00:00.000Z");
    expect(nextQueuedTask([task], "pi", "w1")).toBe(task);
    expect(nextQueuedTask([task], "pi", "w8")).toBe(task);
  });

  test("selects the earliest eligible task and respects agent constraints", () => {
    const tasks = [
      fakeTask("later", "2026-01-01T00:00:02.000Z", "w1"),
      fakeTask("wrong-agent", "2026-01-01T00:00:00.000Z", "w1", "claude"),
      fakeTask("earliest", "2026-01-01T00:00:01.000Z", "w1", "pi"),
    ];
    expect(nextQueuedTask(tasks, "pi", "w1")?.id).toBe("earliest");
    expect(nextQueuedTask(tasks, "claude", "w1")?.id).toBe("wrong-agent");
  });
});
