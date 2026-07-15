import { describe, expect, test } from "bun:test";
import { derivePresenceTransition } from "../src/daemon/events.ts";
import { deliverToSink, notificationText, workspaceColor, type NotifyEvent } from "../src/notify.ts";

const PALETTE = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#9333ea", "#0891b2", "#db2777", "#4f46e5"];

function event(overrides: Partial<NotifyEvent> = {}): NotifyEvent {
  return {
    key: "herdr~w6~p21",
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

  test("nameless events use an identity-derived agent label", () => {
    const before = "DONE [w6] herdr~w6~p21: build the thing";
    const after = notificationText(event({ agent: null }), { colorize: false }).title;
    expect(before).toContain("herdr~w6~p21");
    expect(after).toContain("herdr~w6~p21");
    expect(after).toContain("w6/agent-herdr~w6~p21");
    expect(after).toContain("[w6]");
  });

  test("notificationText pins the canonical done, error, and blocked golden vectors", () => {
    expect(notificationText(event(), { colorize: false })).toEqual({
      title: "DONE [w6] w-2: build the thing",
      body: "DONE [w6] w-2: build the thing\nWorkspace: w6 (#2563eb)\nTask: build the thing",
    });
    expect(notificationText(event({ newState: "error", task: "old task", lastError: "build exploded" }), { colorize: false })).toEqual({
      title: "ERROR [w6] w-2: build exploded",
      body: "ERROR [w6] w-2: build exploded\nWorkspace: w6 (#2563eb)\nTask: old task",
    });
    expect(notificationText(event({ newState: "blocked", task: "Q: need approval" }), { colorize: false })).toEqual({
      title: "BLOCKED [w6] w-2: need approval",
      body: "BLOCKED [w6] w-2: need approval\nWorkspace: w6 (#2563eb)",
    });
  });

  test("webhook payload includes workspace and workspaceColor", async () => {
    let body = "";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((_input: string | URL | Request, init?: RequestInit) => {
      const value = init?.body;
      body = typeof value === "string" ? value : JSON.stringify(value ?? "");
      return Promise.resolve({ ok: true } as Response);
    }) as typeof fetch;
    try {
      const delivered = await deliverToSink({ type: "webhook", on: ["done"], url: "https://example.test/hook" }, event());
      expect(delivered).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(JSON.parse(body)).toEqual({
      title: "DONE [w6] w-2: build the thing",
      body: "DONE [w6] w-2: build the thing\nWorkspace: w6 (#2563eb)\nTask: build the thing",
      workspace: "w6",
      workspaceColor: workspaceColor("w6"),
      host: null,
      key: "herdr~w6~p21",
      agent: "w-2",
      tab: null,
      model: null,
      oldState: "working",
      newState: "done",
      task: "build the thing",
      cost: null,
      ts: "2026-01-01T00:00:00.000Z",
      lastError: null,
    });
  });

  test("presence eventTask strips worker preamble, truncates plain tasks, and formats questions", () => {
    const preamble = "[orch worker] No human watches this pane. For any decision you cannot make yourself, call orch_ask and wait for the orchestrator. NEVER use ask-user/question tools.";
    expect(transition("herdr~w8~p3", { state: "done", task: `${preamble} build the real thing` })?.task).toBe("build the real thing");

    const longTask = "x".repeat(100);
    expect(transition("herdr~w8~p3", { state: "done", task: longTask })?.task).toBe(`${"x".repeat(79)}…`);
    expect(transition("herdr~w8~p3", { state: "working", asking: { question: "  Need   approval?  " } })?.task).toBe("Q: Need approval?");
  });

  test("derivePresenceTransition derives workspace from identity keys", () => {
    const withWorkspace = transition("herdr~w8~p3", { state: "done" });
    expect(withWorkspace?.workspace).toBe("w8");
    const withoutWorkspace = transition("p3", { state: "done" });
    expect(withoutWorkspace?.workspace).toBeUndefined();
  });
});
