import { afterEach, describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkOrphanDaemons } from "../src/doctor/daemon.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

import type { OrchDir } from "../src/types/core.ts";
const seeded: OrchDir[] = [];

function seedLockDir(pid: number): OrchDir {
  const dir = tempOrchDir("orch-orphan-check-");
  writeFileSync(join(dir, "orchd.lock"), JSON.stringify({ pid, codeHash: "abc123", startedAt: new Date().toISOString() }));
  seeded.push(dir);
  return dir;
}

afterEach(() => {
  while (seeded.length) removeTempDir(seeded.pop()!);
});

describe("doctor orphaned-daemon check", () => {
  test("a live foreign lock is reported, and an unproven owner is never killable", () => {
    const dir = seedLockDir(process.pid);
    const own = tempOrchDir("orch-orphan-check-own-");
    seeded.push(own);
    const result = checkOrphanDaemons(own);
    expect(result.status).toBe("warn");
    expect(result.detail).toContain(dir);
    expect(result.detail).toContain("unproven owner");
    if (result.fix) expect(result.fix.description).not.toContain(`pid ${process.pid}`);
  }, 30_000);

  test("a dead pid's lock is not an orphan", () => {
    const dir = seedLockDir(2_147_000_000);
    const own = tempOrchDir("orch-orphan-check-own-");
    seeded.push(own);
    expect(checkOrphanDaemons(own).detail).not.toContain(dir);
  });

  test("the caller's own orch dir is never reported against itself", () => {
    const dir = seedLockDir(process.pid);
    expect(checkOrphanDaemons(dir).detail).not.toContain(dir);
  });
});
