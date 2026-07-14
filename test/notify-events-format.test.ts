import { describe, expect, test } from "bun:test";
import { derivePresenceTransition } from "../src/daemon/events.ts";
import { deliverToSink, notificationText, workspaceColor, type NotifyEvent } from "../src/notify.ts";

const PALETTE = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#9333ea", "#0891b2", "#db2777", "#4f46e5"];

function event(overrides: Partial<NotifyEvent> = {}): NotifyEvent {
  return {
    key: "w6:p21",
    agent: "w-2",
    tab: null,
    model: null,
    oldState: "working",
    newState: "done",
    task: "build the thing",
    ts: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function transition(key: string, status: object, previous = "working") {
  const states = new Map([[key, previous]]);
  return derivePresenceTransition(key, { pid: process.pid, ...status }, { name: "worker", tab: null }, states);
}

describe("notification and presence event formatting", () => {
  test("workspaceColor is stable and returns a palette hex", () => {
    const first = workspaceColor("w6");
    expect(workspaceColor("w6")).toBe(first);
    expect(PALETTE).toContain(first);
    expect(first).toMatch(/^#[0-9a-f]{6}$/);
  });

  test("notificationText formats done, error, and blocked summaries without color", () => {
    const done = notificationText(event(), { colorize: false });
    expect(done.title).toContain("[w6]");
    expect(done.title).toContain("w-2");
    expect(done.title).toContain("DONE");
    expect(done.title).toContain("build the thing");

    expect(notificationText(event({ newState: "error", task: "old task", lastError: "build exploded" }), { colorize: false }).title)
      .toContain("build exploded");
    expect(notificationText(event({ newState: "blocked", task: "Q: need approval" }), { colorize: false }).title)
      .toContain("need approval");
  });

  test("webhook payload includes workspace and workspaceColor", async () => {
    let body = "";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      body = String(init?.body ?? "");
      return { ok: true } as Response;
    }) as typeof fetch;
    try {
      await expect(deliverToSink({ type: "webhook", on: ["done"], url: "https://example.test/hook" }, event())).resolves.toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
    const payload = JSON.parse(body);
    expect(payload.workspace).toBe("w6");
    expect(payload.workspaceColor).toBe(workspaceColor("w6"));
  });

  test("presence eventTask strips worker preamble, truncates plain tasks, and formats questions", () => {
    const preamble = "[orch worker] No human watches this pane. For any decision you cannot make yourself, call orch_ask and wait for the orchestrator. NEVER use ask-user/question tools.";
    expect(transition("w8:p3", { state: "done", task: `${preamble} build the real thing` })?.task).toBe("build the real thing");

    const longTask = "x".repeat(100);
    expect(transition("w8:p3", { state: "done", task: longTask })?.task).toBe(`${"x".repeat(79)}…`);
    expect(transition("w8:p3", { state: "working", asking: { question: "  Need   approval?  " } })?.task).toBe("Q: Need approval?");
  });

  test("derivePresenceTransition derives workspace only for workspace:pane keys", () => {
    const withWorkspace = transition("w8:p3", { state: "done" });
    expect(withWorkspace?.workspace).toBe("w8");
    const withoutWorkspace = transition("p3", { state: "done" });
    expect(withoutWorkspace?.workspace).toBeUndefined();
  });
});
