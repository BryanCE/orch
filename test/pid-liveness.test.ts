// Pins the liveness contract that extensions/pi/peers.ts now depends on after
// deleting its local isPidAlive: a process that exists but belongs to another
// user (process.kill throws EPERM) must count as ALIVE, not dead. The old peers
// copy lacked the EPERM arm and would drop such peers as absent.
import { afterEach, describe, expect, test } from "bun:test";
import { pidAlive } from "../src/util.ts";

const realKill = process.kill.bind(process);

afterEach(() => {
  process.kill = realKill;
});

function stubKill(code: string | undefined): void {
  process.kill = (_pid: number, _signal?: string | number): true => {
    const error = new Error(`kill ${code ?? "ok"}`) as NodeJS.ErrnoException;
    if (code !== undefined) error.code = code;
    throw error;
  };
}

describe("pidAlive liveness contract (shared by pi peers)", () => {
  test("EPERM means the process exists under another user — alive", () => {
    stubKill("EPERM");
    expect(pidAlive(4321)).toBe(true);
  });

  test("ESRCH means no such process — dead", () => {
    stubKill("ESRCH");
    expect(pidAlive(4321)).toBe(false);
  });

  test("the current process is alive", () => {
    expect(pidAlive(process.pid)).toBe(true);
  });

  test("non-positive and non-numeric pids are rejected without signalling", () => {
    let signalled = false;
    process.kill = (): true => {
      signalled = true;
      return true;
    };
    expect(pidAlive(0)).toBe(false);
    expect(pidAlive(-1)).toBe(false);
    expect(pidAlive("123")).toBe(false);
    expect(pidAlive(undefined)).toBe(false);
    expect(signalled).toBe(false);
  });
});
