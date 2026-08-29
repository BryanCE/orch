import { describe, expect, test } from "bun:test";
import { createNotifierRegistry } from "../src/notify/router.ts";
import { createBuiltinNotifiers } from "../src/notify/sinks.ts";
import type { NotifyEvent } from "../src/types/notify.ts";

const event: NotifyEvent = { key: "k", agent: null, tab: null, model: null, oldState: "working", newState: "done", ts: "2026-01-01T00:00:00.000Z" };

describe("notification entries", () => {
  test("desktop entries use the canonical notifier registry", async () => {
    const desktop = createBuiltinNotifiers().find((notifier) => notifier.id === "desktop");
    if (!desktop) throw new Error("desktop notifier missing");
    const registry = createNotifierRegistry([{ ...desktop, available: () => true, deliver: () => Promise.resolve(true) }]);
    expect(await registry.deliver({ id: "desktop", on: ["done"] }, event)).toBe(true);
  });
});
