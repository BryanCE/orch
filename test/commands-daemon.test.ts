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
  test("reads only a positive integer lock pid", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-command-daemon-"));
    try { writeFileSync(join(dir, "orchd.lock"), JSON.stringify({ pid: 321 })); expect(daemonLockPid(dir)).toBe(321); writeFileSync(join(dir, "orchd.lock"), JSON.stringify({ pid: 0 })); expect(daemonLockPid(dir)).toBeUndefined(); } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
