import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkWall } from "../src/policy/space.ts";
import { checkOwnerWrite, getOwner, setOwner } from "../src/store/ownership-rows.ts";
import { insertSpawnedRecord } from "../src/store/spawned-rows.ts";

const tempDirs: string[] = [];

function makeOrchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-broker-ownership-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
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

  test("refuses cross-space writes unless explicitly overridden", () => {
    const orchDir = makeOrchDir();
    insertSpawnedRecord(orchDir, { pane: "herdr~w1~p1", space: "w1" });
    insertSpawnedRecord(orchDir, { pane: "herdr~w1~p3", space: "w1" });
    insertSpawnedRecord(orchDir, { pane: "herdr~w2~p2", space: "w2" });
    expect(checkWall(orchDir, "herdr~w1~p1", "herdr~w1~p3", { crossSpace: false })).toEqual({ allowed: true });

    const refused = checkWall(orchDir, "herdr~w1~p1", "herdr~w2~p2", { crossSpace: false });
    expect(refused.allowed).toBe(false);
    expect(refused.reason).toContain("w1");
    expect(refused.reason).toContain("w2");

    expect(checkWall(orchDir, "herdr~w1~p1", "herdr~w2~p2", { crossSpace: true })).toEqual({ allowed: true });
  });

});
