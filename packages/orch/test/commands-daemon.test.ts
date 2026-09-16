import { describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { governanceFlags } from "../src/commands/daemon.ts";
import { parseCommand } from "../src/commands/registry.ts";
import { RPC_RESULTS } from "../src/daemon/client/protocol.ts";
import { daemonLockPid } from "../src/daemon/client/reach.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

describe("commands/daemon", () => {
  test("parses governance and validates daemon status", () => {
    const directory = tempOrchDir("orch-command-daemon-");
    try {
      const { flags, positional } = parseCommand("steer", ["--steal", "x", "--cross-space"]);
      expect(governanceFlags(flags)).toEqual({ steal: true, crossSpace: true });
      expect(positional).toEqual(["x"]);
      expect(RPC_RESULTS["daemon-status"].safeParse({
        pid: 1,
        startedAt: "now",
        uptimeSec: 1,
        codeHash: "h",
        socket: "s",
        subsystems: { workLoop: "running", livenessTick: "running", settingsWatch: "running" },
      }).success).toBe(true);
      expect(RPC_RESULTS["daemon-status"].safeParse({ pid: "1" }).success).toBe(false);
    } finally {
      removeTempDir(directory);
    }
  });
  test("reads a lock pid only from a complete lock record", () => {
    const dir = tempOrchDir("orch-command-daemon-");
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
      removeTempDir(dir);
    }
  });
});
