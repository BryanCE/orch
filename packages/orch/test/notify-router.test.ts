import { describe, expect, test } from "bun:test";
import { createNotifierRegistry } from "../src/notify/router.ts";
import type { Notifier, NotifyEvent } from "../src/types/notify.ts";
import type { NotifyEntry } from "../src/types/settings.ts";

const event: NotifyEvent = { key: "k", agent: null, tab: null, model: null, oldState: "working", newState: "done", ts: "2026-01-01T00:00:00.000Z" };

function notifier(id: Notifier["id"], seen: (config: Record<string, unknown>) => void, result = true): Notifier {
  return {
    id,
    label: id,
    metadata: { requiredConfig: [] },
    available: () => true,
    deliver: (_event, config) => { seen(config); return Promise.resolve(result); },
  };
}

describe("notify router", () => {
  test("delivers only when on includes the event state", async () => {
    let count = 0;
    const registry = createNotifierRegistry([notifier("webhook", () => { count += 1; })]);
    const excluded: NotifyEntry = { id: "webhook", on: ["error"], url: "https://example.test" };
    const included: NotifyEntry = { id: "webhook", on: ["done"], url: "https://example.test" };
    await registry.deliver(excluded, event);
    await registry.deliver(included, event);
    expect(count).toBe(1);
  });

  test("passes typed webhook and command configuration", async () => {
    const seen: Record<string, unknown>[] = [];
    const registry = createNotifierRegistry([
      notifier("webhook", (config) => seen.push(config)),
      notifier("command", (config) => seen.push(config)),
    ]);
    await registry.deliver({ id: "webhook", on: ["done"], url: "https://example.test" }, event);
    await registry.deliver({ id: "command", on: ["done"], command: ["echo", "ok"] }, event);
    expect(seen).toEqual([{ url: "https://example.test" }, { command: ["echo", "ok"] }]);
  });

  test("surfaces notifier errors", async () => {
    const failure = new Error("delivery failed");
    const registry = createNotifierRegistry([{ ...notifier("webhook", () => { /* config unused here */ }), deliver: () => Promise.reject(failure) }]);
    const thrown: unknown = await registry.deliver({ id: "webhook", on: ["done"], url: "https://example.test" }, event).then(() => null, (error: unknown) => error);
    expect(thrown).toBe(failure);
  });
});
