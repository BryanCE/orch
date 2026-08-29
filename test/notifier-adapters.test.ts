import { describe, expect, test } from "bun:test";
import { createBuiltinNotifiers } from "../src/notify/sinks.ts";
import { createNotifierRegistry } from "../src/notify/router.ts";
import type { NotifyEvent } from "../src/notify/format.ts";

const event: NotifyEvent = {
  key: "demo:worker", workspace: "demo", agent: "worker", tab: "tab-1", model: "model-1",
  oldState: "working", newState: "blocked", task: "Q: approve deployment", ts: "2026-01-01T00:00:00.000Z",
};

describe("notifier registry and built-in adapters", () => {
  test("reports notifier reachability from one configured entry", async () => {
    const registry = createNotifierRegistry(createBuiltinNotifiers());
    const result = await registry.reachable({ id: "webhook", on: ["blocked"], url: "https://example.test/hook" });
    expect(result.available).toBe(true);
  });

  test("webhook POST contains the canonical payload", async () => {
    const originalFetch = globalThis.fetch;
    let request: string | URL | Request | undefined;
    let init: RequestInit | undefined;
    Object.defineProperty(globalThis, "fetch", { configurable: true, value: (input: string | URL | Request, options?: RequestInit) => {
      request = input;
      init = options;
      return Promise.resolve(new Response("ok", { status: 200 }));
    } });
    try {
      const registry = createNotifierRegistry(createBuiltinNotifiers());
      expect(await registry.deliver({ id: "webhook", on: ["blocked"], url: "https://example.test/hook" }, event)).toBe(true);
      expect(request).toBe("https://example.test/hook");
      expect(init?.method).toBe("POST");
      const body: unknown = JSON.parse(typeof init?.body === "string" ? init.body : JSON.stringify(init?.body));
      expect(body).toMatchObject({ workspace: "demo" });
    } finally {
      Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
    }
  });

  test("a notifier error is the caller's real error", async () => {
    const failure = new Error("boom");
    const webhook = createBuiltinNotifiers().find((notifier) => notifier.id === "webhook");
    if (!webhook) throw new Error("webhook notifier missing");
    const registry = createNotifierRegistry([{ ...webhook, available: () => true, deliver: () => Promise.reject(failure) }]);
    const thrown: unknown = await registry.deliver({ id: "webhook", on: ["blocked"], url: "https://example.test" }, event).then(() => null, (error: unknown) => error);
    expect(thrown).toBe(failure);
  });
});
