import { describe, expect, test } from "bun:test";
import { createNotifierRegistry } from "../src/notify/router.ts";
import { createBuiltinNotifiers } from "../src/notify/sinks.ts";
import type { NotifyEvent } from "../src/notify/format.ts";

const event: NotifyEvent = { key: "k", agent: null, tab: null, model: null, oldState: "working", newState: "done", ts: "2026-01-01T00:00:00.000Z" };

describe("notification routing", () => {
  test("an excluded state does not invoke its notifier", async () => {
    let delivered = false;
    const webhook = createBuiltinNotifiers().find((notifier) => notifier.id === "webhook");
    if (!webhook) throw new Error("webhook notifier missing");
    const registry = createNotifierRegistry([{ ...webhook, available: () => true, deliver: () => { delivered = true; return Promise.resolve(true); } }]);
    expect(await registry.deliver({ id: "webhook", on: ["error"], url: "https://example.test" }, event)).toBe(true);
    expect(delivered).toBe(false);
  });
});
