import { afterEach, describe, expect, test } from "bun:test";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildEntities, entityWorkspace } from "../src/entities.ts";
import { presenceAgentDir } from "../src/presence/store.ts";
import { insertSpawnedRecord } from "../src/store/spawned-rows.ts";
import { checkWall, sameWorkspace, scopeToWorkspace, workspaceName, workspaceOf } from "../src/policy/workspace.ts";

const originalOrchDir = process.env.ORCH_DIR;
const fixtureDirs: string[] = [];

afterEach(() => {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  while (fixtureDirs.length) removeTempDir(fixtureDirs.pop()!);
});

function identityFixture() {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-workspace-policy-"));
  fixtureDirs.push(orchDir);
  const actorKey = "headless~key-actor~actor-handle";
  const targetKey = "headless~key-target~target-handle";
  for (const [key, handle] of [[actorKey, "actor-handle"], [targetKey, "target-handle"]] as const) {
    const directory = presenceAgentDir(key, orchDir);
    mkdirSync(directory, { recursive: true });
    insertSpawnedRecord(orchDir, { pane: key, backend: "headless", workspace: "reported-workspace", handle });
    writeFileSync(join(directory, "status.json"), JSON.stringify({
      schema: PRESENCE_SCHEMA, key, paneId: handle, pid: process.pid, agent: "pi", state: "idle",
    }));
  }
  process.env.ORCH_DIR = orchDir;
  return { actorKey, targetKey };
}

describe("workspace policy", () => {
  test("reads workspaces from the spawned registry", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-workspace-registry-"));
    fixtureDirs.push(dir);
    insertSpawnedRecord(dir, { pane: "herdr~wD~p2", workspace: "wD" });
    insertSpawnedRecord(dir, { pane: "tmux~main~%255", workspace: "main" });
    insertSpawnedRecord(dir, { pane: "headless~local~1234", workspace: "local" });
    expect(workspaceOf(dir, "herdr~wD~p2")).toBe("wD");
    expect(workspaceOf(dir, "tmux~main~%255")).toBe("main");
    expect(workspaceOf(dir, "headless~local~1234")).toBe("local");
    expect(workspaceOf(dir, "wD:p1")).toBeNull();
    expect(workspaceOf(dir, "session-123")).toBeNull();
    expect(workspaceOf(dir, null)).toBeNull();
    expect(workspaceOf(dir, undefined)).toBeNull();
  });

  test("resolves workspace names through records and functions", () => {
    expect(workspaceName("wD", { wD: "Design" })).toBe("Design");
    expect(workspaceName("wC", (id) => id === "wC" ? "Code" : undefined)).toBe("Code");
    expect(workspaceName("wX", { wD: "Design" })).toBe("wX");
    expect(workspaceName(null, {})).toBeNull();
  });

  test("compares serialized keys by their workspace", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-workspace-compare-"));
    fixtureDirs.push(dir);
    for (const [pane, workspace] of [["herdr~wD~p0", "wD"], ["herdr~wD~p2", "wD"], ["herdr~w1~p1", "w1"], ["herdr~w2~p2", "w2"]] as const)
      insertSpawnedRecord(dir, { pane, workspace });
    expect(sameWorkspace(workspaceOf(dir, "herdr~wD~p0"), workspaceOf(dir, "herdr~wD~p2"))).toBe(true);
    expect(sameWorkspace(workspaceOf(dir, "herdr~w1~p1"), workspaceOf(dir, "herdr~w2~p2"))).toBe(false);
    expect(sameWorkspace(null, "w8")).toBe(false);
  });

  test("enforces the workspace wall", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-workspace-wall-"));
    fixtureDirs.push(dir);
    for (const [pane, workspace] of [["herdr~wD~p0", "wD"], ["herdr~wD~p2", "wD"], ["herdr~w1~p1", "w1"], ["herdr~w2~p2", "w2"], ["headless~local~1", "local"], ["tmux~local~%5", "local"]] as const)
      insertSpawnedRecord(dir, { pane, workspace });
    expect(checkWall(dir, "herdr~wD~p0", "herdr~wD~p2", { crossWorkspace: false }).allowed).toBe(true);
    expect(checkWall(dir, "herdr~w1~p1", "herdr~w2~p2", { crossWorkspace: false }).allowed).toBe(false);
    expect(checkWall(dir, "herdr~w1~p1", "herdr~w2~p2", { crossWorkspace: true }).allowed).toBe(true);
    expect(checkWall(dir, null, "herdr~w2~p2", { crossWorkspace: false }).allowed).toBe(true);
    expect(checkWall(dir, "headless~local~1", "tmux~local~%5", { crossWorkspace: false }).allowed).toBe(true);
  });

  test("scopes serialized identity keys to the current workspace", () => {
    const items = ["herdr~w1~p1", "tmux~w2~%5", "session-123"];
    const dir = mkdtempSync(join(tmpdir(), "orch-workspace-scope-"));
    fixtureDirs.push(dir);
    insertSpawnedRecord(dir, { pane: "herdr~w1~p1", workspace: "w1" });
    insertSpawnedRecord(dir, { pane: "tmux~w2~%5", workspace: "w2" });
    expect(scopeToWorkspace(dir, items, (item) => item, "w1", { all: false })).toEqual(["herdr~w1~p1"]);
  });

  test("null current workspace leaves items unscoped", () => {
    const items = ["herdr~w1~p1", "herdr~w2~p2", "session-123"];
    const dir = mkdtempSync(join(tmpdir(), "orch-workspace-scope-null-"));
    fixtureDirs.push(dir);
    expect(scopeToWorkspace(dir, items, (item) => item, null, { all: false })).toBe(items);
  });

  test("2.7 status displays the reported workspace identity field", () => {
    const { actorKey } = identityFixture();
    const entity = buildEntities().find((candidate) => candidate.key === actorKey)!;

    expect(entityWorkspace(entity)).toBe("reported-workspace");
    expect(entityWorkspace(entity)).not.toBe("key-actor");
  });

  test("6.6 structured identity drives status and policy, not serialized key text", () => {
    const { actorKey, targetKey } = identityFixture();
    const entities = buildEntities();
    const actor = entities.find((entity) => entity.key === actorKey)!;
    const target = entities.find((entity) => entity.key === targetKey)!;
    const actorWorkspace = entityWorkspace(actor);
    const targetWorkspace = entityWorkspace(target);

    expect(actorWorkspace).toBe("reported-workspace");
    expect(targetWorkspace).toBe("reported-workspace");
    expect(actorKey).not.toContain(actorWorkspace!);
    expect(targetKey).not.toContain(targetWorkspace!);
    expect(sameWorkspace(actorWorkspace, targetWorkspace)).toBe(true);
    expect(checkWall(
      process.env.ORCH_DIR!,
      actorKey,
      targetKey,
      { crossWorkspace: false },
    ).allowed).toBe(true);
  });
});
