import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkOrphanDaemons } from "../src/doctor/daemon.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const seeded: string[] = [];

function seedLockDir(pid: number): string {
  const dir = join(tmpdir(), `orch-orphan-check-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(dir, { recursive: true });
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
    const result = checkOrphanDaemons(join(tmpdir(), "orch-orphan-check-own"));
    expect(result.status).toBe("warn");
    expect(result.detail).toContain(dir);
    expect(result.detail).toContain("unproven owner");
    if (result.fix) expect(result.fix.description).not.toContain(`pid ${process.pid}`);
  });

  test("a dead pid's lock is not an orphan", () => {
    const dir = seedLockDir(2_147_000_000);
    expect(checkOrphanDaemons(join(tmpdir(), "orch-orphan-check-own")).detail).not.toContain(dir);
  });

  test("the caller's own orch dir is never reported against itself", () => {
    const dir = seedLockDir(process.pid);
    expect(checkOrphanDaemons(dir).detail).not.toContain(dir);
  });
});
