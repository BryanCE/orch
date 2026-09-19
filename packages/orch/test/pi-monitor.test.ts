import { describe, expect, test } from "bun:test";
import { registerPiMonitor } from "../extensions/pi/monitor.ts";
import { orchDirAt } from "../src/services.ts";
import { testServices } from "./helpers/services.ts";
import { askingEvent, eventBase, transitionEvent } from "./helpers/events.ts";
import type { subscribeEvents } from "../src/daemon/client/rpc.ts";
import type { NotifyEvent } from "../src/types/notify.ts";

type MonitorHarness = Parameters<typeof registerPiMonitor>[0];
type MonitorTool = Parameters<MonitorHarness["registerTool"]>[0];

function fixture() {
  let tool: MonitorTool | undefined;
  let shutdown: () => void = () => undefined;
  let key: string | undefined = "owner";
  const messages: { text: string; mode: string | undefined }[] = [];
  const streams: { emit: (event: NotifyEvent, seq: number) => void; gap: ((seq: number) => void) | undefined; closes: number }[] = [];
  const services = testServices({ orchDir: orchDirAt("/unused/pi-monitor-test") });
  const subscribe: typeof subscribeEvents = (_dir, _options, emit, gap) => {
    const stream = { emit, gap, closes: 0 };
    streams.push(stream);
    return { close: () => { stream.closes += 1; }, lastSeq: () => 0 };
  };
  registerPiMonitor({
    on: (_event, handler) => { shutdown = handler; },
    registerTool: (value) => { tool = value; },
    sendUserMessage: (text, options) => { messages.push({ text, mode: options?.deliverAs }); },
  }, services, () => key, subscribe);
  return {
    messages, streams, services,
    shutdown: () => shutdown(),
    setKey: (value: string | undefined) => { key = value; },
    call: (enabled?: boolean) => {
      if (!tool) throw new Error("monitor tool not registered");
      return tool.execute("call", { enabled });
    },
    stream: () => {
      const stream = streams.at(-1);
      if (!stream) throw new Error("monitor not started");
      return stream;
    },
  };
}

describe("Pi background orch monitor", () => {
  test("registration and status open no socket; repeated start is idempotent", () => {
    const f = fixture();
    expect(f.streams).toHaveLength(0);
    expect(f.call().content[0].text).toContain("stopped");
    f.call(true);
    f.call(true);
    expect(f.streams).toHaveLength(1);
    expect(f.call().content[0].text).toContain("armed");
    f.shutdown();
  });

  test("completion, questions, errors and blocked states steer; unrelated and own events do not", () => {
    const f = fixture();
    f.call(true);
    const { emit } = f.stream();
    emit(transitionEvent({ holder: "owner", lastText: "Tests passed" }), 1);
    emit(askingEvent({ holder: "owner", task: "Q: Which target?" }), 2);
    emit(transitionEvent({ holder: "owner", newState: "error", lastError: "Failed" }), 3);
    emit(transitionEvent({ holder: "owner", newState: "blocked" }), 4);
    emit(transitionEvent({ holder: "owner", newState: "working" }), 5);
    emit(transitionEvent({ holder: "someone-else", spawnedBy: "owner" }), 6);
    emit(transitionEvent({ key: "owner", holder: "owner" }), 7);
    emit(transitionEvent(), 8);
    emit({ ...eventBase, key: "owner", type: "message", newState: "message", dispatchId: "dispatch", mail: { id: "mail", text: "Already delivered by bridge" } }, 9);
    expect(f.messages).toHaveLength(4);
    expect(f.messages.every((message) => message.mode === "steer")).toBe(true);
    expect(f.messages[0]?.text).toContain("Tests passed");
    expect(f.messages[1]?.text).toContain("Which target?");
    f.shutdown();
  });

  test("unleased children are included and monitor settings are read for each event", () => {
    const f = fixture();
    f.call(true);
    f.stream().emit(transitionEvent({ spawnedBy: "owner" }), 1);
    f.services.settings.update((text) => {
      if (!text) throw new Error("missing fixture settings");
      return text.replace('"runtime": "node"', '"runtime": "node", "monitor": { "on": ["error"] }');
    });
    f.stream().emit(transitionEvent({ holder: "owner" }), 2);
    f.stream().emit(transitionEvent({ holder: "owner", newState: "error" }), 3);
    expect(f.messages).toHaveLength(2);
    f.shutdown();
  });

  test("stop and shutdown close once and suppress late events and replay gaps", () => {
    const f = fixture();
    f.call(true);
    const previous = f.stream();
    previous.gap?.(42);
    expect(f.messages[0]?.text).toContain("reconcile missed events");
    f.call(false);
    f.call(false);
    f.call(true);
    previous.emit(transitionEvent({ holder: "owner" }), 43);
    previous.gap?.(44);
    expect(previous.closes).toBe(1);
    expect(f.messages).toHaveLength(1);
    f.shutdown();
    f.shutdown();
    f.stream().emit(transitionEvent({ holder: "owner" }), 45);
    expect(f.stream().closes).toBe(1);
    expect(f.messages).toHaveLength(1);
  });

  test("missing identity refuses start; changed identity suppresses delivery", () => {
    const f = fixture();
    f.setKey(undefined);
    expect(() => f.call(true)).toThrow("no orch identity");
    expect(f.streams).toHaveLength(0);
    f.setKey("owner");
    f.call(true);
    f.setKey("replacement");
    f.stream().emit(transitionEvent({ holder: "owner" }), 1);
    f.stream().gap?.(2);
    expect(f.messages).toHaveLength(0);
    f.shutdown();
  });
});
