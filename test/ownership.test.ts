import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkOwnerWrite, getOwner, setOwner } from "../src/store/sqlite";

const tempDirs: string[] = [];

function makeOrchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-ownership-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

describe("agent ownership", () => {
  test("round-trips an owner", () => {
    const orchDir = makeOrchDir();
    expect(getOwner(orchDir, "agent-1")).toBeUndefined();

    setOwner(orchDir, "agent-1", "orch-A");

    expect(getOwner(orchDir, "agent-1")).toBe("orch-A");
  });

  test("allows unowned and same-owner writes", () => {
    const orchDir = makeOrchDir();
    expect(checkOwnerWrite(orchDir, "agent-1", "orch-A")).toEqual({ ok: true });

    setOwner(orchDir, "agent-1", "orch-A");
    expect(checkOwnerWrite(orchDir, "agent-1", "orch-A")).toEqual({ ok: true });
  });

  test("denies foreign writes and supports stealing", () => {
    const orchDir = makeOrchDir();
    setOwner(orchDir, "agent-1", "orch-A");

    const denied = checkOwnerWrite(orchDir, "agent-1", "orch-B");
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.reason).toContain("orch-A");

    expect(checkOwnerWrite(orchDir, "agent-1", "orch-B", { steal: true })).toEqual({
      ok: true,
      reassigned: true,
    });
    expect(getOwner(orchDir, "agent-1")).toBe("orch-B");
  });
});
