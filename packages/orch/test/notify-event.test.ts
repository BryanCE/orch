import { describe, expect, test } from "bun:test";
import { eventState, isNotifyEvent } from "../src/notify/event.ts";
import type { NotifyEvent } from "../src/types/notify.ts";

const identity = {
  key: "agent-1",
  ts: "2026-01-01T00:00:00.000Z",
  agent: "pi",
  tab: null,
  model: null,
};

const transition: NotifyEvent = {
  ...identity,
  type: "transition",
  oldState: "working",
  newState: "done",
  task: "finish the work",
};

const asking: NotifyEvent = {
  ...identity,
  type: "asking",
  oldState: "working",
  newState: "asking",
  askCount: 1,
  gaveUp: false,
};

const message: NotifyEvent = {
  ...identity,
  type: "message",
  newState: "message",
  dispatchId: "dispatch-1",
  mail: { id: "mail-1", text: "hello" },
};

const closed: NotifyEvent = {
  ...identity,
  type: "closed",
  oldState: "done",
  newState: "closed",
};

const task: NotifyEvent = {
  ...identity,
  type: "task",
  oldState: "queued",
  newState: "claimed",
  task: "run the task",
};

describe("notify events", () => {
  test("accepts every event member", () => {
    for (const event of [transition, asking, message, closed, task]) {
      expect(isNotifyEvent(event)).toBe(true);
    }
  });

  test("rejects invalid event shapes", () => {
    expect(isNotifyEvent({ ...transition, newState: "asking" })).toBe(false);
    expect(isNotifyEvent({ ...asking, askCount: undefined })).toBe(false);
    expect(isNotifyEvent({ ...message, mail: undefined })).toBe(false);
    expect(isNotifyEvent({ ...identity, type: "other" })).toBe(false);
    expect(isNotifyEvent(identity)).toBe(false);
  });

  test("reads agent state only from state events", () => {
    expect(eventState(transition)).toBe("done");
    expect(eventState(asking)).toBe("asking");
    expect(eventState(message)).toBeUndefined();
    expect(eventState(closed)).toBeUndefined();
    expect(eventState(task)).toBeUndefined();
  });
});
