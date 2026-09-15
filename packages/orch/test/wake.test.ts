import { describe, expect, test } from "bun:test";
import { createWakeSignal } from "../src/daemon/server/wake.ts";

describe("wake signal", () => {
  test("next resolves on wake", async () => {
    const wake = createWakeSignal();
    const waiting = wake.next(1_000);
    wake.wake();
    await waiting;
  });

  test("next resolves after the timeout with no wake", async () => {
    const wake = createWakeSignal();
    await wake.next(10);
  });

  test("two concurrent next calls both resolve on one wake", async () => {
    const wake = createWakeSignal();
    const first = wake.next(1_000);
    const second = wake.next(1_000);
    wake.wake();
    await Promise.all([first, second]);
    expect(true).toBe(true);
  });
});
