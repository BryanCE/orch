import { describe, expect, test } from "bun:test";
import { acknowledgeDelivery, confirmDelivery } from "../src/control/ack.ts";
import type { ControlAck } from "../src/types/control.ts";

/** A send that answers immediately, without an `async` body that never awaits. */
function answers(ack: ControlAck): () => Promise<ControlAck> {
  return () => Promise.resolve(ack);
}

/** The rejection a call produced, as a string, for a test asserting on its text. */
async function rejection(call: Promise<unknown>): Promise<string> {
  try {
    await call;
    return "";
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe("control delivery acknowledgements", () => {
  test("waits for the matching reader acknowledgement", async () => {
    let done = false;
    const result = confirmDelivery("steer", 1000, answers("expected")).then((ack) => { done = true; return ack; });
    acknowledgeDelivery("other-request");
    await Promise.resolve();
    expect(done).toBe(false);
    acknowledgeDelivery("steer");
    expect(await result).toBe("acknowledged");
  });

  test("captures an acknowledgement arriving during delivery", async () => {
    expect(await confirmDelivery("fast", 1000, () => {
      acknowledgeDelivery("fast");
      return Promise.resolve<ControlAck>("none");
    })).toBe("acknowledged");
  });

  test("never claims consumption for an unacknowledged channel", async () => {
    expect(await confirmDelivery("unavailable", 1000, answers("none"))).toBe("unavailable");
  });

  test("times out without claiming that delivery was cancelled", async () => {
    expect(await rejection(confirmDelivery("silent", 1, answers("expected"))))
      .toContain("not acknowledged within 1ms; it may still arrive");
    acknowledgeDelivery("silent");
    expect(await rejection(confirmDelivery("silent", 1, answers("expected")))).toContain("not acknowledged");
  });

  test("propagates a failed send and removes its waiter", async () => {
    expect(await rejection(confirmDelivery("failed", 1000, () => Promise.reject(new Error("refused")))))
      .toContain("refused");
    acknowledgeDelivery("failed");
    expect(await confirmDelivery("failed", 1000, answers("none"))).toBe("unavailable");
  });
});
