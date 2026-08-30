import { describe, expect, test } from "bun:test";
import { retryingAsync, retryingSync } from "../src/retry.ts";
import type { RetryPolicy } from "../src/types/core.ts";

const POLICY: RetryPolicy = { attempts: 3, delayMs: 10, backoff: 2 };

describe("one retry policy", () => {
  test("retries flaky async and sync operations through the shared helper", async () => {
    let asyncCalls = 0;
    const asyncValue = await retryingAsync("async flaky", () => {
      asyncCalls += 1;
      if (asyncCalls < 3) throw new Error("not yet");
      return Promise.resolve("ok");
    }, POLICY, { sleepAsync: () => Promise.resolve() });
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
    await retryingAsync("scheduled", () => {
      calls += 1;
      if (calls < 3) throw new Error("not yet");
      return Promise.resolve(true);
    }, POLICY, { sleepAsync: (ms) => { waits.push(ms); return Promise.resolve(); } });
    expect(waits).toEqual([10, 20]);
  });

  test("surfaces the last error after exactly attempts tries", async () => {
    let calls = 0;
    // T is named because this operation only ever throws: left to inference it
    // resolves to `never`, the call's own type collapses to `Promise<never>`, and
    // the await then reads as an await of a non-thenable.
    await expect(retryingAsync<string>("always flaky", () => {
      calls += 1;
      throw new Error(`failure ${calls}`);
    }, POLICY, { sleepAsync: () => Promise.resolve() })).rejects.toThrow("failure 3");
    expect(calls).toBe(3);

    let syncCalls = 0;
    expect(() => retryingSync("always sync flaky", () => {
      syncCalls += 1;
      throw new Error(`sync failure ${syncCalls}`);
    }, POLICY, { sleepSync: () => undefined })).toThrow("sync failure 3");
    expect(syncCalls).toBe(3);
  });
});
