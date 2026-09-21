import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, test } from "bun:test";
import { pidStampedWith } from "../src/process-identity.ts";

const linuxTests = describe.skipIf(process.platform !== "linux");
let child: ChildProcess | undefined;

afterEach(() => {
  if (child?.pid !== undefined) {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      // The child may have exited before cleanup.
    }
  }
  child = undefined;
});

linuxTests("pidStampedWith", () => {
  test("returns the stamped shell rather than its child", () => {
    const value = randomUUID();
    child = spawn("sh", ["-c", "sleep 30"], {
      detached: true,
      env: { ...process.env, ORCH_TEST_STAMP: value },
    });
    if (child.pid === undefined) throw new Error("spawn did not return a pid");

    expect(pidStampedWith("ORCH_TEST_STAMP", value)).toBe(child.pid);
  });

  test("returns null for an unknown value", () => {
    expect(pidStampedWith("ORCH_TEST_STAMP", randomUUID())).toBeNull();
  });
});
