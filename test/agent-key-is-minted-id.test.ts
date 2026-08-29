import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { createAgentPresence } from "../src/agent/presence.ts";
import { deriveDriveState } from "../src/agent/drive-state.ts";
import { checkMalformedPresenceRecords } from "../src/doctor/presence.ts";
import { peerSummaries } from "../src/agent/peers.ts";
import { selfIdentity } from "../src/identity/self.ts";
import { isAgentId, mintAgentId } from "../src/backends/identity.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { processStartToken } from "../src/process-identity.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { HarnessApi, HarnessEventHandler } from "../src/types/agent.ts";

/**
 * A1 ripple — the agent-side readers of an identity key.
 *
 * TASKS/01-agent-model.md: *"Identity = a minted id and NOTHING else,
 * immutable… Never encode environment into identity. No
 * `<backend>~<workspace>~<handle>` key. `"local"` is not a place, it is a
 * missing value with a name."*
 *
 * These five modules (`src/agent/presence.ts`, `src/agent/peers.ts`,
 * `src/agent/drive-state.ts`, `src/identity/self.ts`, `src/doctor/presence.ts`)
 * all used to build or split a three-segment key. This file pins the ONE shape
 * they may now see: a bare minted id, with a driving session — which is in no
 * plexer and no space — minting one like every other agent instead of being
 * stamped `headless~local~…`.
 */

/** The composite this whole change deletes. Never a valid key again. */
const COMPOSITE_KEY = "headless~local~7x5hd4h610";

/** A pid no process holds, so a seeded record reads as a dead one: doctor holds
 *  back its verdict on a record whose session is still running. */
const DEAD_PID = 2147483646;

const directories: string[] = [];
const originalOrchDir = process.env.ORCH_DIR;
const originalAgentKey = process.env.ORCH_AGENT_KEY;
const originalSessionKey = process.env.ORCH_SESSION_KEY;

function tempOrchDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-a1-ripple-"));
  directories.push(directory);
  process.env.ORCH_DIR = directory;
  return directory;
}

afterEach(() => {
  closeAllStores();
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  if (originalAgentKey === undefined) delete process.env.ORCH_AGENT_KEY;
  else process.env.ORCH_AGENT_KEY = originalAgentKey;
  if (originalSessionKey === undefined) delete process.env.ORCH_SESSION_KEY;
  else process.env.ORCH_SESSION_KEY = originalSessionKey;
  while (directories.length > 0) removeTempDir(directories.pop()!);
});

function fakeHarness(): HarnessApi {
  const handlers = new Map<string, HarnessEventHandler[]>();
  return {
    on(name: string, handler: HarnessEventHandler): void {
      handlers.set(name, [...(handlers.get(name) ?? []), handler]);
    },
    registerTool: () => undefined,
    registerCommand: () => undefined,
    sendUserMessage: () => undefined,
    setModel: () => Promise.resolve(true),
    getThinkingLevel: () => undefined,
    setThinkingLevel: () => undefined,
    events: { on: () => undefined },
  };
}

function presenceFor() {
  return createAgentPresence({
    harness: fakeHarness(),
    identity: { agentId: "pi", settleEvent: "agent_settled" },
    paneId: null,
    extensionHash: "test",
    ack: {
      messageIdOf: () => undefined,
      isAcked: () => false,
      markAcked: () => undefined,
      post: () => Promise.resolve(true),
    },
    reportStatus: () => undefined,
  });
}

describe("a driving session mints an id, it is not placed by name", () => {
  test("the key an interactive session addresses itself by is a bare minted id", () => {
    tempOrchDir();
    delete process.env.ORCH_AGENT_KEY;
    const presence = presenceFor();
    presence.initPresence(true);
    const key = presence.keyOrCompute(true);
    presence.stopPresence();

    // A session is in no plexer and in no space. `headless` and `local` are the
    // two sentinels TASKS/01 §3 outlaws: NULL wearing a name, and the exact pair
    // that made the web render a fake space called "local".
    expect(isAgentId(key)).toBe(true);
    expect(key).not.toContain("~");
    expect(key).not.toContain("local");
    expect(key).not.toContain("headless");
  });

  test("the presence directory is named by that id alone", () => {
    tempOrchDir();
    delete process.env.ORCH_AGENT_KEY;
    const presence = presenceFor();
    presence.initPresence(true);
    const directory = presence.dir();
    presence.stopPresence();
    expect(directory).toBeDefined();
    expect(isAgentId(basename(directory ?? ""))).toBe(true);
  });

  test("a launch that handed over a composite key handed over no identity", () => {
    tempOrchDir();
    process.env.ORCH_AGENT_KEY = COMPOSITE_KEY;
    const presence = presenceFor();
    presence.initPresence(false);
    const directory = presence.dir();
    presence.stopPresence();
    // Zero back-compat: the composite is not an old spelling of a key, it is not
    // a key. Writing presence under it would recreate the very directory names
    // this change exists to delete.
    expect(directory).toBeUndefined();
  });

  test("a launch that handed over a minted id is used verbatim", () => {
    tempOrchDir();
    const id = mintAgentId();
    process.env.ORCH_AGENT_KEY = id;
    const presence = presenceFor();
    presence.initPresence(false);
    const directory = presence.dir();
    presence.stopPresence();
    expect(basename(directory ?? "")).toBe(id);
  });
});

describe("this process's own identity is the id and nothing else", () => {
  test("a spawned agent answers with the id its launch handed it", () => {
    tempOrchDir();
    const id = mintAgentId();
    process.env.ORCH_AGENT_KEY = id;
    expect(selfIdentity()).toEqual({ id });
  });

  test("a composite key never yields an identity, whole or in pieces", () => {
    tempOrchDir();
    process.env.ORCH_AGENT_KEY = COMPOSITE_KEY;
    const self = selfIdentity();
    expect(self?.id).not.toBe(COMPOSITE_KEY);
    expect(self?.id).not.toBe("7x5hd4h610");
  });
});

describe("the fleet wall is lifted by the absence of a launch, not by a key's shape", () => {
  /** Two agents in one space, in two different projects. The wall is what keeps
   *  a worker's `all` flag from reaching the other project's fleet. */
  function twoProjects(ownKey: string): string {
    const directory = tempOrchDir();
    seedStatus(directory, ownKey, { agent: "pi", label: "caller", pid: process.pid, state: "idle" });
    seedStatus(directory, mintAgentId(), {
      agent: "pi",
      label: "foreigner",
      pid: process.pid,
      state: "working",
      project: "/some/other/project",
    });
    return directory;
  }

  test("an agent orch launched may not cross into another project's fleet", () => {
    const ownKey = mintAgentId();
    twoProjects(ownKey);
    process.env.ORCH_AGENT_KEY = ownKey;
    expect(peerSummaries(ownKey, true)).toEqual([]);
  });

  test("a malformed launch key walls the caller in, it does not free them", () => {
    // The wall asked whether the key PARSED, so a key it could not parse read as
    // "no launch happened" — a human's own session — and widened a worker's
    // reach across every fleet. Whether orch launched this process is provenance;
    // it is never decided by picking a key apart.
    const ownKey = mintAgentId();
    twoProjects(ownKey);
    process.env.ORCH_AGENT_KEY = COMPOSITE_KEY;
    expect(peerSummaries(ownKey, true)).toEqual([]);
  });
});

describe("who drives an agent is looked up by its id", () => {
  const HOLDER = "aaaaaaaaa1";
  const HELD = "bbbbbbbbb2";

  function leased(): string {
    const directory = tempOrchDir();
    ensureHarness(directory, "pi", "Pi", 1);
    const database = openStore(directory);
    database.query("INSERT INTO hosts(id,name,os,created_at) VALUES ('host','host','linux',1)").run();
    for (const id of [HOLDER, HELD]) {
      insertAgent(directory, { id, harnessId: "pi", cwd: "/tmp", name: id, createdAt: 1 });
    }
    const token = processStartToken(process.pid);
    if (!token) throw new Error("test process has no start token");
    database.query("INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (?,?,?,?,?)")
      .run(HOLDER, 1, "host", process.pid, token);
    acquireLease(directory, HELD, HOLDER, 2);
    return directory;
  }

  test("the key IS the agent id — no segment is split out of it", () => {
    const directory = leased();
    expect(deriveDriveState(HELD, { directory, currentOrchId: HOLDER }))
      .toEqual({ kind: "leased", owner: HOLDER, mine: true });
  });

  test("a composite key addresses no agent at all", () => {
    const directory = leased();
    // The old reader split `<plexer>~<grouping>~<id>` and answered for the id
    // segment, so a caller could drive an agent by naming where it used to sit.
    expect(deriveDriveState(`herdr~wF~${HELD}`, { directory, currentOrchId: HOLDER }))
      .toEqual({ kind: "unleased", owner: "no orch driving it", mine: false });
  });
});

describe("doctor reads a presence directory name as an id", () => {
  test("a composite directory name is a malformed identity key", () => {
    const directory = tempOrchDir();
    seedStatus(directory, COMPOSITE_KEY, { schema: PRESENCE_SCHEMA, agent: "pi", pid: DEAD_PID, state: "idle" });
    const result = checkMalformedPresenceRecords(directory);
    expect(result.status).toBe("fail");
    expect(result.ignoredRecords?.[0]?.reason).toContain("malformed identity key");
  });

  test("a minted id with a current stamp is well formed", () => {
    const directory = tempOrchDir();
    seedStatus(directory, mintAgentId(), { schema: PRESENCE_SCHEMA, agent: "pi", pid: DEAD_PID, state: "idle" });
    const result = checkMalformedPresenceRecords(directory);
    expect(result.status).toBe("ok");
    expect(result.ignoredRecords).toEqual([]);
  });
});
