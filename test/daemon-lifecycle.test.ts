import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  acquireDaemonLock,
  computeCodeHash,
  daemonize,
  releaseDaemonLock,
  reexecSelf,
  runForeground,
  readDaemonLock,
} from "../src/daemon/lifecycle";

const tempDirs: string[] = [];

function makeOrchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-daemon-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe("daemon lifecycle", () => {
  test("acquires once and refuses a second live owner", () => {
    const orchDir = makeOrchDir();

    expect(acquireDaemonLock(orchDir, () => false)).toBe(true);
    expect(acquireDaemonLock(orchDir, () => false)).toBe(false);

    const lock = JSON.parse(readFileSync(join(orchDir, "orchd.lock"), "utf8"));
    expect(lock).toEqual({
      pid: process.pid,
      codeHash: expect.any(String),
      startedAt: expect.any(String),
      ...(process.platform === "win32" ? {} : { startTicks: expect.any(String) }),
    });
    releaseDaemonLock(orchDir);
  });

  test("reclaims a dead lock only when its socket does not answer", () => {
    const orchDir = makeOrchDir();
    writeFileSync(
      join(orchDir, "orchd.lock"),
      JSON.stringify({ pid: 999999999, codeHash: "old", startedAt: "2026-01-01T00:00:00.000Z" }),
    );

    expect(acquireDaemonLock(orchDir)).toBe(true);
    releaseDaemonLock(orchDir);

    writeFileSync(
      join(orchDir, "orchd.lock"),
      JSON.stringify({ pid: 999999999, codeHash: "old", startedAt: "2026-01-01T00:00:00.000Z" }),
    );
    expect(acquireDaemonLock(orchDir, () => true)).toBe(false);
  });

  test("rejects malformed locks and a socket probe that fails", () => {
    const orchDir = makeOrchDir();
    writeFileSync(join(orchDir, "orchd.lock"), "not json");
    expect(acquireDaemonLock(orchDir, () => false)).toBe(false);

    writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify({ pid: 1 }));
    expect(acquireDaemonLock(orchDir, () => false)).toBe(false);

    writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify({ pid: 0, codeHash: "old", startedAt: "now" }));
    expect(acquireDaemonLock(orchDir, () => { throw new Error("probe failed"); })).toBe(false);
    releaseDaemonLock(orchDir);
    releaseDaemonLock(orchDir);
  });

  test("retries if a stale lock disappears during reclaim", () => {
    const orchDir = makeOrchDir();
    writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify({ pid: 0, codeHash: "old", startedAt: "now" }));
    expect(acquireDaemonLock(orchDir, (socket) => {
      rmSync(join(orchDir, "orchd.lock"));
      expect(socket).toBe(join(orchDir, "orchd.sock"));
      return false;
    })).toBe(true);
    releaseDaemonLock(orchDir);
  });

  test("daemonizes to an explicit orch dir and supports attached foreground mode", async () => {
    const orchDir = makeOrchDir();
    const oldOrchDir = process.env.ORCH_DIR;
    delete process.env.ORCH_DIR;
    try {
      const detachedPid = daemonize(process.execPath, ["-e", "process.stdout.write('daemon-test')"], orchDir);
      expect(detachedPid).toBeGreaterThan(0);
      expect(readFileSync(join(orchDir, "orchd.log"), "utf8")).toBeDefined();
      expect(runForeground(process.execPath, ["-e", ""])).toBeGreaterThan(0);
      expect(runForeground(join(import.meta.dir, "../src/daemon/lifecycle.ts"))).toBeGreaterThan(0);
      await new Promise((resolve) => setTimeout(resolve, 50));
    } finally {
      if (oldOrchDir === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = oldOrchDir;
    }
  });

  test("reexecs with the current argv and hands over the lock", () => {
    const orchDir = makeOrchDir();
    expect(acquireDaemonLock(orchDir, () => false)).toBe(true);
    const exit = Object.getOwnPropertyDescriptor(process, "exit");
    const oldOrchDir = process.env.ORCH_DIR;
    const oldArgv = [...process.argv];
    process.env.ORCH_DIR = orchDir;
    // Reexec the current runtime with an empty inline script, not a Unix-only helper.
    process.argv.splice(0, process.argv.length, process.execPath, "-e", "");
    Object.defineProperty(process, "exit", {
      value: (code?: number) => { throw new Error(`exit:${code ?? 0}`); },
      configurable: true,
    });
    try {
      expect(() => reexecSelf(orchDir)).toThrow("exit:0");
      expect(() => readFileSync(join(orchDir, "orchd.lock"))).toThrow();
    } finally {
      process.argv.splice(0, process.argv.length, ...oldArgv);
      if (exit) Object.defineProperty(process, "exit", exit);
      if (oldOrchDir === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = oldOrchDir;
    }
  });

  test("rejects a recycled pid identity", () => {
    const orchDir = makeOrchDir();
    expect(acquireDaemonLock(orchDir)).toBe(true);
    if (process.platform === "win32") {
      // Windows has no /proc start-tick identity source, so this Linux-only assertion is not applicable.
      releaseDaemonLock(orchDir);
      return;
    }
    const lock = JSON.parse(readFileSync(join(orchDir, "orchd.lock"), "utf8"));
    lock.startTicks = "not-the-current-process";
    writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify(lock));

    expect(readDaemonLock(orchDir)).toBeNull();
    expect(acquireDaemonLock(orchDir, () => false)).toBe(true);
    releaseDaemonLock(orchDir);
  });

  test("hash is stable and changes when entrypoint content changes", () => {
    const orchDir = makeOrchDir();
    const entrypoint = join(orchDir, "entry.ts");
    writeFileSync(entrypoint, "export const value = 1;\n");
    const first = computeCodeHash(entrypoint);

    expect(computeCodeHash(entrypoint)).toBe(first);
    writeFileSync(entrypoint, "export const value = 2;\n");
    expect(computeCodeHash(entrypoint)).not.toBe(first);
  });
});
