import { describe, expect, test, afterEach } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireCommandLock, matchesLockedCommand, readCommandLock, releaseCommandLock } from "../src/cmd-lock.ts";
import { cmdLock } from "../src/commands/lock.ts";

const directories: string[] = [];
function tempDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-cmd-lock-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("command lock", () => {
  test("acquire and release round-trip", async () => {
    const directory = tempDirectory();
    const lock = await acquireCommandLock(directory, { holder: "agent-a" });
    expect(readCommandLock(directory)).toEqual(lock);
    expect(releaseCommandLock(directory, lock.pid)).toBe(true);
    expect(readCommandLock(directory)).toBeNull();
  });

  test("second acquire blocks until first releases", async () => {
    const directory = tempDirectory();
    const first = await acquireCommandLock(directory, { holder: "first" });
    const waiting = acquireCommandLock(directory, { holder: "second", pollMs: 5, timeoutMs: 2_000 });
    await new Promise((resolve) => setTimeout(resolve, 35));
    expect(readCommandLock(directory)?.holder).toBe("first");
    releaseCommandLock(directory, first.pid);
    await expect(waiting).resolves.toMatchObject({ holder: "second" });
    releaseCommandLock(directory);
  });

  test("dead-pid lock is reaped", async () => {
    const directory = tempDirectory();
    writeFileSync(join(directory, "cmd-lock.json"), JSON.stringify({ pid: 999999999, holder: "dead", ts: Date.now() }));
    await expect(acquireCommandLock(directory, { holder: "live", pollMs: 5, timeoutMs: 500 })).resolves.toMatchObject({ holder: "live" });
    releaseCommandLock(directory);
  });

  test("release with wrong pid refuses", async () => {
    const directory = tempDirectory();
    const lock = await acquireCommandLock(directory, { holder: "owner" });
    expect(releaseCommandLock(directory, lock.pid + 1)).toBe(false);
    expect(readCommandLock(directory)?.holder).toBe("owner");
    releaseCommandLock(directory);
  });

  test("matches locked command prefixes and probes settings", async () => {
    expect(matchesLockedCommand(["bun", "test", "test/x.test.ts"], ["bun test"])).toBe(true);
    expect(matchesLockedCommand(["bun", "run", "check"], ["bun test"])).toBe(false);
    const directory = tempDirectory();
    writeFileSync(join(directory, "settings.json"), JSON.stringify({ schemaVersion: 3, locked_commands: ["bun test", "npm run build"] }));
    const previousDir = process.env.ORCH_DIR;
    process.env.ORCH_DIR = directory;
    try {
      await expect(cmdLock(["check", "--", "bun", "test", "test/x.test.ts"])).resolves.toBe(3);
      await expect(cmdLock(["check", "--", "bun", "run", "lint"])).resolves.toBe(0);
    } finally {
      if (previousDir === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = previousDir;
    }
  });

  test("run propagates the child exit code", async () => {
    const directory = tempDirectory();
    const previousDir = process.env.ORCH_DIR;
    process.env.ORCH_DIR = directory;
    try {
      await expect(cmdLock(["run", "--", process.execPath, "-e", "process.exit(7)"])).resolves.toBe(7);
      expect(existsSync(join(directory, "cmd-lock.json"))).toBe(false);
    } finally {
      if (previousDir === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = previousDir;
    }
  }, 20_000);
});
