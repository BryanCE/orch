import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { selectRuns } from "../src/store/run-rows.ts";
import { openStore } from "../src/store/connection.ts";
import { insertSpawnedRecord } from "../src/store/spawned-rows.ts";
import { presenceAgentDir, writeResult } from "../src/presence/writer.ts";
import {
  derivePresenceTransition,
  emitAndNotify,
  isRepeatTransition,
  startPresenceWatch,
  type PresenceWatch,
} from "../src/daemon/events.ts";
import { rpcSubscribe, startRpcServer, type RpcServer } from "../src/daemon/rpc.ts";
import type { Sink } from "../src/notify/router.ts";
import type { NotifyEvent } from "../src/notify/format.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const directories: string[] = [];
const servers: RpcServer[] = [];
const presenceWatches: PresenceWatch[] = [];

function tempOrchDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-events-"));
  directories.push(directory);
  return directory;
}

function storageKey(key: string): string {
  // Windows forbids ':' in directory names; the event state assertions do not depend on the key text.
  return process.platform === "win32" ? key.replaceAll(":", "_") : key;
}

function nodeCommand(script: string): string[] {
  return [process.execPath, "-e", script];
}

function notifyEvent(overrides: Partial<NotifyEvent> = {}): NotifyEvent {
  return {
    host: undefined,
    key: "",
    workspace: undefined,
    agent: null,
    name: undefined,
    dispatchId: undefined,
    spawnedBy: undefined,
    spawnedByLabel: undefined,
    tab: null,
    model: null,
    oldState: "",
    newState: "",
    seq: undefined,
    task: undefined,
    cost: undefined,
    ts: "",
    lastError: undefined,
    lastText: undefined,
    result: undefined,
    reason: undefined,
    ctxPercent: undefined,
    tokens: undefined,
    filesTouched: undefined,
    ...overrides,
  };
}

function writeStatus(orchDir: string, key: string, state: string, extra: object = {}): void {
  seedStatus(orchDir, storageKey(key), { pid: process.pid, state, ...extra });
}

async function waitFor(check: () => boolean, timeoutMs = 2_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error("timed out waiting for event");
    await Bun.sleep(10);
  }
}

function eventState(value: unknown): string | undefined {
  return value && typeof value === "object" && typeof Reflect.get(value, "newState") === "string"
    ? Reflect.get(value, "newState") as string
    : undefined;
}

afterEach(async () => {
  for (const watcher of presenceWatches.splice(0)) watcher.stop();
  for (const server of servers.splice(0)) await server.close();
  for (const directory of directories.splice(0)) removeTempDir(directory);
});

describe("daemon presence events", () => {
  test("an RPC subscriber receives a presence transition", async () => {
    const orchDir = tempOrchDir();
    writeStatus(orchDir, "workspace:p1", "working");
    const server = await startRpcServer(orchDir, {
      "subscribe-events": () => ({ subscribed: true }),
    });
    servers.push(server);
    const watcher = startPresenceWatch({ orchDir, onEvent: (event) => server.emit(event) });
    presenceWatches.push(watcher);
    const received: unknown[] = [];
    const stop = await rpcSubscribe(orchDir, "subscribe-events", (event) => received.push(event));

    writeStatus(orchDir, "workspace:p1", "idle");
    await waitFor(() => received.some((event) => eventState(event) === "idle"));
    stop();
    expect(eventState(received[0])).toBe("idle");
  });

  test("a dispatched transition writes the full run row and preserves untruncated result", async () => {
    const orchDir = tempOrchDir();
    const key = "headless~runs~full";
    const startedAt = "2026-01-01T00:00:00.000Z";
    const finishedAt = "2026-01-01T00:01:00.000Z";
    const resultText = "x".repeat(3_000);
    insertSpawnedRecord(orchDir, { pane: key, adapter: "pi", workspace: "workspace-full" });
    writeStatus(orchDir, key, "working", { dispatchId: "dispatch-full", startedAt });
    const events: unknown[] = [];
    const watcher = startPresenceWatch({ orchDir, onEvent: (event) => events.push(event) });
    presenceWatches.push(watcher);

    writeResult(presenceAgentDir(key, orchDir), { text: resultText });
    writeStatus(orchDir, key, "done", {
      dispatchId: "dispatch-full",
      task: "the complete task",
      model: { provider: "provider", id: "model-full" },
      startedAt,
      finishedAt,
      tokens: { input: 11, output: 22, cacheRead: 33, cacheWrite: 44 },
      cost: 1.25,
      turns: 7,
      lastError: "last problem",
    });
    await waitFor(() => events.some((event) => eventState(event) === "done"));

    const [run] = selectRuns(orchDir);
    expect(run).toMatchObject({
      dispatchId: "dispatch-full",
      agentKey: key,
      adapter: "pi",
      model: "model-full",
      workspace: "workspace-full",
      task: "the complete task",
      state: "done",
      startedAt,
      finishedAt,
      tokensIn: 11,
      tokensOut: 22,
      cacheRead: 33,
      cacheWrite: 44,
      cost: 1.25,
      turns: 7,
      result: resultText,
      lastError: "last problem",
    });
    expect((events.find((event) => eventState(event) === "done") as { result?: string }).result).toHaveLength(2_000);
  });

  test("repeated transitions upsert one run and only terminal states set finishedAt", async () => {
    const orchDir = tempOrchDir();
    const key = "headless~runs~repeat";
    const startedAt = "2026-01-02T00:00:00.000Z";
    const events: unknown[] = [];
    writeStatus(orchDir, key, "working", { dispatchId: "dispatch-repeat", startedAt, task: "first task" });
    const watcher = startPresenceWatch({ orchDir, onEvent: (event) => events.push(event) });
    presenceWatches.push(watcher);

    writeStatus(orchDir, key, "blocked", {
      dispatchId: "dispatch-repeat",
      startedAt,
      task: "updated task",
      tokens: { input: 4, output: 5 },
      cost: 0.5,
      turns: 2,
    });
    await waitFor(() => events.some((event) => eventState(event) === "blocked"));
    const blockedRun = selectRuns(orchDir)[0];
    expect(blockedRun).toMatchObject({ state: "blocked", startedAt, task: "updated task", tokensIn: 4, turns: 2 });
    expect(blockedRun?.finishedAt).toBeUndefined();

    writeStatus(orchDir, key, "done", { dispatchId: "dispatch-repeat", startedAt, finishedAt: "2026-01-02T00:02:00.000Z" });
    await waitFor(() => events.some((event) => eventState(event) === "done"));
    const runs = selectRuns(orchDir);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ dispatchId: "dispatch-repeat", state: "done", startedAt, finishedAt: "2026-01-02T00:02:00.000Z" });
  });

  test("a status without a dispatch id does not write history", async () => {
    const orchDir = tempOrchDir();
    const key = "headless~runs~human";
    const events: unknown[] = [];
    writeStatus(orchDir, key, "working");
    const watcher = startPresenceWatch({ orchDir, onEvent: (event) => events.push(event) });
    presenceWatches.push(watcher);
    writeStatus(orchDir, key, "done", { finishedAt: "2026-01-03T00:00:00.000Z" });
    await waitFor(() => events.some((event) => eventState(event) === "done"));
    expect(selectRuns(orchDir)).toEqual([]);
  });

  test("a throwing history write does not stop event delivery", async () => {
    const orchDir = tempOrchDir();
    const key = "headless~runs~broken-store";
    openStore(orchDir).exec("CREATE TRIGGER fail_run_history BEFORE INSERT ON runs BEGIN SELECT RAISE(ABORT, 'history disabled'); END;");
    const events: unknown[] = [];
    writeStatus(orchDir, key, "working", { dispatchId: "dispatch-broken", startedAt: "2026-01-04T00:00:00.000Z" });
    const watcher = startPresenceWatch({ orchDir, onEvent: (event) => events.push(event) });
    presenceWatches.push(watcher);
    writeStatus(orchDir, key, "done", { dispatchId: "dispatch-broken", finishedAt: "2026-01-04T00:01:00.000Z" });
    await waitFor(() => events.some((event) => eventState(event) === "done"));
    expect(events.some((event) => eventState(event) === "done")).toBe(true);
  });

  test("a flapping status file cannot storm the stream with repeat transitions", () => {
    const flap = { key: "w9:flap", agent: "pi", tab: null, model: null, oldState: "aborted", newState: "done", task: "same task", ts: "t" };
    const emitted: unknown[] = [];
    emitAndNotify((event) => emitted.push(event), [], { ...flap });
    emitAndNotify((event) => emitted.push(event), [], { ...flap });
    emitAndNotify((event) => emitted.push(event), [], { ...flap, oldState: "done", newState: "aborted" });
    emitAndNotify((event) => emitted.push(event), [], { ...flap, oldState: "done", newState: "aborted" });
    expect(emitted.length).toBe(2);
  });

  test("a genuine repeat of the same transition for new work still publishes", () => {
    const done = { key: "w9:redo", agent: "pi", tab: null, model: null, oldState: "working", newState: "done", ts: "t" };
    const emitted: unknown[] = [];
    emitAndNotify((event) => emitted.push(event), [], { ...done, task: "first dispatch", dispatchId: "d1" });
    emitAndNotify((event) => emitted.push(event), [], { ...done, task: "second dispatch", dispatchId: "d2" });
    expect(emitted.length).toBe(2);
  });

  test("a repeat transition publishes again once the suppression window passes", () => {
    const event = { key: "w9:window", agent: "pi", tab: null, model: null, oldState: "working", newState: "done", task: "t", ts: "t" };
    expect(isRepeatTransition(event, 1_000)).toBe(false);
    expect(isRepeatTransition(event, 2_000)).toBe(true);
    expect(isRepeatTransition(event, 2_000 + 121_000)).toBe(false);
  });

  test("repeated observations cannot slide the suppression window forever", () => {
    const event = { key: "w9:fixed-window", agent: "pi", tab: null, model: null, oldState: "working", newState: "done", task: "t", ts: "t" };
    expect(isRepeatTransition(event, 1_000)).toBe(false);
    expect(isRepeatTransition(event, 100_000)).toBe(true);
    expect(isRepeatTransition(event, 121_001)).toBe(false);
  });

  test("a working-to-done repeat after the dedupe window is emitted", () => {
    const event = { key: "w9:window-flip", agent: "pi", tab: null, model: null, oldState: "working", newState: "done", ts: "t" };
    const emitted: unknown[] = [];
    emitAndNotify((value) => emitted.push(value), [], event, 1_000);
    emitAndNotify((value) => emitted.push(value), [], event, 1_000 + 120_001);
    expect(emitted).toHaveLength(2);
  });

  test("presence transitions resolve the human name before emission", () => {
    const orchDir = tempOrchDir();
    const key = "w6:p-name";
    insertSpawnedRecord(orchDir, { pane: key, workspace: "w6", name: "Ada" });
    const states = new Map([[key, "working"]]);
    const event = derivePresenceTransition(
      orchDir,
      key,
      { pid: process.pid, state: "done", agent: "Ada" },
      { name: null, tab: null },
      states,
    );
    expect(event?.agent).toBe("Ada");
    expect(event?.agent).not.toContain(key);
  });

  test("derivePresenceTransition preserves the complete asking transition payload", () => {
    const orchDir = tempOrchDir();
    const key = "headless~asking~payload";
    const states = new Map([[key, "working"]]);
    const now = new Date("2026-02-03T04:05:06.000Z");
    const event = derivePresenceTransition(orchDir, key, {
      pid: process.pid,
      state: "asking",
      agent: "Ada",
      label: "Ada's worker",
      tabLabel: "tab-a",
      dispatchId: "dispatch-asking",
      model: { id: "model-a" },
      thinking: "deep",
      task: "real task",
      asking: { question: "Need input", id: "q1", ts: "now" },
      cost: 1.5,
      lastError: "ignored for asking",
      lastText: "latest answer",
      context: { percent: 42 },
      tokens: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 },
      filesTouched: ["a.ts", "b.ts"],
    }, { name: "fallback", tab: "fallback-tab" }, states, now);
    expect(event).toEqual(notifyEvent({
      key,
      agent: "Ada",
      name: "Ada's worker",
      dispatchId: "dispatch-asking",
      tab: "tab-a",
      model: "model-a:\"deep\"",
      oldState: "working",
      newState: "asking",
      cost: 1.5,
      ts: now.toISOString(),
      lastError: "ignored for asking",
      lastText: "latest answer",
      task: "Q: Need input",
      ctxPercent: 42,
      tokens: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 },
      filesTouched: ["a.ts", "b.ts"],
    }));
    expect(event?.task).toBe("Q: Need input");
  });

  test("an asking transition drives command sink delivery", async () => {
    const orchDir = tempOrchDir();
    const output = join(orchDir, "notification.json");
    writeStatus(orchDir, "workspace:p2", "working");
    const sink: Sink = {
      type: "command",
      on: ["asking"],
      command: nodeCommand(`const fs = require("node:fs"); fs.writeFileSync(${JSON.stringify(output)}, fs.readFileSync(0, "utf8"));`),
    };
    const watcher = startPresenceWatch({
      orchDir,
      onEvent: (event) => emitAndNotify(() => { /* noop */ }, [sink], event),
    });
    presenceWatches.push(watcher);

    writeStatus(orchDir, "workspace:p2", "working", { asking: { question: "Need input" } });
    await waitFor(() => {
      try {
        const payload = JSON.parse(readFileSync(output, "utf8")) as { newState?: string };
        return payload.newState === "asking";
      } catch {
        return false;
      }
    });
    const payload = JSON.parse(readFileSync(output, "utf8")) as { title?: string };
    expect(payload.title).toStartWith("ASKING");
  });

  test("a dead daemon closes the subscription instead of falling back to files", async () => {
    const orchDir = tempOrchDir();
    const server = await startRpcServer(orchDir, {
      "subscribe-events": () => ({ subscribed: true }),
    });
    servers.push(server);
    let closes = 0;
    const stop = await rpcSubscribe(orchDir, "subscribe-events", () => { /* noop */ }, () => { closes++; });

    await server.close();
    servers.splice(servers.indexOf(server), 1);
    await waitFor(() => closes > 0);
    expect(closes).toBe(1);
    stop();
  });

  test("a caller-initiated stop is not reported as a disconnect", async () => {
    const orchDir = tempOrchDir();
    const server = await startRpcServer(orchDir, {
      "subscribe-events": () => ({ subscribed: true }),
    });
    servers.push(server);
    let closes = 0;
    const stop = await rpcSubscribe(orchDir, "subscribe-events", () => { /* noop */ }, () => { closes++; });

    stop();
    await Bun.sleep(50);
    expect(closes).toBe(0);
  });
});
