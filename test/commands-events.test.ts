import { describe, expect, test } from "bun:test";
import { eventInMineScope, formatEventGap, isNotifyEvent, parseEventsOptions, sinkLabel } from "../src/commands/events.ts";
import { helpTopic } from "../src/commands/help.ts";
import { subscribeEvents } from "../src/daemon/rpc.ts";

describe("commands/events", () => {
  // Bare `orch events` IS the normal use, so it must need no flags to be useful: a readable
  // line per transition, scoped to the agents this session spawned. Every flag widens or
  // reshapes that. A default that streamed every session's agents as raw JSON made the
  // caller pass three flags and a jq filter to get back to what it wanted in the first place.
  test("bare events is scoped to this session's agents and renders readable lines", () => expect(parseEventsOptions([])).toEqual({ statusFilter: null, all: false, json: false, sinceSeq: undefined, once: false, mine: true, targets: [] }));
  test("parses filters and scope flags", () => expect(parseEventsOptions(["--status", "working,done", "--all", "--any-agent", "agent"])).toEqual({ statusFilter: new Set(["working", "done"]), all: true, json: false, sinceSeq: undefined, once: false, mine: false, targets: ["agent"] }));
  test("parses the wake-up flags", () => expect(parseEventsOptions(["--once", "--since-seq", "42", "--json"])).toEqual({ statusFilter: null, all: false, json: true, sinceSeq: 42, once: true, mine: true, targets: [] }));
  test("includes an adopted agent whose open lease is mine", () => {
    expect(eventInMineScope({ mineAddress: "me", leaseOwner: "me", eventSpawnedBy: "other", recordSpawnedBy: "other" })).toBe(true);
  });
  test("keeps my spawned agent in scope before its lease is written", () => {
    expect(eventInMineScope({ mineAddress: "me", leaseOwner: null, eventSpawnedBy: "me", recordSpawnedBy: "me" })).toBe(true);
  });
  test("excludes my spawned agent while another orch holds its lease", () => {
    expect(eventInMineScope({ mineAddress: "me", leaseOwner: "other", eventSpawnedBy: "me", recordSpawnedBy: "me" })).toBe(false);
  });
  test("describes durable replay and reports pruned history gaps", () => {
    expect(helpTopic("events")).toContain("survives daemon restarts");
    expect(helpTopic("events")).toContain("events retention window");
    expect(formatEventGap(12)).toContain("replay resumes at sequence 12");
  });
  test("names one agent by name or by identity key", () => {
    expect(parseEventsOptions(["--agent=api-1"]).targets).toEqual(["api-1"]);
    expect(parseEventsOptions(["--agent-id=headless~local~abc"]).targets).toEqual(["headless~local~abc"]);
  });
  test("a subscription with no daemon keeps redialing instead of exiting", () => {
    // One subscription must cover a whole session: a daemon restart drops the
    // socket, and the stream has to come back on its own. Dialing an orch dir with
    // no daemon is the same path a restart takes — it must resolve, not throw.
    const delivered: unknown[] = [];
    const subscription = subscribeEvents("/nonexistent-orch-dir", { since: 0 }, (event) => delivered.push(event));
    expect(subscription.lastSeq()).toBe(0);
    expect(delivered).toEqual([]);
    subscription.close();
  });
  test("rejects malformed event and labels sinks", () => {
    expect(isNotifyEvent({ key: "k", oldState: "idle", newState: "done", ts: "now" })).toBe(true);
    expect(isNotifyEvent({ key: "k" })).toBe(false);
    expect(sinkLabel({ type: "command", command: ["echo", "ok"] } as Parameters<typeof sinkLabel>[0])).toBe("command echo ok");
  });
});
