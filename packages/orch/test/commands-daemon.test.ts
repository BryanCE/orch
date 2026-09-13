import type { OrchDir } from "../src/types/core.ts";
import { describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseGovernance, validDaemonStatus } from "../src/commands/daemon.ts";
import { daemonLockPid } from "../src/daemon/reach.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { testServices } from "./helpers/services.ts";
import { HARNESS_SESSION_ENV } from "../src/adapters/session-env.ts";
import { isolateHarnessSession } from "./helpers/env.ts";

describe("commands/daemon", () => {
  test("parses governance and validates daemon status", () => {
    const directory: OrchDir = tempOrchDir("orch-command-daemon-");
    const restoreHarness = isolateHarnessSession("pi");
    const marker = HARNESS_SESSION_ENV.pi.marker;
    const sessionId = HARNESS_SESSION_ENV.pi.sessionId;
    const savedMarker = process.env[marker];
    const savedSessionId = process.env[sessionId];
    delete process.env[marker];
    delete process.env[sessionId];
    try {
      expect(parseGovernance(testServices({ orchDir: directory }), ["--steal", "x", "--cross-space"])).toEqual({ gov: { steal: true, crossSpace: true }, rest: ["x"] });
      expect(validDaemonStatus({ pid: 1, startedAt: "now", uptimeSec: 1, codeHash: "h", socket: "s" })).toBe(true);
      expect(validDaemonStatus({ pid: "1" })).toBe(false);
    } finally {
      removeTempDir(directory);
      restoreHarness();
      if (savedMarker === undefined) delete process.env[marker];
      else process.env[marker] = savedMarker;
      if (savedSessionId === undefined) delete process.env[sessionId];
      else process.env[sessionId] = savedSessionId;
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
