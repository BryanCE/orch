import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { removeTempDir } from "./helpers/tempdir.ts";
import {
  acquireDaemonLock,
  acquireDaemonRegistration,
  clearDaemonRuntime,
  computeCodeHash,
  daemonize,
  provenDaemonPid,
  releaseDaemonLock,
  releaseDaemonRegistration,
  reexecSelf,
  runForeground,
  readDaemonLock,
} from "../src/daemon/lifecycle";

interface LockData {
  pid?: number;
  codeHash?: string;
  startedAt?: string;
  startToken?: string;
}

const tempDirs: string[] = [];

function makeOrchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-daemon-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

describe("daemon lifecycle", () => {
  test("acquires once and refuses a second live owner", () => {
    const orchDir = makeOrchDir();

    expect(acquireDaemonLock(orchDir, () => false)).toBe(true);
    expect(acquireDaemonLock(orchDir, () => false)).toBe(false);

    const lock = JSON.parse(readFileSync(join(orchDir, "orchd.lock"), "utf8")) as LockData;
    expect(lock.pid).toBe(process.pid);
    expect(typeof lock.codeHash).toBe("string");
    expect(typeof lock.startedAt).toBe("string");
    expect(typeof lock.startToken).toBe("string");
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

  test("reclaims an unreadable lock, which a crash truncated and no daemon owns", () => {
    const orchDir = makeOrchDir();
    for (const unreadable of ["", "not json", JSON.stringify({ pid: 1 })]) {
      writeFileSync(join(orchDir, "orchd.lock"), unreadable);
      expect(acquireDaemonLock(orchDir, () => false)).toBe(true);
      releaseDaemonLock(orchDir);
    }
  });

  test("refuses an unreadable lock while the socket still answers", () => {
    const orchDir = makeOrchDir();
    writeFileSync(join(orchDir, "orchd.lock"), "");
    expect(acquireDaemonLock(orchDir, () => true)).toBe(false);
  });

  test("clears the lock, socket and port a departed daemon owned, keeping the log", () => {
    const orchDir = makeOrchDir();
    for (const name of ["orchd.lock", "orchd.sock", "orchd.port", "orchd.log"]) {
      writeFileSync(join(orchDir, name), "x");
    }

    expect(clearDaemonRuntime(orchDir).length).toBe(3);
    for (const gone of ["orchd.lock", "orchd.sock", "orchd.port"]) {
      expect(existsSync(join(orchDir, gone))).toBe(false);
    }
    expect(existsSync(join(orchDir, "orchd.log"))).toBe(true);
    expect(clearDaemonRuntime(orchDir)).toEqual([]);
  });

  test("refuses a stale lock when the socket probe cannot answer", () => {
    const orchDir = makeOrchDir();
    writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify({ pid: 0, codeHash: "old", startedAt: "now" }));
    expect(acquireDaemonLock(orchDir, () => { /* noop before throwing */ throw new Error("probe failed"); })).toBe(false);
    releaseDaemonLock(orchDir);
  });

  test("retries if a stale lock disappears during reclaim", () => {
    const orchDir = makeOrchDir();
    writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify({ pid: 999999999, codeHash: "old", startedAt: "now" }));
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
      // Foreground mode resolves only once the child is gone, and reports its code.
      expect(await runForeground(process.execPath, ["-e", ""])).toBe(0);
      expect(await runForeground(process.execPath, ["-e", "process.exit(3)"])).toBe(3);
      expect(await runForeground(join(import.meta.dir, "../src/daemon/lifecycle.ts"))).toBe(0);
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
    const lock = JSON.parse(readFileSync(join(orchDir, "orchd.lock"), "utf8")) as LockData;
    lock.startToken = "not-the-current-process";
    writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify(lock));

    expect(readDaemonLock(orchDir)).toBeNull();
    expect(acquireDaemonLock(orchDir, () => false)).toBe(true);
    releaseDaemonLock(orchDir);
  });

  test("foreign machine registration cannot be signalled for another store", () => {
    const target = makeOrchDir();
    const foreign = makeOrchDir();
    const discovery = makeOrchDir();
    const previous = process.env.ORCH_DAEMON_DISCOVERY_DIR;
    process.env.ORCH_DAEMON_DISCOVERY_DIR = discovery;
    try {
      expect(acquireDaemonRegistration(foreign).acquired).toBe(true);
      expect(provenDaemonPid(target)).toBeUndefined();
    } finally {
      releaseDaemonRegistration();
      if (previous === undefined) delete process.env.ORCH_DAEMON_DISCOVERY_DIR;
      else process.env.ORCH_DAEMON_DISCOVERY_DIR = previous;
    }
  });

  test("only a provable lock owner may be signalled", () => {
    const orchDir = makeOrchDir();
    expect(acquireDaemonLock(orchDir)).toBe(true);

    // This process really did take the lock, so it is signallable.
    expect(provenDaemonPid(orchDir)).toBe(process.pid);

    // A live pid with no identity token is a stranger the OS may have handed
    // the number to — exactly the lock that made orch SIGTERM its own caller.
    writeFileSync(
      join(orchDir, "orchd.lock"),
      JSON.stringify({ pid: process.pid, codeHash: "x", startedAt: "2026-01-01T00:00:00.000Z" }),
    );
    expect(provenDaemonPid(orchDir)).toBeUndefined();

    // So is a live pid whose token belongs to a different instance.
    writeFileSync(
      join(orchDir, "orchd.lock"),
      JSON.stringify({ pid: process.pid, codeHash: "x", startedAt: "2026-01-01T00:00:00.000Z", startToken: "someone-else" }),
    );
    expect(provenDaemonPid(orchDir)).toBeUndefined();
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
