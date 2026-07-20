import { describe, expect, test } from "bun:test";
import { DAEMON_DISCONNECTED, isNotifyEvent, parseEventsOptions, sinkLabel } from "../src/commands/events.ts";

describe("commands/events", () => {
  test("parses filters and scope flags", () => expect(parseEventsOptions(["--status", "working,done", "--all", "agent"])).toEqual({ statusFilter: new Set(["working", "done"]), all: true, json: false, targets: ["agent"] }));
  test("a dropped subscription names the command that recovers it", () => {
    // The daemon is the only event source, so a disconnect must terminate rather than
    // silently degrade to watching presence files. `die` exits non-zero; what needs
    // pinning is that the operator is told which command brings the source back.
    expect(DAEMON_DISCONNECTED).toContain("orch daemon start");
    expect(DAEMON_DISCONNECTED).toContain("daemon disconnected");
  });
  test("rejects malformed event and labels sinks", () => {
    expect(isNotifyEvent({ key: "k", oldState: "idle", newState: "done", ts: "now" })).toBe(true);
    expect(isNotifyEvent({ key: "k" })).toBe(false);
    expect(sinkLabel({ type: "command", command: ["echo", "ok"] } as Parameters<typeof sinkLabel>[0])).toBe("command echo ok");
  });
});
