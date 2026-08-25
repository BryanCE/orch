import { describe, expect, test } from "bun:test";
import { recipientFromStatus, recipientLabel } from "../src/recipient.ts";

describe("agent identity shown to an operator", () => {
  test("names the agent and its harness, never the transport key", () => {
    const label = recipientLabel({
      name: "snapshot-recon-1",
      harness: "pi",
      multiplexer: "herdr",
      transportId: "herdr~wF~v4gh24w0af",
    });

    expect(label).toBe("pi/herdr: snapshot-recon-1");
    expect(label).not.toContain("v4gh24w0af");
  });

  test("drops the routing prefix when nothing is known about it", () => {
    expect(recipientLabel({ name: "payroll-2", harness: null, multiplexer: null, transportId: "p7D" }))
      .toBe("payroll-2");
  });

  test("a nameless agent gets a stable logical name, not its key", () => {
    const recipient = recipientFromStatus("headless~ws~abc123", "ws", { agent: "pi" });

    expect(recipient.name).toBe("ws/agent-headless~ws~abc123");
    expect(recipientLabel(recipient)).toBe("pi: ws/agent-headless~ws~abc123");
  });
});
