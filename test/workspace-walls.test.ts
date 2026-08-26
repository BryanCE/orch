import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { entityWorkspace, scopeEntitiesToWorkspace, workspaceOf, type Entity } from "../src/entities.ts";
import { checkWall } from "../src/policy/workspace.ts";
import { nextQueuedTask, type TaskRec } from "../src/queue.ts";
import { insertSpawnedRecord } from "../src/store/spawned-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const orchDir = mkdtempSync(join(tmpdir(), "orch-workspace-walls-"));
process.env.ORCH_DIR = orchDir;
for (const [pane, workspace] of [
  ["herdr~w6~p21", "w6"], ["herdr~w12~p3", "w12"], ["herdr~w1~p1", "w1"], ["herdr~w1~p2", "w1"], ["herdr~w2~p2", "w2"],
  ["tmux~w1~%251", "w1"], ["tmux~w2~%252", "w2"], ["headless~w1~1001", "w1"], ["headless~w2~1002", "w2"],
] as const) insertSpawnedRecord(orchDir, { pane, workspace });

afterAll(() => removeTempDir(orchDir));

function fakeEntity(key: string, paneId: string | null): Entity {
  return { key, paneId, managed: true, workspace: null, name: null, tabLabel: null, agent: null, focused: false, backendStatus: null, backend: null, presence: null, sessionPath: null, presenceOnly: true };
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
  test("reads workspace ids from the spawned registry", () => {
    expect(workspaceOf(orchDir, "herdr~w6~p21")).toBe("w6");
    expect(workspaceOf(orchDir, "herdr~w12~p3")).toBe("w12");
    expect(workspaceOf(orchDir, "session-123")).toBeNull();
    expect(workspaceOf(orchDir, null)).toBeNull();
    expect(workspaceOf(orchDir, "nocolon")).toBeNull();
  });

  test("derives an entity workspace from the registry", () => {
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
    expect(checkWall(orchDir, "herdr~w1~p1", "herdr~w1~p2", { crossWorkspace: false })).toEqual({ allowed: true });
  });

  test("denies a cross-workspace write with both workspaces in the reason", () => {
    const decision = checkWall(orchDir, "herdr~w1~p1", "herdr~w2~p2", { crossWorkspace: false });
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
      expect(checkWall(orchDir, actor, target, { crossWorkspace: false })).toMatchObject({ allowed: false });
      expect(checkWall(orchDir, actor, target, { crossWorkspace: true })).toEqual({ allowed: true });
    }
  });

  test("allows a cross-workspace write with an explicit override", () => {
    expect(checkWall(orchDir, "herdr~w1~p1", "herdr~w2~p2", { crossWorkspace: true })).toEqual({ allowed: true });
  });

  test("allows legacy unscoped targets", () => {
    expect(checkWall(orchDir, "herdr~w1~p1", "legacy-target", { crossWorkspace: false })).toEqual({ allowed: true });
  });
});

describe("workspace-aware queued task selection", () => {
  test("excludes tasks pinned to another workspace", () => {
    const task = fakeTask("w8-task", "2026-01-01T00:00:00.000Z", "w8");
    expect(nextQueuedTask([task], "pi", "w1")).toBeUndefined();
    expect(nextQueuedTask([task], "pi", "w8")).toBe(task);
  });

  test("skips a malformed unscoped task in every workspace", () => {
    const task = fakeTask("orphan", "2026-01-01T00:00:00.000Z");
    expect(nextQueuedTask([task], "pi", "w1")).toBeUndefined();
    expect(nextQueuedTask([task], "pi", "w8")).toBeUndefined();
    expect(nextQueuedTask([task], "pi")).toBeUndefined();
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
