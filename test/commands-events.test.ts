import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eventInMineScope, eventInScope, eventInSpaceScope, formatEventGap, isNotifyEvent, parseEventsOptions, renderEvent, sinkLabel } from "../src/commands/events.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { recordSpawned } from "../src/presence/store.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { helpTopic } from "../src/commands/help.ts";
import { subscribeEvents } from "../src/daemon/rpc.ts";

describe("commands/events", () => {
  test("owned renderers and tool help do not expose the retired workspace term", () => {
    const files = ["src/commands/results.ts", "src/commands/events.ts", "src/commands/queue.ts", "src/agent/peers.ts", "src/table.ts"];
    const source = files.map((file) => readFileSync(file, "utf8")).join("\\n");
    expect(source).not.toMatch(/description:\s*"[^"]*workspace/i);
    expect(source).not.toContain("spaceName");
    expect(source).not.toContain('host: "local"');
  });

  // Bare `orch events` IS the normal use, so it must need no flags to be useful: a readable
  // line per transition, scoped to the agents this session currently leases. Every flag
  // widens or reshapes that. A default that streamed every session's agents as raw JSON made
  // the caller pass three flags and a jq filter to get back to what it wanted in the first place.
  test("bare events is scoped to this session's agents and renders readable lines", () => expect(parseEventsOptions([])).toEqual({ statusFilter: null, all: false, json: false, sinceSeq: undefined, once: false, mine: true, targets: [] }));
  test("parses filters and scope flags", () => expect(parseEventsOptions(["--status", "working,done", "--all", "--any-agent", "agent"])).toEqual({ statusFilter: new Set(["working", "done"]), all: true, json: false, sinceSeq: undefined, once: false, mine: false, targets: ["agent"] }));
  test("parses the wake-up flags", () => expect(parseEventsOptions(["--once", "--since-seq", "42", "--json"])).toEqual({ statusFilter: null, all: false, json: true, sinceSeq: 42, once: true, mine: true, targets: [] }));
  test("includes an adopted agent whose open lease is mine", () => {
    expect(eventInMineScope({ mineAddress: "me", leaseOwner: "me" })).toBe(true);
  });
  test("includes a reused pane leased by me even when another session spawned it", () => {
    const event = { mineAddress: "me", leaseOwner: "me", eventSpawnedBy: "dead-session" };
    expect(eventInMineScope(event)).toBe(true);
  });
  test("includes an unleased agent spawned by this session", () => {
    const event = { mineAddress: "me", leaseOwner: null, recordSpawnedBy: "me" };
    expect(eventInMineScope(event)).toBe(true);
  });
  test("excludes an agent spawned by a different session", () => {
    const event = { mineAddress: "me", leaseOwner: null, recordSpawnedBy: "other" };
    expect(eventInMineScope(event)).toBe(false);
  });
  test("--any-agent passes agents from both sessions", () => {
    const mine = { anyAgent: true, mineAddress: "me", leaseOwner: null, recordSpawnedBy: "me" };
    const other = { anyAgent: true, mineAddress: "me", leaseOwner: "other", recordSpawnedBy: "other" };
    expect(eventInScope(mine)).toBe(true);
    expect(eventInScope(other)).toBe(true);
  });
  test("excludes an agent while another orch holds its lease", () => {
    const event = { mineAddress: "me", leaseOwner: "other", eventSpawnedBy: "me", recordSpawnedBy: "me" };
    expect(eventInMineScope(event)).toBe(false);
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
  test("renders opaque plexer coordinates without relabeling them as spaces", () => {
    const event = { key: "agent", space: "wF", agent: "pi", tab: null, model: null, oldState: "working", newState: "done", lastText: "finished", ts: "now" };
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

  test("rejects malformed event and labels sinks", () => {
    expect(isNotifyEvent({ key: "k", oldState: "idle", newState: "done", ts: "now" })).toBe(true);
    expect(isNotifyEvent({ key: "k" })).toBe(false);
    expect(sinkLabel({ id: "command", command: ["echo", "ok"] })).toBe("command echo ok");
  });
});

// A1 / CLAUDE.md Rule 11: `orch events` scopes the stream by the agent's CURRENT
// space, composed from `agent_spaces`. It used to read a space segment out of the
// identity key, so a moved or adopted agent kept streaming into the space it was
// BORN in and went silent in the one it actually occupies.
describe("commands/events space scope", () => {
  const directories: string[] = [];
  let previousOrchDir: string | undefined;

  function tempOrchDir(): string {
    previousOrchDir ??= process.env.ORCH_DIR;
    const directory = mkdtempSync(join(tmpdir(), "orch-events-space-"));
    directories.push(directory);
    process.env.ORCH_DIR = directory;
    return directory;
  }

  function seedAgent(root: string, space: string): string {
    const key = mintAgentId();
    seedSpace(root, space);
    registerSpawnedAgent(root, { key, harnessId: "pi", backendId: "herdr", pane: true, handle: `%${key}`, cwd: root, name: "recon", model: "test", spawner: null });
    recordSpawned(key, { adapter: "pi", space });
    return key;
  }

  afterEach(() => {
    if (previousOrchDir === undefined) delete process.env.ORCH_DIR;
    else process.env.ORCH_DIR = previousOrchDir;
    previousOrchDir = undefined;
    while (directories.length > 0) removeTempDir(directories.pop()!);
  });

  test("an agent streams into the space it currently occupies", () => {
    const root = tempOrchDir();
    const key = seedAgent(root, "w1");
    expect(eventInSpaceScope(root, key, "w1", false)).toBe(true);
    expect(eventInSpaceScope(root, key, "w2", false)).toBe(false);
  });

  test("moving an agent moves its events with it", () => {
    const root = tempOrchDir();
    const key = seedAgent(root, "w1");
    seedSpace(root, "w2");
    recordSpawned(key, { adapter: "pi", space: "w2" });
    // The identity key never changed; only the environment did.
    expect(eventInSpaceScope(root, key, "w1", false)).toBe(false);
    expect(eventInSpaceScope(root, key, "w2", false)).toBe(true);
  });

  test("--all streams every space, and an unplaced caller scopes to none", () => {
    const root = tempOrchDir();
    const key = seedAgent(root, "w1");
    expect(eventInSpaceScope(root, key, "w2", true)).toBe(true);
    expect(eventInSpaceScope(root, key, null, false)).toBe(false);
  });

  test("a key naming no registered agent is in no space", () => {
    const root = tempOrchDir();
    expect(eventInSpaceScope(root, mintAgentId(), "w1", false)).toBe(false);
  });
});
