import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { HarnessApi, HarnessContext } from "../src/agent/harness.ts";

interface Subscription {
  callback: (event: unknown, seq: number) => void;
  closed: boolean;
}
const subscriptions: Subscription[] = [];
const subscribeOptions: { since?: number }[] = [];
const tempDirs: string[] = [];

// Keep this unit test at monitor's public seam. The daemon transport is tested separately;
// this lets us deterministically push transitions and inspect the initial replay cursor.
void mock.module("../src/daemon/rpc.ts", () => ({
  subscribeEvents: (_dir: string, options: { since?: number }, callback: Subscription["callback"]) => {
    subscribeOptions.push(options);
    const subscription: Subscription = { callback, closed: false };
    subscriptions.push(subscription);
    return { close: () => { subscription.closed = true; }, lastSeq: () => 0 };
  },
}));

const { createFleetMonitor, registerFleetMonitor } = await import("../src/agent/monitor.ts");

afterEach(() => {
  for (const subscription of subscriptions) subscription.closed = true;
  subscriptions.length = 0;
  subscribeOptions.length = 0;
  for (const path of tempDirs.splice(0)) rmSync(path, { recursive: true, force: true });
  delete process.env.ORCH_AGENT_KEY;
});

function context(status: (string | undefined)[] = [], widgets: unknown[] = []): HarnessContext {
  return {
    hasUI: true,
    sessionManager: { getSessionFile: () => undefined, getSessionId: () => undefined, getBranch: () => [] },
    modelRegistry: { find: () => undefined },
    ui: {
      notify: () => { void 0; },
      setStatus: (_key, text) => { status.push(text); },
      setWidget: (_key, content) => { widgets.push(content); },
    },
    isIdle: () => true,
    getContextUsage: () => undefined,
  };
}

function event(key: string, spawnedBy: string, name: string) {
  return { key, spawnedBy, name, agent: name, model: null, oldState: "idle", newState: "working", tab: null, ts: new Date().toISOString() };
}

function push(value: unknown): void {
  for (const subscription of subscriptions) if (!subscription.closed) subscription.callback(value, 1);
}

function dir(): string {
  const path = mkdtempSync(join(tmpdir(), "orch-agent-monitor-"));
  tempDirs.push(path);
  return path;
}

describe("agent fleet monitor", () => {
  test("surfaces only agents spawned by this session", () => {
    const monitor = createFleetMonitor(dir(), { ownKey: () => "session-me" });
    monitor.attach(context());
    push(event("mine", "session-me", "mine"));
    push(event("theirs", "other-session", "theirs"));
    expect(monitor.model.list().map((row) => row.key)).toEqual(["mine"]);
    monitor.stop();
  });

  test("empty model renders no status line or widget", () => {
    const status: (string | undefined)[] = [];
    const widgets: unknown[] = [];
    const monitor = createFleetMonitor(dir(), { ownKey: () => "session-me" });
    monitor.attach(context(status, widgets));
    expect(status.at(-1)).toBeUndefined();
    expect(widgets).toEqual([]);
    monitor.stop();
  });

  test("worker process registers no monitor regardless of events", () => {
    process.env.ORCH_AGENT_KEY = "worker-key";
    const noop = (): void => { void 0; };
    const harness = { on: noop, registerTool: noop, registerCommand: noop, sendUserMessage: noop, setModel: noop, getThinkingLevel: () => undefined, setThinkingLevel: noop, events: { on: noop } } as unknown as HarnessApi;
    expect(registerFleetMonitor(harness, dir(), { ownKey: () => "worker-key" })).toBeUndefined();
    expect(subscriptions).toHaveLength(0);
  });

  test("does not replay history into a plain pi session", () => {
    const monitor = createFleetMonitor(dir(), { ownKey: () => "session-me" });
    monitor.attach(context());
    expect(subscribeOptions[0]).toEqual({});
    expect(monitor.model.size()).toBe(0);
    monitor.stop();
  });
});
