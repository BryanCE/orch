import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { derivePresenceTransition } from "../src/daemon/events.ts";
import { orm } from "../src/store/connection.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { setSpace } from "../src/store/interval-rows.ts";
import { deliver } from "../src/notify/router.ts";
import { notificationText, spaceColor } from "../src/notify/format.ts";
import { TASK_MAX } from "../src/agent/presence.ts";
import { prepareWorkerTask, workerHeaderFor } from "../src/worker-prompt.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { NotifyEvent } from "../src/types/notify.ts";
import { sql } from "drizzle-orm";

const orchDirs: string[] = [];

function tempOrchDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-notify-events-"));
  orchDirs.push(directory);
  return directory;
}

afterEach(() => {
  while (orchDirs.length > 0) removeTempDir(orchDirs.pop()!);
});

const PALETTE = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#9333ea", "#0891b2", "#db2777", "#4f46e5"];

/** A1: an event's key is a minted agent id — 10 lowercase alphanumerics and
 *  nothing else. The space travels as its own field, never inside the key. */
const EVENT_KEY = "q7f3m2x9k1";

/** The presence key used for task-shaping cases. It names no registered agent;
 *  what it must never do is carry a plexer or a handle. */
const TASK_KEY = "z4b8n1p7r3";

function event(overrides: Partial<NotifyEvent> = {}): NotifyEvent {
  return {
    key: EVENT_KEY,
    space: "w6",
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

function transition(orchDir: string, key: string, status: object, previous = "working") {
  const states = new Map([[key, previous]]);
  return derivePresenceTransition(orchDir, key, { pid: process.pid, ...status }, { name: "worker", tab: null }, states);
}

describe("notification and presence event formatting", () => {
  test("spaceColor is stable and returns a palette hex", () => {
    const first = spaceColor("w6");
    expect(spaceColor("w6")).toBe(first);
    expect(PALETTE).toContain(first);
    expect(first).toMatch(/^#[0-9a-f]{6}$/);
  });

  test("nameless events use an identity-derived agent label", () => {
    const after = notificationText(event({ agent: null }), { colorize: false }).title;
    expect(after).toContain(EVENT_KEY);
    expect(after).toContain(`w6/agent-${EVENT_KEY}`);
    expect(after).toContain("[w6]");
  });

  test("named events prefer the human name over the harness id", () => {
    expect(notificationText(event({ agent: "pi", name: "ident-hello-1" }), { colorize: false }).title)
      .toBe("DONE [w6] ident-hello-1: build the thing");
  });

  test("notificationText pins the canonical done, error, and blocked golden vectors", () => {
    expect(notificationText(event({ lastText: "reported result" }), { colorize: false })).toEqual({
      title: "DONE [w6] w-2: reported result",
      body: "DONE [w6] w-2: reported result\nSpace: w6 (#2563eb)\nTask: build the thing",
    });
    expect(notificationText(event(), { colorize: false }).title).toBe("DONE [w6] w-2: build the thing");
    expect(notificationText(event({ newState: "error", task: "old task", lastError: "build exploded" }), { colorize: false })).toEqual({
      title: "ERROR [w6] w-2: build exploded",
      body: "ERROR [w6] w-2: build exploded\nSpace: w6 (#2563eb)\nTask: old task",
    });
    expect(notificationText(event({ newState: "blocked", task: "Q: need approval" }), { colorize: false })).toEqual({
      title: "BLOCKED [w6] w-2: need approval",
      body: "BLOCKED [w6] w-2: need approval\nSpace: w6 (#2563eb)",
    });
  });

  test("webhook payload includes space and spaceColor", async () => {
    let body = "";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((_input: string | URL | Request, init?: RequestInit) => {
      const value = init?.body;
      body = typeof value === "string" ? value : JSON.stringify(value ?? "");
      return Promise.resolve({ ok: true } as Response);
    }) as typeof fetch;
    try {
      const delivered = await deliver({ id: "webhook", on: ["done"], url: "https://example.test/hook" }, event());
      expect(delivered).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(JSON.parse(body)).toEqual({
      title: "DONE [w6] w-2: build the thing",
      body: "DONE [w6] w-2: build the thing\nSpace: w6 (#2563eb)\nTask: build the thing",
      space: "w6",
      spaceColor: spaceColor("w6"),
      host: null,
      key: EVENT_KEY,
      agent: "w-2",
      name: null,
      tab: null,
      model: null,
      oldState: "working",
      newState: "done",
      task: "build the thing",
      cost: null,
      ts: "2026-01-01T00:00:00.000Z",
      lastError: null,
      // (key, seq) is the event's identity for dedup; direct sink deliveries
      // outside the daemon carry no ordinal.
      seq: null,
    });
  });

  test("presence eventTask strips worker preamble, truncates plain tasks, and formats questions", () => {
    const orchDir = tempOrchDir();
    const dispatched = `${workerHeaderFor(undefined)}\n\nbuild the real thing`;
    expect(transition(orchDir, TASK_KEY, { state: "done", task: dispatched })?.task).toBe("build the real thing");

    const longTask = "x".repeat(100);
    expect(transition(orchDir, TASK_KEY, { state: "done", task: longTask })?.task).toBe(`${"x".repeat(77)}...`);
    const longDispatched = `${workerHeaderFor(undefined)}\n\n${"x".repeat(TASK_MAX + 20)}`;
    expect(prepareWorkerTask(longDispatched, TASK_MAX)).toBe(`${"x".repeat(TASK_MAX - 3)}...`);
    expect(transition(orchDir, TASK_KEY, { state: "done", task: longDispatched })?.task).toBe(`${"x".repeat(77)}...`);
    expect(transition(orchDir, TASK_KEY, { state: "working", asking: { question: "  Need   approval?  " } })?.task).toBe("Q: Need approval?");
  });

  // A1: the event's space is COMPOSED from the agent's own environment satellite,
  // never parsed out of the presence key. A key that names no agent has none.
  test("derivePresenceTransition composes the space from the agent's environment", () => {
    const orchDir = tempOrchDir();
    const registeredKey = "spacedagn1";
    ensureHarness(orchDir, "pi", "pi");
    insertAgent(orchDir, { id: registeredKey, spawnedBy: null, harnessId: "pi", cwd: orchDir, name: "spaced", createdAt: 1 });
    orm(orchDir).run(sql`INSERT OR IGNORE INTO spaces (id, name, created_at) VALUES (${"registry-space"}, ${"registry-space"}, ${1})`);
    setSpace(orchDir, registeredKey, 1, "registry-space");
    const withSpace = transition(orchDir, registeredKey, { state: "done" });
    expect(withSpace?.space).toBe("registry-space");
    // Not an identity key: it addresses no agent, so it composes no environment.
    const withoutSpace = transition(orchDir, "p3", { state: "done" });
    expect(withoutSpace?.space).toBeUndefined();
  });
});
