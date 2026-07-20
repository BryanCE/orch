import { describe, expect, test } from "bun:test";
import { isNotifyEvent, parseEventsOptions, sinkLabel } from "../src/commands/events.ts";

describe("commands/events", () => {
  test("parses filters and scope flags", () => expect(parseEventsOptions(["--status", "working,done", "--all", "agent"])).toEqual({ statusFilter: new Set(["working", "done"]), all: true, json: false, targets: ["agent"] }));
  test("rejects malformed event and labels sinks", () => {
    expect(isNotifyEvent({ key: "k", oldState: "idle", newState: "done", ts: "now" })).toBe(true);
    expect(isNotifyEvent({ key: "k" })).toBe(false);
    expect(sinkLabel({ type: "command", command: ["echo", "ok"] } as Parameters<typeof sinkLabel>[0])).toBe("command echo ok");
  });
});
