import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { selectRun, selectRuns } from "../src/store/run-rows.ts";
import { orm } from "../src/store/connection.ts";
import { insertAgent, renameAgent, ensureHarness } from "../src/store/agent-rows.ts";
import { setSpace } from "../src/store/interval-rows.ts";
import { acceptResultReport, acceptStatusReport, startLivenessTick } from "../src/daemon/server/status-report.ts";
import { askingEventFromRow, transitionEventFromRow } from "../src/daemon/server/status-events.ts";
import { emitAndNotify, isRepeatTransition } from "../src/daemon/server/events.ts";
import { startRpcServer } from "../src/daemon/server/rpc.ts";
import { subscribeEvents } from "../src/daemon/client/rpc.ts";
import { selectAgentStatus } from "../src/store/status-rows.ts";
import { recordQuestion } from "../src/store/question-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { statusRow } from "./helpers/presence.ts";
import { seedAgent as registerAgent, seedLiveProcess, seedOrch } from "./helpers/agent.ts";
import { removeTempDir, tempOrchDir as makeTempOrchDir } from "./helpers/tempdir.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { NotifyEvent } from "../src/types/notify.ts";
import type { NotifyEntry } from "../src/types/settings.ts";
import type { StatusPatch } from "../src/types/presence.ts";
import { sql } from "drizzle-orm";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { testServices } from "./helpers/services.ts";
import { stubRpcHandlers } from "./helpers/rpc-handlers.ts";
import { isRecord } from "../src/util.ts";
import { askingEvent, closedEvent, eventBase, transitionEvent } from "./helpers/events.ts";
import { recordingLogger } from "./helpers/logger.ts";

const directories: OrchDir[] = [];
const servers: RpcServer[] = [];
const noDirSettings = testServices({ orchDir: tempOrchDir(), settings: {} }).settings;

function tempOrchDir(): OrchDir {
  const directory = makeTempOrchDir("orch-events-");
  directories.push(directory);
  return directory;
}

/** Seed one agent through the normalized tables the composer reads. */
function seedAgent(orchDir: OrchDir, agentId: string, options: { harnessId?: string; space?: string } = {}): void {
  const harnessId = options.harnessId ?? "pi";
  ensureHarness(orchDir, harnessId, harnessId);
  insertAgent(orchDir, { id: agentId, spawnedBy: null, harnessId, cwd: orchDir, name: agentId, createdAt: 1 });
  seedLiveProcess(orchDir, agentId);
  if (options.space !== undefined) {
    orm(orchDir).run(sql`INSERT OR IGNORE INTO spaces (id, name, created_at) VALUES (${options.space}, ${options.space}, ${1})`);
    setSpace(orchDir, agentId, 1, options.space);
  }
}

function report(orchDir: OrchDir, key: string, patch: StatusPatch, publish: (event: NotifyEvent) => void): void {
  acceptStatusReport(orchDir, key, patch, publish);
}

async function waitFor(check: () => boolean, timeoutMs = 2_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error("timed out waiting for event");
    await Bun.sleep(10);
  }
}

function eventState(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("newState" in value)) return undefined;
  const state = value.newState;
  return typeof state === "string" ? state : undefined;
}

function jsonValue(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

function stringProperty(value: unknown, property: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const result = value[property];
  return typeof result === "string" ? result : undefined;
}

afterEach(async () => {
  for (const server of servers.splice(0)) await server.close();
  for (const directory of directories.splice(0)) removeTempDir(directory);
});

describe("daemon presence events", () => {
  test("a report for an unregistered agent throws and publishes nothing", () => {
    const orchDir = tempOrchDir();
    const events: NotifyEvent[] = [];
    expect(() => report(orchDir, mintAgentId(), { state: "working" }, (event) => events.push(event))).toThrow();
    expect(events).toEqual([]);
  });

  test("reports publish only changed-state transitions", () => {
    const orchDir = tempOrchDir();
    const key = mintAgentId();
    seedAgent(orchDir, key);
    const events: NotifyEvent[] = [];
    report(orchDir, key, { state: "working" }, (event) => events.push(event));
    expect(events).toHaveLength(0);
    report(orchDir, key, { state: "idle" }, (event) => events.push(event));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ oldState: "working", newState: "idle" });
    report(orchDir, key, { state: "idle" }, (event) => events.push(event));
    expect(events).toHaveLength(1);
  });

  test("an RPC subscriber receives a presence transition", async () => {
    const orchDir = tempOrchDir();
    const key = mintAgentId();
    seedAgent(orchDir, key);
    report(orchDir, key, { state: "working" }, () => { /* seed */ });
    const server = await startRpcServer(orchDir, stubRpcHandlers({
      "subscribe-events": () => ({ subscribed: true }),
    }), { logger: recordingLogger().logger });
    servers.push(server);
    const received: unknown[] = [];
    const subscription = subscribeEvents(orchDir, { since: 0 }, (event) => received.push(event));
    report(orchDir, key, { state: "idle" }, (event) => server.emit(event));
    await waitFor(() => received.some((event) => eventState(event) === "idle"));
    subscription.close();
    expect(eventState(received[0])).toBe("idle");
  });

  test("a dispatched transition writes the full run row", () => {
    const orchDir = tempOrchDir();
    const key = "runsfull01";
    const startedAtMs = Date.parse("2026-01-01T00:00:00.000Z");
    const finishedAtMs = Date.parse("2026-01-01T00:01:00.000Z");
    seedAgent(orchDir, key, { harnessId: "pi", space: "space-full" });
    const events: NotifyEvent[] = [];
    report(orchDir, key, { state: "working", dispatchId: "dispatch-full", startedAt: startedAtMs }, (event) => events.push(event));
    report(orchDir, key, {
      state: "done",
      dispatchId: "dispatch-full",
      task: "the complete task",
      model: { provider: "provider", id: "model-full" },
      startedAt: startedAtMs,
      finishedAt: finishedAtMs,
      tokens: { input: 11, output: 22, cacheRead: 33, cacheWrite: 44 },
      cost: 1.25,
      turns: 7,
      lastError: "last problem",
    }, (event) => events.push(event));
    const run = selectRun(orchDir, "dispatch-full");
    expect(run).toMatchObject({
      dispatchId: "dispatch-full",
      agentKey: key,
      adapter: "pi",
      model: "model-full",
      task: "the complete task",
      state: "done",
      startedAt: startedAtMs,
      finishedAt: finishedAtMs,
      tokensIn: 11,
      tokensOut: 22,
      cacheRead: 33,
      cacheWrite: 44,
      cost: 1.25,
      turns: 7,
      lastError: "last problem",
    });
    expect(run?.space).toBeUndefined();
    expect(events.some((event) => eventState(event) === "done")).toBe(true);
  });

  test("a result report stores the complete result text", () => {
    const orchDir = tempOrchDir();
    const key = mintAgentId();
    seedAgent(orchDir, key);
    const resultText = "x".repeat(3_000);
    const finishedAt = Date.parse("2026-01-01T00:01:00.000Z");
    acceptResultReport(orchDir, key, { text: resultText, dispatchId: "dispatch-result", finishedAt });
    expect(selectRun(orchDir, "dispatch-result")?.result).toBe(resultText);
  });

  test("a status report after the result leaves the settled run alone", () => {
    const orchDir = tempOrchDir();
    const key = mintAgentId();
    seedAgent(orchDir, key);
    report(orchDir, key, { state: "working", dispatchId: "d1", startedAt: 1 }, () => { /* seed */ });
    acceptResultReport(orchDir, key, {
      text: "answer",
      dispatchId: "d1",
      finishedAt: 5,
      cost: 0.5,
    });
    report(orchDir, key, {
      state: "idle",
      dispatchId: "d1",
      finishedAt: null,
      cost: 0,
      tokens: null,
    }, () => { /* settled */ });
    expect(selectRun(orchDir, "d1")).toMatchObject({
      state: "done",
      result: "answer",
      finishedAt: 5,
      cost: 0.5,
    });
  });

  test("repeated transitions upsert one run and only terminal states set finishedAt", () => {
    const orchDir = tempOrchDir();
    const key = "runsrepeat";
    const startedAt = Date.parse("2026-01-02T00:00:00.000Z");
    const events: NotifyEvent[] = [];
    seedAgent(orchDir, key);
    report(orchDir, key, { state: "working", dispatchId: "dispatch-repeat", startedAt, task: "first task" }, (event) => events.push(event));
    report(orchDir, key, {
      state: "blocked", dispatchId: "dispatch-repeat", startedAt, task: "updated task",
      tokens: { input: 4, output: 5, cacheRead: 0, cacheWrite: 0 }, cost: 0.5, turns: 2,
    }, (event) => events.push(event));
    const blockedRun = selectRuns(orchDir)[0];
    expect(blockedRun).toMatchObject({ state: "blocked", startedAt, task: "updated task", tokensIn: 4, turns: 2 });
    expect(blockedRun?.finishedAt).toBeUndefined();

    report(orchDir, key, { state: "done", dispatchId: "dispatch-repeat", startedAt, finishedAt: Date.parse("2026-01-02T00:02:00.000Z") }, (event) => events.push(event));
    const runs = selectRuns(orchDir);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ dispatchId: "dispatch-repeat", state: "done", startedAt, finishedAt: Date.parse("2026-01-02T00:02:00.000Z") });
  });

  test("a status without a dispatch id does not write history", () => {
    const orchDir = tempOrchDir();
    const key = "runshuman1";
    const events: NotifyEvent[] = [];
    seedAgent(orchDir, key);
    report(orchDir, key, { state: "working" }, (event) => events.push(event));
    report(orchDir, key, { state: "done", finishedAt: Date.parse("2026-01-03T00:00:00.000Z") }, (event) => events.push(event));
    expect(selectRuns(orchDir)).toEqual([]);
  });

  test("a throwing history write does not stop event delivery", () => {
    const orchDir = tempOrchDir();
    const key = "runsbroken";
    seedAgent(orchDir, key);
    orm(orchDir).run(sql.raw("CREATE TRIGGER fail_run_history BEFORE INSERT ON runs BEGIN SELECT RAISE(ABORT, 'history disabled'); END;"));
    const events: NotifyEvent[] = [];
    report(orchDir, key, { state: "working", dispatchId: "dispatch-broken", startedAt: Date.parse("2026-01-04T00:00:00.000Z") }, (event) => events.push(event));
    report(orchDir, key, { state: "done", dispatchId: "dispatch-broken", finishedAt: Date.parse("2026-01-04T00:01:00.000Z") }, (event) => events.push(event));
    expect(events.some((event) => eventState(event) === "done")).toBe(true);
  });

  test("emitted events carry the pack capacity at publish time", () => {
    const orchDir = tempOrchDir();
    writeSettingsFixture(orchDir, { fleet: { max_agents_per_pack: 2 } });
    const root = mintAgentId();
    const child = mintAgentId();
    seedAgent(orchDir, root);
    insertAgent(orchDir, { id: child, spawnedBy: root, harnessId: "pi", cwd: orchDir, name: child, createdAt: 2 });
    seedLiveProcess(orchDir, child, 2);
    report(orchDir, root, { state: "working" }, () => { /* seed */ });
    report(orchDir, child, { state: "working" }, () => { /* seed */ });
    const emitted: NotifyEvent[] = [];
    const settings = testServices({ orchDir, settings: { fleet: { max_agents_per_pack: 2 } } }).settings;
    emitAndNotify((event) => emitted.push(event), [], closedEvent({ key: root }), orchDir, settings);
    expect(emitted[0]?.type).toBe("closed");
    expect(emitted[0]?.newState).toBe("closed");
  });

  test("a flapping status file cannot storm the stream with repeat transitions", () => {
    const flap = transitionEvent({ ...eventBase, key: "w9:flap", oldState: "aborted", newState: "done" });
    const emitted: unknown[] = [];
    emitAndNotify((event) => emitted.push(event), [], { ...flap }, undefined, noDirSettings);
    emitAndNotify((event) => emitted.push(event), [], { ...flap }, undefined, noDirSettings);
    emitAndNotify((event) => emitted.push(event), [], { ...flap, oldState: "done", newState: "aborted" }, undefined, noDirSettings);
    emitAndNotify((event) => emitted.push(event), [], { ...flap, oldState: "done", newState: "aborted" }, undefined, noDirSettings);
    expect(emitted.length).toBe(2);
  });

  test("a genuine repeat of the same transition for new work still publishes", () => {
    const done = transitionEvent({ ...eventBase, key: "w9:redo", oldState: "working", newState: "done" });
    const emitted: unknown[] = [];
    emitAndNotify((event) => emitted.push(event), [], { ...done, task: "first dispatch", dispatchId: "d1" }, undefined, noDirSettings);
    emitAndNotify((event) => emitted.push(event), [], { ...done, task: "second dispatch", dispatchId: "d2" }, undefined, noDirSettings);
    expect(emitted.length).toBe(2);
  });

  test("a repeat transition publishes again once the suppression window passes", () => {
    const event = transitionEvent({ ...eventBase, key: "w9:window", oldState: "working", newState: "done" });
    expect(isRepeatTransition(event, 1_000)).toBe(false);
    expect(isRepeatTransition(event, 2_000)).toBe(true);
    expect(isRepeatTransition(event, 2_000 + 121_000)).toBe(false);
  });

  test("repeated observations cannot slide the suppression window forever", () => {
    const event = transitionEvent({ ...eventBase, key: "w9:fixed-window", oldState: "working", newState: "done" });
    expect(isRepeatTransition(event, 1_000)).toBe(false);
    expect(isRepeatTransition(event, 100_000)).toBe(true);
    expect(isRepeatTransition(event, 121_001)).toBe(false);
  });

  test("a working-to-done repeat after the dedupe window is emitted", () => {
    const event = transitionEvent({ ...eventBase, key: "w9:window-flip", oldState: "working", newState: "done" });
    const emitted: unknown[] = [];
    emitAndNotify((value) => emitted.push(value), [], event, undefined, noDirSettings, 1_000);
    emitAndNotify((value) => emitted.push(value), [], event, undefined, noDirSettings, 1_000 + 120_001);
    expect(emitted).toHaveLength(2);
  });

  test("presence transitions resolve the human name before emission", () => {
    const orchDir = tempOrchDir();
    const key = mintAgentId();
    seedAgent(orchDir, key);
    const row = statusRow({ agentId: key, state: "error", dispatchId: "dispatch-name", task: "the task", lastError: "because" });
    const now = new Date("2026-02-03T04:05:06.000Z");
    const event = transitionEventFromRow(orchDir, row, "working", "error", now);
    expect(event).toMatchObject({ agent: key, dispatchId: "dispatch-name", task: "the task", reason: "because" });
    expect(event).not.toHaveProperty("holder");

    seedOrch(orchDir, "holder-orch", "pi", now.getTime());
    acquireLease(orchDir, key, "holder-orch", now.getTime());
    const heldEvent = transitionEventFromRow(orchDir, row, "working", "error", now);
    expect(heldEvent.holder).toBe("holder-orch");
  });

  test("presence transitions use the normalized agent name after rename", () => {
    const orchDir = tempOrchDir();
    const key = "agentrenam";
    ensureHarness(orchDir, "pi", "Pi");
    insertAgent(orchDir, { id: key, spawnedBy: null, harnessId: "pi", cwd: orchDir, name: "Before", createdAt: 1 });
    seedLiveProcess(orchDir, key);
    expect(renameAgent(orchDir, key, "After")).toBe(true);
    const row = statusRow({ agentId: key, state: "done" });
    const event = transitionEventFromRow(orchDir, row, "working", "done");
    expect(event.name).toBe("After");
  });

  test("status rows preserve the complete asking transition payload", () => {
    const orchDir = tempOrchDir();
    const key = "askpayload";
    ensureHarness(orchDir, "pi", "Pi");
    insertAgent(orchDir, { id: key, spawnedBy: null, harnessId: "pi", cwd: orchDir, name: "Ada's worker", createdAt: 1 });
    seedLiveProcess(orchDir, key);
    const now = new Date("2026-02-03T04:05:06.000Z");
    const row = statusRow({
      agentId: key,
      state: "asking",
      dispatchId: "dispatch-asking",
      modelProvider: "provider",
      modelId: "model-a",
      thinking: "deep",
      task: "real task",
      blockedMessage: "Need input",
      cost: 1.5,
      lastError: "ignored for asking",
      lastText: "latest answer",
      contextPercent: 42,
      tokensIn: 1,
      tokensOut: 2,
      cacheRead: 3,
      cacheWrite: 4,
      filesTouched: JSON.stringify(["a.ts", "b.ts"]),
    });
    const event = askingEventFromRow(orchDir, row, "working", 1, false, now);
    expect(event).toMatchObject(askingEvent({
      key,
      agent: "Ada's worker",
      name: "Ada's worker",
      dispatchId: "dispatch-asking",
      model: "model-a:deep",
      oldState: "working",
      newState: "asking",
      askCount: 1,
      gaveUp: false,
      ts: now.toISOString(),
      lastError: "ignored for asking",
      lastText: "latest answer",
      ctxPercent: 42,
      tokens: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 },
      filesTouched: ["a.ts", "b.ts"],
    }));
    expect(event.type).toBe("asking");
  });

  test("transition events use blocked messages while asking events use pending questions", () => {
    const orchDir = tempOrchDir();
    const key = mintAgentId();
    seedAgent(orchDir, key);
    recordQuestion(orchDir, { id: "question-event", agentId: key, question: "What should I do?", askedAt: 1 });
    const row = statusRow({ agentId: key, state: "blocked", task: "continue work", blockedMessage: "waiting on disk" });

    const blocked = transitionEventFromRow(orchDir, row, "working", "blocked");
    expect(blocked.reason).toBe("waiting on disk");
    expect(blocked.task).not.toStartWith("Q:");

    const asking = askingEventFromRow(orchDir, row, "working", 1, false);
    expect(asking.task).toStartWith("Q: ");
    expect(asking.reason).toBe("What should I do?");
  });

  test("an asking report publishes an asking event", () => {
    const orchDir = tempOrchDir();
    const key = mintAgentId();
    seedAgent(orchDir, key);
    const events: NotifyEvent[] = [];
    report(orchDir, key, { state: "working" }, (event) => events.push(event));
    report(orchDir, key, { state: "asking", blockedMessage: "Need input" }, (event) => events.push(event));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "asking", newState: "asking", askCount: 1, gaveUp: false, reason: "Need input" });
    expect(events[0]?.type === "asking" ? events[0].task : undefined).toStartWith("Q: ");
  });

  test("an asking transition drives command sink delivery", async () => {
    const orchDir = tempOrchDir();
    const output = join(orchDir, "notification.json");
    const key = mintAgentId();
    seedAgent(orchDir, key);
    const sink: NotifyEntry = {
      id: "command",
      on: ["asking"],
      command: [process.execPath, "-e", `const fs = require("node:fs"); fs.writeFileSync(${JSON.stringify(output)}, fs.readFileSync(0, "utf8"));`],
    };
    const settings = testServices({ orchDir, settings: {} }).settings;
    const publish = (event: NotifyEvent): void => emitAndNotify(() => { /* noop */ }, [sink], event, orchDir, settings);
    report(orchDir, key, { state: "working" }, publish);
    report(orchDir, key, { state: "asking", blockedMessage: "Need input" }, publish);
    await waitFor(() => stringProperty(jsonValue(output), "newState") === "asking");
    expect(stringProperty(jsonValue(output), "title")).toStartWith("ASKING");
  });

  test("liveness announces a dead process as exited, then reaps its rows", async () => {
    const orchDir = tempOrchDir();
    const key = mintAgentId();
    registerAgent(key, { name: key }, orchDir);
    const events: NotifyEvent[] = [];
    const { logger, records } = recordingLogger();
    report(orchDir, key, { state: "working" }, (event) => events.push(event));
    const tick = startLivenessTick(orchDir, 10, (event) => events.push(event), logger);
    await waitFor(() => events.some((event) => eventState(event) === "exited"));
    tick.stop();
    expect(events.some((event) => eventState(event) === "exited")).toBe(true);
    // Dead means gone: no row of any kind is left for it.
    expect(selectAgentStatus(orchDir, key)).toBeUndefined();
    expect(agentView(orchDir, key)).toBeNull();
    expect(records.some((record) => record.event === "tick.liveness" && typeof record.fields?.elapsedMs === "number")).toBe(true);
  });
});
