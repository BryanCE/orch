import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { entitySpace, scopeEntitiesToSpace, spaceOf, type Entity } from "../src/entities.ts";
import { checkWall } from "../src/policy/space.ts";
import { insertSpawnedRecord } from "../src/store/spawned-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const orchDir = mkdtempSync(join(tmpdir(), "orch-space-walls-"));
process.env.ORCH_DIR = orchDir;
for (const [pane, space] of [
  ["herdr~w6~p21", "w6"], ["herdr~w12~p3", "w12"], ["herdr~w1~p1", "w1"], ["herdr~w1~p2", "w1"], ["herdr~w2~p2", "w2"],
  ["tmux~w1~%251", "w1"], ["tmux~w2~%252", "w2"], ["headless~w1~1001", "w1"], ["headless~w2~1002", "w2"],
] as const) insertSpawnedRecord(orchDir, { pane, space });

afterAll(() => removeTempDir(orchDir));

function fakeEntity(key: string, paneId: string | null): Entity {
  return { key, paneId, managed: true, space: null, name: null, tabLabel: null, agent: null, focused: false, backendStatus: null, backend: null, presence: null, sessionPath: null, presenceOnly: true };
}

describe("space helpers", () => {
  test("reads space ids from the spawned registry", () => {
    expect(spaceOf(orchDir, "herdr~w6~p21")).toBe("w6");
    expect(spaceOf(orchDir, "herdr~w12~p3")).toBe("w12");
    expect(spaceOf(orchDir, "session-123")).toBeNull();
    expect(spaceOf(orchDir, null)).toBeNull();
    expect(spaceOf(orchDir, "nocolon")).toBeNull();
  });

  test("derives an entity space from the registry", () => {
    expect(entitySpace(fakeEntity("herdr~w6~p21", null))).toBe("w6");
    expect(entitySpace(fakeEntity("herdr~w12~p3", null))).toBe("w12");
  });

  test("returns the same entities when all spaces are requested", () => {
    const entities = [fakeEntity("herdr~w6~p1", "herdr~w6~p1")];
    expect(scopeEntitiesToSpace(entities, { all: true })).toBe(entities);
  });
});

describe("space wall writes", () => {
  test("allows a write within the same space", () => {
    expect(checkWall(orchDir, "herdr~w1~p1", "herdr~w1~p2", { crossSpace: false })).toEqual({ allowed: true });
  });

  test("denies a cross-space write with both spaces in the reason", () => {
    const decision = checkWall(orchDir, "herdr~w1~p1", "herdr~w2~p2", { crossSpace: false });
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
      expect(checkWall(orchDir, actor, target, { crossSpace: false })).toMatchObject({ allowed: false });
      expect(checkWall(orchDir, actor, target, { crossSpace: true })).toEqual({ allowed: true });
    }
  });

  test("allows a cross-space write with an explicit override", () => {
    expect(checkWall(orchDir, "herdr~w1~p1", "herdr~w2~p2", { crossSpace: true })).toEqual({ allowed: true });
  });

  test("allows legacy unscoped targets", () => {
    expect(checkWall(orchDir, "herdr~w1~p1", "legacy-target", { crossSpace: false })).toEqual({ allowed: true });
  });
});
