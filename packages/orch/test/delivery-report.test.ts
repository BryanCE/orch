import { describe, expect, test } from "bun:test";
import { deliveryLine, writeDelivery, type Delivery } from "../src/commands/delivery.ts";
import { captureCommand } from "./helpers/stdout.ts";

const acknowledged: Delivery = {
  target: "agent-key",
  name: "api-types",
  action: "dispatch",
  id: "dispatch-id",
  ack: "acknowledged",
};

const unavailable: Delivery = { ...acknowledged, ack: "unavailable" };

describe("delivery report", () => {
  test("formats acknowledged delivery", () => {
    expect(deliveryLine(acknowledged, 250)).toBe("Delivered to api-types (dispatch dispatch-id)");
  });

  test("formats queued delivery", () => {
    expect(deliveryLine(unavailable, 250)).toBe("Queued for api-types (dispatch dispatch-id): no ack within 250ms");
  });

  test("appends a suffix", () => {
    expect(deliveryLine(acknowledged, 250, " from source")).toBe("Delivered to api-types (dispatch dispatch-id) from source");
  });

  test("writes a broadcast delivery record", async () => {
    const { text } = await captureCommand(() => Promise.resolve().then(() => {
      writeDelivery({ ...acknowledged, action: "broadcast" }, { json: false, ackMs: 250 });
    }));
    expect(text).toBe("Delivered to api-types (broadcast dispatch-id)\n");
  });

  test("writes one json line", async () => {
    const { text } = await captureCommand(() => Promise.resolve().then(() => {
      writeDelivery(acknowledged, { json: true, ackMs: 250 });
    }));
    expect(text).toBe('{"target":"agent-key","name":"api-types","action":"dispatch","id":"dispatch-id","ack":"acknowledged"}\n');
  });
});
