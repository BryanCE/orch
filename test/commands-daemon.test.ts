import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { daemonLockPid, parseGovernance, validDaemonStatus } from "../src/commands/daemon.ts";

describe("commands/daemon", () => {
  test("parses governance and validates daemon status", () => {
    expect(parseGovernance(["--steal", "x", "--cross-workspace"])).toEqual({ gov: { steal: true, crossWorkspace: true }, rest: ["x"] });
    expect(validDaemonStatus({ pid: 1, startedAt: "now", uptimeSec: 1, codeHash: "h", socket: "s" })).toBe(true);
    expect(validDaemonStatus({ pid: "1" })).toBe(false);
  });
  test("reads a lock pid only from a complete lock record", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-command-daemon-"));
    const lock = join(dir, "orchd.lock");
    const write = (record: unknown) => writeFileSync(lock, JSON.stringify(record));
    try {
      write({ pid: 321, codeHash: "h", startedAt: "2026-01-01T00:00:00.000Z" });
      expect(daemonLockPid(dir)).toBe(321);
      write({ pid: 0, codeHash: "h", startedAt: "2026-01-01T00:00:00.000Z" });
      expect(daemonLockPid(dir)).toBeUndefined();
      // A bare pid is not a lock orch wrote; there is exactly one record shape.
      write({ pid: 321 });
      expect(daemonLockPid(dir)).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
