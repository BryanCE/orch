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
    expect(deliveryLine(acknowledged)).toBe("Delivered to api-types (dispatch dispatch-id)");
  });

  test("formats queued delivery", () => {
    expect(deliveryLine(unavailable)).toBe("Queued for api-types (dispatch dispatch-id): orchd delivers it when api-types takes input; nothing to do");
  });

  test("appends a suffix", () => {
    expect(deliveryLine(acknowledged, " from source")).toBe("Delivered to api-types (dispatch dispatch-id) from source");
  });

  test("writes a broadcast delivery record", async () => {
    const { text } = await captureCommand(() => Promise.resolve().then(() => {
      writeDelivery({ ...acknowledged, action: "broadcast" }, { json: false });
    }));
    expect(text).toBe("Delivered to api-types (broadcast dispatch-id)\n");
  });

  test("writes one json line", async () => {
    const { text } = await captureCommand(() => Promise.resolve().then(() => {
      writeDelivery(acknowledged, { json: true });
    }));
    expect(text).toBe('{"target":"agent-key","name":"api-types","action":"dispatch","id":"dispatch-id","ack":"acknowledged"}\n');
  });
});
