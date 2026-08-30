import { describe, expect, test } from "bun:test";
import { retryingAsync, retryingSync } from "../src/retry.ts";
import type { RetryPolicy } from "../src/types/core.ts";

const POLICY: RetryPolicy = { attempts: 3, delayMs: 10, backoff: 2 };

describe("one retry policy", () => {
  test("retries flaky async and sync operations through the shared helper", async () => {
    let asyncCalls = 0;
    const asyncValue = await retryingAsync("async flaky", async () => {
      asyncCalls += 1;
      if (asyncCalls < 3) throw new Error("not yet");
      return "ok";
    }, POLICY, { sleepAsync: async () => undefined });
    expect(asyncValue).toBe("ok");
    expect(asyncCalls).toBe(3);

    let syncCalls = 0;
    const syncValue = retryingSync("sync flaky", () => {
      syncCalls += 1;
      if (syncCalls < 3) throw new Error("not yet");
      return "ok";
    }, POLICY, { sleepSync: () => undefined });
    expect(syncValue).toBe("ok");
    expect(syncCalls).toBe(3);
  });

  test("uses the policy's declared backoff schedule", async () => {
    const waits: number[] = [];
    let calls = 0;
    await retryingAsync("scheduled", async () => {
      calls += 1;
      if (calls < 3) throw new Error("not yet");
      return true;
    }, POLICY, { sleepAsync: async (ms) => { waits.push(ms); } });
    expect(waits).toEqual([10, 20]);
  });

  test("surfaces the last error after exactly attempts tries", async () => {
    let calls = 0;
    await expect(retryingAsync("always flaky", async () => {
      calls += 1;
      throw new Error(`failure ${calls}`);
    }, POLICY, { sleepAsync: async () => undefined })).rejects.toThrow("failure 3");
    expect(calls).toBe(3);

    let syncCalls = 0;
    expect(() => retryingSync("always sync flaky", () => {
      syncCalls += 1;
      throw new Error(`sync failure ${syncCalls}`);
    }, POLICY, { sleepSync: () => undefined })).toThrow("sync failure 3");
    expect(syncCalls).toBe(3);
  });
});
