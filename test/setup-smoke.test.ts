import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { runSetupSmoke } from "../src/commands/setup.ts";
import type { SmokeSteps } from "../src/types/command.ts";

/** Capture everything written to stdout+stderr so the smoke's verdict lines are assertable
 *  without a live daemon, model, or real spawn. */
let output: string;
let restore: (() => void) | null = null;
/** Keys torn down by the default `cleanup` leg, so a test can assert teardown without overriding it. */
let cleanedKeys: string[] = [];

beforeEach(() => {
  output = "";
  cleanedKeys = [];
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
  return {
    spawnHeadless: () => Promise.resolve("smokeagen1"),
    buildPrompt: () => "ready?",
    readResultText: () => "ready",
    cleanup: (key) => { cleanedKeys.push(key); },
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
    expect(cleanedKeys).toEqual(["smokeagen1"]);
  });

  test("the agent is launched on the prompt it built", async () => {
    let launchedOn = "";
    await runSetupSmoke("/tmp/smoke", steps({
      buildPrompt: () => "Reply with the single word: ready",
      spawnHeadless: (_cwd, prompt) => { launchedOn = prompt; return Promise.resolve("smokeagen1"); },
    }));
    expect(launchedOn).toBe("Reply with the single word: ready");
  });

  test("an agent that launches but yields no result times out and fails non-zero", async () => {
    let ticks = 0;
    let polls = 0;
    let cleaned = "";
    const ok = await runSetupSmoke("/tmp/smoke", steps({
      readResultText: () => { polls++; return undefined; },
      // deadline read + one in-window poll, then now() jumps past the deadline so the loop exits fast.
      now: () => (ticks++ < 2 ? 0 : 10_000),
      cleanup: (key) => { cleaned = key; },
      timeoutMs: 1000,
    }));
    expect(polls).toBeGreaterThan(0);
    expect(ok).toBe(false);
    // The smoke REPORTS; it never fails setup's exit code.
    expect(process.exitCode).toBeUndefined();
    expect(output).toContain("no result came back");
    expect(output).toContain("did not complete a work round-trip");
    // A timed-out smoke still tears down the spawned agent.
    expect(cleaned).toBe("smokeagen1");
  });

  test("a rejected spawn fails loudly and never polls for a result", async () => {
    let polls = 0;
    const ok = await runSetupSmoke("/tmp/smoke", steps({
      spawnHeadless: () => Promise.reject(new Error("headless spawn recorded no new agent")),
      readResultText: () => { polls++; return "ready"; },
    }));
    expect(ok).toBe(false);
    // The smoke REPORTS; it never fails setup's exit code.
    expect(process.exitCode).toBeUndefined();
    expect(output).toContain("orch could not deliver work");
    expect(output).toContain("headless spawn recorded no new agent");
    expect(polls).toBe(0);
  });
});
