import { afterEach, describe, expect, test } from "bun:test";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildEntities, entitySpace } from "../src/entities.ts";
import { presenceAgentDir } from "../src/presence/store.ts";
import { insertSpawnedRecord } from "../src/store/spawned-rows.ts";
import { checkWall, sameSpace, scopeToSpace, spaceName, spaceOf } from "../src/policy/space.ts";

const originalOrchDir = process.env.ORCH_DIR;
const fixtureDirs: string[] = [];

afterEach(() => {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  while (fixtureDirs.length) removeTempDir(fixtureDirs.pop()!);
});

function identityFixture() {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-space-policy-"));
  fixtureDirs.push(orchDir);
  const actorKey = "headless~key-actor~actor-handle";
  const targetKey = "headless~key-target~target-handle";
  for (const [key, handle] of [[actorKey, "actor-handle"], [targetKey, "target-handle"]] as const) {
    const directory = presenceAgentDir(key, orchDir);
    mkdirSync(directory, { recursive: true });
    insertSpawnedRecord(orchDir, { pane: key, backend: "headless", space: "reported-space", handle });
    writeFileSync(join(directory, "status.json"), JSON.stringify({
      schema: PRESENCE_SCHEMA, key, paneId: handle, pid: process.pid, agent: "pi", state: "idle",
    }));
  }
  process.env.ORCH_DIR = orchDir;
  return { actorKey, targetKey };
}

describe("space policy", () => {
  test("reads spaces from the spawned registry", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-space-registry-"));
    fixtureDirs.push(dir);
    insertSpawnedRecord(dir, { pane: "herdr~wD~p2", space: "wD" });
    insertSpawnedRecord(dir, { pane: "tmux~main~%255", space: "main" });
    insertSpawnedRecord(dir, { pane: "headless~local~1234", space: "local" });
    expect(spaceOf(dir, "herdr~wD~p2")).toBe("wD");
    expect(spaceOf(dir, "tmux~main~%255")).toBe("main");
    expect(spaceOf(dir, "headless~local~1234")).toBe("local");
    expect(spaceOf(dir, "wD:p1")).toBeNull();
    expect(spaceOf(dir, "session-123")).toBeNull();
    expect(spaceOf(dir, null)).toBeNull();
    expect(spaceOf(dir, undefined)).toBeNull();
  });

  test("resolves space names through records and functions", () => {
    expect(spaceName("wD", { wD: "Design" })).toBe("Design");
    expect(spaceName("wC", (id) => id === "wC" ? "Code" : undefined)).toBe("Code");
    expect(spaceName("wX", { wD: "Design" })).toBe("wX");
    expect(spaceName(null, {})).toBeNull();
  });

  test("compares serialized keys by their space", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-space-compare-"));
    fixtureDirs.push(dir);
    for (const [pane, space] of [["herdr~wD~p0", "wD"], ["herdr~wD~p2", "wD"], ["herdr~w1~p1", "w1"], ["herdr~w2~p2", "w2"]] as const)
      insertSpawnedRecord(dir, { pane, space });
    expect(sameSpace(spaceOf(dir, "herdr~wD~p0"), spaceOf(dir, "herdr~wD~p2"))).toBe(true);
    expect(sameSpace(spaceOf(dir, "herdr~w1~p1"), spaceOf(dir, "herdr~w2~p2"))).toBe(false);
    expect(sameSpace(null, "w8")).toBe(false);
  });

  test("enforces the space wall", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-space-wall-"));
    fixtureDirs.push(dir);
    for (const [pane, space] of [["herdr~wD~p0", "wD"], ["herdr~wD~p2", "wD"], ["herdr~w1~p1", "w1"], ["herdr~w2~p2", "w2"], ["headless~local~1", "local"], ["tmux~local~%5", "local"]] as const)
      insertSpawnedRecord(dir, { pane, space });
    expect(checkWall(dir, "herdr~wD~p0", "herdr~wD~p2", { crossSpace: false }).allowed).toBe(true);
    expect(checkWall(dir, "herdr~w1~p1", "herdr~w2~p2", { crossSpace: false }).allowed).toBe(false);
    expect(checkWall(dir, "herdr~w1~p1", "herdr~w2~p2", { crossSpace: true }).allowed).toBe(true);
    expect(checkWall(dir, null, "herdr~w2~p2", { crossSpace: false }).allowed).toBe(true);
    expect(checkWall(dir, "headless~local~1", "tmux~local~%5", { crossSpace: false }).allowed).toBe(true);
  });

  test("scopes serialized identity keys to the current space", () => {
    const items = ["herdr~w1~p1", "tmux~w2~%5", "session-123"];
    const dir = mkdtempSync(join(tmpdir(), "orch-space-scope-"));
    fixtureDirs.push(dir);
    insertSpawnedRecord(dir, { pane: "herdr~w1~p1", space: "w1" });
    insertSpawnedRecord(dir, { pane: "tmux~w2~%5", space: "w2" });
    expect(scopeToSpace(dir, items, (item) => item, "w1", { all: false })).toEqual(["herdr~w1~p1"]);
  });

  test("a null current space leaves items unscoped", () => {
    const items = ["herdr~w1~p1", "herdr~w2~p2", "session-123"];
    const dir = mkdtempSync(join(tmpdir(), "orch-space-scope-null-"));
    fixtureDirs.push(dir);
    expect(scopeToSpace(dir, items, (item) => item, null, { all: false })).toBe(items);
  });

  test("2.7 status displays the reported space identity field", () => {
    const { actorKey } = identityFixture();
    const entity = buildEntities().find((candidate) => candidate.key === actorKey)!;

    expect(entitySpace(entity)).toBe("reported-space");
    expect(entitySpace(entity)).not.toBe("key-actor");
  });

  test("6.6 structured identity drives status and policy, not serialized key text", () => {
    const { actorKey, targetKey } = identityFixture();
    const entities = buildEntities();
    const actor = entities.find((entity) => entity.key === actorKey)!;
    const target = entities.find((entity) => entity.key === targetKey)!;
    const actorSpace = entitySpace(actor);
    const targetSpace = entitySpace(target);

    expect(actorSpace).toBe("reported-space");
    expect(targetSpace).toBe("reported-space");
    expect(actorKey).not.toContain(actorSpace!);
    expect(targetKey).not.toContain(targetSpace!);
    expect(sameSpace(actorSpace, targetSpace)).toBe(true);
    expect(checkWall(
      process.env.ORCH_DIR!,
      actorKey,
      targetKey,
      { crossSpace: false },
    ).allowed).toBe(true);
  });
});
