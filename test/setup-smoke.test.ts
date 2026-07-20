import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { runSetupSmoke, type SmokeSteps } from "../src/commands/setup.ts";

/** Capture everything written to stdout+stderr so the smoke's verdict lines are assertable
 *  without a live daemon, model, or real spawn. */
let output: string;
let restore: (() => void) | null = null;

beforeEach(() => {
  output = "";
  process.exitCode = undefined;
  const originalOut = process.stdout.write.bind(process.stdout);
  const originalErr = process.stderr.write.bind(process.stderr);
  const capture = (chunk: string | Uint8Array): boolean => { output += chunk.toString(); return true; };
  (process.stdout as unknown as { write: typeof capture }).write = capture;
  (process.stderr as unknown as { write: typeof capture }).write = capture;
  restore = () => {
    process.stdout.write = originalOut;
    process.stderr.write = originalErr;
  };
});

afterEach(() => {
  restore?.();
  restore = null;
  process.exitCode = undefined;
});

/** A fully-injected step set that always reaches a clean round-trip; each test overrides one leg. */
function steps(overrides: Partial<SmokeSteps>): Partial<SmokeSteps> {
  const cleaned: string[] = [];
  return {
    spawnHeadless: () => Promise.resolve("headless~local~smoke"),
    buildPrompt: () => "ready?",
    dispatch: () => Promise.resolve(),
    readResultText: () => "ready",
    cleanup: (key) => { cleaned.push(key); },
    now: () => 0,
    sleep: () => Promise.resolve(),
    timeoutMs: 1000,
    ...overrides,
  };
}

describe("runSetupSmoke (12.5)", () => {
  test("a clean round-trip returns true and reports orch can deliver work", async () => {
    const ok = await runSetupSmoke("/tmp/smoke", steps({}));
    expect(ok).toBe(true);
    expect(process.exitCode).toBeUndefined();
    expect(output).toContain("Smoke ok");
    expect(output).toContain("orch can deliver work");
  });

  test("a rejected dispatch fails loudly and sets a non-zero exit code", async () => {
    let cleaned = "";
    const ok = await runSetupSmoke("/tmp/smoke", steps({
      dispatch: () => Promise.reject(new Error("write was not applied or acknowledged")),
      cleanup: (key) => { cleaned = key; },
    }));
    expect(ok).toBe(false);
    expect(process.exitCode).toBe(1);
    expect(output).toContain("orch could not deliver work");
    expect(output).toContain("write was not applied or acknowledged");
    // A rejected dispatch still tears down the spawned smoke agent.
    expect(cleaned).toBe("headless~local~smoke");
  });

  test("a dispatch that is accepted but yields no result times out and fails non-zero", async () => {
    let ticks = 0;
    let polls = 0;
    const ok = await runSetupSmoke("/tmp/smoke", steps({
      readResultText: () => { polls++; return undefined; },
      // deadline read + one in-window poll, then now() jumps past the deadline so the loop exits fast.
      now: () => (ticks++ < 2 ? 0 : 10_000),
      timeoutMs: 1000,
    }));
    expect(polls).toBeGreaterThan(0);
    expect(ok).toBe(false);
    expect(process.exitCode).toBe(1);
    expect(output).toContain("no result came back");
    expect(output).toContain("did not complete a work round-trip");
  });

  test("a failed spawn fails loudly before any dispatch", async () => {
    let dispatched = false;
    const ok = await runSetupSmoke("/tmp/smoke", steps({
      spawnHeadless: () => Promise.reject(new Error("headless spawn recorded no new agent")),
      dispatch: () => { dispatched = true; return Promise.resolve(); },
    }));
    expect(ok).toBe(false);
    expect(process.exitCode).toBe(1);
    expect(output).toContain("could not spawn a headless agent");
    expect(dispatched).toBe(false);
  });
});
