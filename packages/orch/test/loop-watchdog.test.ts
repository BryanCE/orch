import { describe, expect, it } from "bun:test";
import { startLoopWatchdog } from "../src/daemon/server/loop-watchdog.ts";
import { recordingLogger } from "./helpers/logger.ts";

describe("loop watchdog", () => {
  it("logs a stalled loop when the interval max delay passes the threshold", async () => {
    const { logger, records } = recordingLogger();
    const watchdog = startLoopWatchdog(logger, 50, 100);

    const until = Date.now() + 150;
    while (Date.now() < until) {
      // Keep the event loop busy long enough to exceed the stall threshold.
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 250));
    watchdog.stop();

    const stalled = records.filter((record) => record.event === "loop.stalled");
    expect(stalled.length).toBeGreaterThan(0);
    const maxDelayMs = stalled
      .map((record) => record.fields?.maxDelayMs)
      .find((value): value is number => typeof value === "number");
    expect(maxDelayMs).toBeGreaterThanOrEqual(50);
  });

  it("logs one long pause once, not on every later tick", async () => {
    const { logger, records } = recordingLogger();
    const watchdog = startLoopWatchdog(logger, 50, 50);

    const until = Date.now() + 200;
    while (Date.now() < until) {
      // One pause several intervals long, as a host suspend looks to the loop.
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    watchdog.stop();

    expect(records.filter((record) => record.event === "loop.stalled").length).toBeLessThanOrEqual(2);
  });

  it("does not log when the loop stays below the threshold", async () => {
    const { logger, records } = recordingLogger();
    const watchdog = startLoopWatchdog(logger, 10_000, 100);

    await new Promise<void>((resolve) => setTimeout(resolve, 150));
    watchdog.stop();

    expect(records.filter((record) => record.event === "loop.stalled")).toHaveLength(0);
  });
});
