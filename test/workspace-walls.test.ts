import { describe, expect, test } from "bun:test";
import { entityWorkspace, scopeEntitiesToWorkspace, workspaceOf, type Entity } from "../src/entities.ts";
import { checkWall } from "../src/policy/workspace.ts";
import { nextQueuedTask, type TaskRec } from "../src/queue.ts";

function fakeEntity(key: string, paneId: string | null): Entity {
  return { key, paneId, workspace: null, name: null, tabLabel: null, agent: null, focused: false, backendStatus: null, presence: null, sessionPath: null, presenceOnly: true };
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
  test("extracts workspace ids only from identity keys", () => {
    expect(workspaceOf("herdr~w6~p21")).toBe("w6");
    expect(workspaceOf("herdr~w12~p3")).toBe("w12");
    expect(workspaceOf("session-123")).toBeNull();
    expect(workspaceOf(null)).toBeNull();
    expect(workspaceOf("nocolon")).toBeNull();
  });

  test("derives an entity workspace from the identity key", () => {
    expect(entityWorkspace(fakeEntity("herdr~w6~p21", null))).toBe("w6");
    expect(entityWorkspace(fakeEntity("herdr~w12~p3", null))).toBe("w12");
  });

  test("returns the same entities when all workspaces are requested", () => {
    const entities = [fakeEntity("herdr~w6~p1", "herdr~w6~p1")];
    expect(scopeEntitiesToWorkspace(entities, { all: true })).toBe(entities);
  });
});

describe("workspace wall writes", () => {
  test("allows a write within the same workspace", () => {
    expect(checkWall("herdr~w1~p1", "herdr~w1~p2", { crossWorkspace: false })).toEqual({ allowed: true });
  });

  test("denies a cross-workspace write with both workspaces in the reason", () => {
    const decision = checkWall("herdr~w1~p1", "herdr~w2~p2", { crossWorkspace: false });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("w1");
    expect(decision.reason).toContain("w2");
  });

  test("applies the same wall rule to herdr, tmux, and headless identities", () => {
    const identities = [
      ["herdr~w1~p1", "herdr~w2~p2"],
      ["tmux~w1~%251", "tmux~w2~%252"],
      ["headless~w1~1001", "headless~w2~1002"],
    ] as const;

    for (const [actor, target] of identities) {
      expect(checkWall(actor, target, { crossWorkspace: false })).toMatchObject({ allowed: false });
      expect(checkWall(actor, target, { crossWorkspace: true })).toEqual({ allowed: true });
    }
  });

  test("allows a cross-workspace write with an explicit override", () => {
    expect(checkWall("herdr~w1~p1", "herdr~w2~p2", { crossWorkspace: true })).toEqual({ allowed: true });
  });

  test("allows legacy unscoped targets", () => {
    expect(checkWall("herdr~w1~p1", "legacy-target", { crossWorkspace: false })).toEqual({ allowed: true });
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
