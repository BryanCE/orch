import type { OrchDir } from "../src/types/core.ts";
import { orchDirAt } from "../src/services.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eventAcceptor, eventWithinSpaceWall, formatEventGap, isNotifyEvent, onMonitor, parseEventsOptions, passesStateFilter, renderEvent, sinkLabel } from "../src/commands/events.ts";
import { MONITOR_DEFAULT_ON } from "../src/settings/schema.ts";
import { agentInMineScope, agentInScope } from "../src/policy/scope.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir, tempOrchDir as mintTempOrchDir } from "./helpers/tempdir.ts";
import { helpTopic } from "../src/commands/index.ts";
import { subscribeEvents } from "../src/daemon/client/rpc.ts";
import { setSpace } from "../src/store/interval-rows.ts";
import type { NotifyEvent } from "../src/types/notify.ts";
import type { AgentState } from "../src/agent-state.ts";

function transition(oldState: AgentState, newState: Exclude<AgentState, "asking">): NotifyEvent {
  return { type: "transition", key: "agent", agent: "pi", tab: null, model: null, oldState, newState, ts: "now" };
}

describe("commands/events", () => {
  test("owned renderers and tool help do not expose the retired workspace term", () => {
    const files = ["src/commands/results.ts", "src/commands/events.ts", "src/commands/queue.ts", "src/agent/peers.ts", "src/table.ts"]
      .map((file) => join(import.meta.dir, "..", file));
    const source = files.map((file) => readFileSync(file, "utf8")).join("\\n");
    expect(source).not.toMatch(/description:\s*"[^"]*workspace/i);
    expect(source).not.toContain("spaceName");
    expect(source).not.toContain('host: "local"');
  });

  // Bare `orch events` IS the normal use, so it must need no flags to be useful: a readable
  // line per transition, scoped to the agents this session currently leases. Every flag
  // widens or reshapes that. A default that streamed every session's agents as raw JSON made
  // the caller pass three flags and a jq filter to get back to what it wanted in the first place.
  test("bare events is scoped to this session's agents and renders readable lines", () => expect(parseEventsOptions([])).toEqual({ json: false, sinceSeq: undefined, once: false, scope: "auto", filter: null, targets: [] }));
  test("parses the scope flags", () => expect(parseEventsOptions(["--space-wide", "agent"])).toEqual({ json: false, sinceSeq: undefined, once: false, scope: "any", filter: null, targets: ["agent"] }));
  test("parses the wake-up flags", () => expect(parseEventsOptions(["--once", "--since-seq", "42", "--json"])).toEqual({ json: true, sinceSeq: 42, once: true, scope: "auto", filter: null, targets: [] }));
  test("--filter names the states to drop and is never the default", () => {
    expect(parseEventsOptions(["--filter=working,idle"]).filter).toEqual(new Set(["working", "idle"]));
    expect(parseEventsOptions([]).filter).toBeNull();
    const shows = passesStateFilter(new Set(["working"]));
    expect(shows(transition("idle", "working"))).toBe(false);
    expect(shows(transition("working", "done"))).toBe(true);
    expect(passesStateFilter(null)(transition("idle", "working"))).toBe(true);
  });

  // `orch monitor` is the orchestrator's watch: the same stream, kept to what it acts on.
  // A mid-turn flip is what flooded the bare events stream, so it never reaches the monitor.
  test("the monitor shows only the monitor.on states and every worker message", () => {
    const shows = onMonitor(MONITOR_DEFAULT_ON);
    expect(shows(transition("working", "done"))).toBe(true);
    expect(shows(transition("working", "error"))).toBe(true);
    expect(shows(transition("working", "blocked"))).toBe(true);
    expect(shows(transition("done", "exited"))).toBe(true);
    expect(shows({ type: "asking", key: "agent", agent: "pi", tab: null, model: null, oldState: "working", newState: "asking", askCount: 1, gaveUp: false, ts: "now" })).toBe(true);
    expect(shows({ type: "message", key: "agent", agent: "pi", tab: null, model: null, newState: "message", dispatchId: "d", ts: "now", mail: { id: "m", text: "report" } })).toBe(true);
    expect(shows(transition("idle", "working"))).toBe(false);
    expect(shows(transition("working", "idle"))).toBe(false);
    expect(shows(transition("blocked", "working"))).toBe(false);
    expect(shows({ type: "closed", key: "agent", agent: "pi", tab: null, model: null, oldState: "done", newState: "closed", ts: "now" })).toBe(false);
    expect(shows({ type: "task", key: "agent", agent: "pi", tab: null, model: null, oldState: "queued", newState: "claimed", task: "t", ts: "now" })).toBe(false);
  });
  test("the monitor's states come from settings, not from the code", () => {
    const shows = onMonitor(["done"]);
    expect(shows(transition("working", "done"))).toBe(true);
    expect(shows(transition("working", "error"))).toBe(false);
  });
  test("the monitor parses the same flags as events under its own usage", () => {
    expect(parseEventsOptions(["--space-wide", "--json"], "monitor")).toEqual({ json: true, sinceSeq: undefined, once: false, scope: "any", filter: null, targets: [] });
    expect(helpTopic("monitor")).toContain("monitor.on");
  });
  test("includes an adopted agent whose open lease is mine", () => {
    expect(agentInMineScope({ mineAddress: "me", leaseOwner: "me" })).toBe(true);
  });
  test("includes a reused pane leased by me even when another session spawned it", () => {
    const event = { mineAddress: "me", leaseOwner: "me", eventSpawnedBy: "dead-session" };
    expect(agentInMineScope(event)).toBe(true);
  });
  test("includes an unleased agent spawned by this session", () => {
    const event = { mineAddress: "me", leaseOwner: null, recordSpawnedBy: "me" };
    expect(agentInMineScope(event)).toBe(true);
  });
  test("excludes an agent spawned by a different session", () => {
    const event = { mineAddress: "me", leaseOwner: null, recordSpawnedBy: "other" };
    expect(agentInMineScope(event)).toBe(false);
  });
  test("--space-wide passes agents from both sessions", () => {
    const mine = { spaceWide: true, mineAddress: "me", leaseOwner: null, recordSpawnedBy: "me" };
    const other = { spaceWide: true, mineAddress: "me", leaseOwner: "other", recordSpawnedBy: "other" };
    expect(agentInScope(mine)).toBe(true);
    expect(agentInScope(other)).toBe(true);
  });
  test("excludes an agent while another orch holds its lease", () => {
    const event = { mineAddress: "me", leaseOwner: "other", eventSpawnedBy: "me", recordSpawnedBy: "me" };
    expect(agentInMineScope(event)).toBe(false);
  });
  test("describes durable replay and reports pruned history gaps", () => {
    expect(helpTopic("events")).toContain("survives daemon restarts");
    expect(helpTopic("events")).toContain("events retention window");
    expect(formatEventGap(12)).toContain("replay resumes at sequence 12");
  });
  test("names one agent by name or by identity key", () => {
    expect(parseEventsOptions(["--agent=api-1"]).targets).toEqual(["api-1"]);
    expect(parseEventsOptions(["--agent-id=abcagent01"]).targets).toEqual(["abcagent01"]);
  });
  test("a subscription with no daemon keeps redialing instead of exiting", () => {
    // One subscription must cover a whole session: a daemon restart drops the
    // socket, and the stream has to come back on its own. Dialing an orch dir with
    // no daemon is the same path a restart takes — it must resolve, not throw.
    const delivered: unknown[] = [];
    const subscription = subscribeEvents(orchDirAt("/nonexistent-orch-dir"), { since: 0 }, (event) => delivered.push(event));
    expect(subscription.lastSeq()).toBe(0);
    expect(delivered).toEqual([]);
    subscription.close();
  });
  test("renders opaque plexer coordinates without relabeling them as spaces", () => {
    const event: NotifyEvent = { type: "transition", key: "agent", space: "wF", agent: "pi", tab: null, model: null, oldState: "working", newState: "done", lastText: "finished", ts: "now" };
    const json = renderEvent(event, true, 4);
    const parsed: unknown = JSON.parse(json);
    expect(parsed).toMatchObject({ space: "wF", streamSeq: 4 });
    expect(parsed).not.toHaveProperty("workspace");
    expect(parsed).not.toHaveProperty("spaceName");
    expect(json).not.toContain("Friendly name");
    const text = renderEvent(event, false, 4);
    expect(text).toContain("[wF]");
    expect(text).not.toContain("Friendly name");

    const absent = renderEvent({ ...event, space: undefined }, true, 5);
    expect(absent).not.toContain("space");
    expect(absent).not.toContain("workspace");
    expect(absent).not.toContain("local");
  });

  // Cost and pack capacity are `orch status` columns. On a stream they made every
  // transition read like a status row and buried what the line exists to say.
  test("message events render the full delivered mail text once", () => {
    const mail = "[from worker (worker-key)] hello orchestrator, this report runs well past the sixty characters a notification title keeps";
    const line = renderEvent({ type: "message", key: "agent", space: "wF", agent: "pi", tab: null, model: null, newState: "message", dispatchId: "dispatch-message", ts: "now", mail: { id: "mail-1", text: mail } }, false, 4);
    expect(line).toEndWith(mail);
    expect(line.split("[from worker").length).toBe(2);
    expect(line).not.toContain("message->message");
  });

  test("an agent in no space gets no empty bracket on its line", () => {
    const event: NotifyEvent = { type: "transition", key: "agent", agent: "pi", tab: null, model: null, oldState: "working", newState: "done", ts: "now" };
    expect(renderEvent(event, false, 4)).not.toContain("[]");
    expect(renderEvent({ ...event, space: "" }, false, 4)).not.toContain("[]");
  });

  test("an event line says what happened, never the fleet's books", () => {
    const event: NotifyEvent = { type: "transition", key: "agent", space: "wF", agent: "pi", tab: null, model: null, oldState: "working", newState: "done", ts: "now" };
    const line = renderEvent(event, false, 4);
    expect(line).toEndWith("working->done");
    expect(line).not.toContain("pack");
    expect(line).not.toContain("$");
  });

  test("rejects malformed event and labels sinks", () => {
    expect(isNotifyEvent({ type: "transition", key: "k", agent: null, tab: null, model: null, oldState: "idle", newState: "done", ts: "now" })).toBe(true);
    expect(isNotifyEvent({ key: "k" })).toBe(false);
    expect(sinkLabel({ id: "command", command: ["echo", "ok"] })).toBe("command echo ok");
  });
});

// The wall is unconditional: no flag punches through it, so every case here is
// about WHERE the agent is now. A1 / Rule 11: the space is composed from
// `agent_spaces`, never a segment read out of the identity key, which pinned the
// stream to the space the agent was born in.
describe("commands/events space wall", () => {
  const directories: OrchDir[] = [];
  let previousOrchDir: OrchDir | undefined;

  function tempOrchDir(): OrchDir {
    previousOrchDir ??= process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
    const directory = mintTempOrchDir("orch-events-space-");
    directories.push(directory);
    process.env.ORCH_DIR = directory;
    return directory;
  }

  function seedAgent(root: OrchDir, space: string): string {
    const key = mintAgentId();
    seedSpace(root, space);
    registerSpawnedAgent(root, { key, harnessId: "pi", backendId: "herdr", placed: true, handle: `%${key}`, cwd: root, name: "recon", model: "test", space, spawner: null, process: { pid: process.pid, startToken: "commands-events-space-wall-fixture" } });
    return key;
  }

  afterEach(() => {
    if (previousOrchDir === undefined) delete process.env.ORCH_DIR;
    else process.env.ORCH_DIR = previousOrchDir;
    previousOrchDir = undefined;
    while (directories.length > 0) removeTempDir(directories.pop()!);
  });

  test("an agent is heard only inside the space it currently occupies", () => {
    const root = tempOrchDir();
    const key = seedAgent(root, "w1");
    expect(eventWithinSpaceWall(root, key, "w1")).toBe(true);
    expect(eventWithinSpaceWall(root, key, "w2")).toBe(false);
  });

  test("moving an agent moves its events with it", () => {
    const root = tempOrchDir();
    const key = seedAgent(root, "w1");
    seedSpace(root, "w2");
    // A move is a new interval on the space axis, not a re-registration.
    setSpace(root, key, Date.now(), "w2");
    // The identity key never changed; only the environment did.
    expect(eventWithinSpaceWall(root, key, "w1")).toBe(false);
    expect(eventWithinSpaceWall(root, key, "w2")).toBe(true);
  });

  // The human at a raw terminal: orch minted them no id, so they sit in no space and
  // there is no wall to stand on. Matching spaces both ways here silenced their stream
  // entirely, which is the one caller allowed to watch the whole machine.
  test("an unplaced caller has no wall and hears the machine", () => {
    const root = tempOrchDir();
    const key = seedAgent(root, "w1");
    expect(eventWithinSpaceWall(root, key, null)).toBe(true);
  });

  test("a key naming no registered agent is in no space", () => {
    const root = tempOrchDir();
    expect(eventWithinSpaceWall(root, mintAgentId(), "w1")).toBe(false);
  });

  // A session watches what it OWNS. Its own transitions are what it is doing, and
  // streaming them back is how an orchestrator's monitor filled with its own lines.
  // Mail is the one exception: a message event is keyed by its recipient.
  test("a session hears its workers and its mail, never its own transitions", () => {
    const root = tempOrchDir();
    const me = mintAgentId();
    const worker = mintAgentId();
    seedSpace(root, "w1");
    registerSpawnedAgent(root, { key: me, harnessId: "claude", placed: false, cwd: root, name: "orchestrator", model: "test", space: "w1", spawner: null, process: { pid: process.pid, startToken: "commands-events-self-fixture" } });
    registerSpawnedAgent(root, { key: worker, harnessId: "pi", backendId: "herdr", placed: true, handle: `%${worker}`, cwd: root, name: "recon", model: "test", space: "w1", spawner: me, process: { pid: process.pid, startToken: "commands-events-self-fixture" } });
    const accepts = eventAcceptor(root, { ...parseEventsOptions([]), targets: ["recon"] }, new Set([worker]), { mine: true, address: me });
    expect(accepts(worker, "transition")).toBe(true);
    expect(accepts(me, "message")).toBe(true);
    expect(accepts(me, "transition")).toBe(false);
    expect(accepts(me, "asking")).toBe(false);
  });
});

