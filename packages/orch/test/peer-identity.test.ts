import { tempOrchDir as makeTempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { allAdapters } from "../src/adapters/registry.ts";
import { getOrCreateSessionAgent } from "../src/store/agent-rows.ts";
import { peerSummaries, resolvePeer, sendPeerMessage } from "../src/agent/peers.ts";
import { spawnedRecords } from "../src/presence/store.ts";
import { seedStatus } from "./helpers/presence.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedAgent, seedLiveProcess } from "./helpers/agent.ts";
import { askFrom, daemonClientForPeers } from "./helpers/daemon-client.ts";
import { peerView } from "../src/daemon/server/peer-view.ts";
import type { ParamsOf, ResultOf } from "../src/daemon/client/protocol.ts";

const IDENTITY_ENV = [
  "ORCH_DIR",
  ...allAdapters().flatMap((adapter) => [adapter.sessionEnvMarker, adapter.sessionIdEnv, adapter.sessionPidEnv])
    .filter((name): name is string => name !== undefined),
];

const directories: OrchDir[] = [];
function noPeersDaemon(directory: OrchDir) {
  return daemonClientForPeers(directory, []);
}
function daemonWithSpawner(directory: OrchDir, key: string, name: string) {
  const daemon = noPeersDaemon(directory);
  daemon.ask = askFrom({
    "peer-view": (params) => peerView(directory, params.ownKey, params.keys ?? [], params.allSpaces === true, params.projectRoot),
    self: () => ({
      id: "worker0001", kind: "agent", space: null, depth: 1,
      view: {
        id: "worker0001", name: "worker", label: "worker", harnessId: "pi", cwd: "/w", createdAt: 1,
        spawnedBy: key, spawnedByName: name, rootAgentId: key, heldBy: null,
        environment: { plexer: null, handle: null, space: null, worktree: null, branch: null },
        tuning: { model: null, thinking: null }, endedAt: null,
      },
    }),
  });
  return daemon;
}
let savedEnv: Record<string, string | undefined> = {};

function recordingDaemon(directory: OrchDir, keys: string[], messageResponse: ResultOf<"message"> | undefined) {
  const daemon = daemonClientForPeers(directory, keys);
  const calls: { method: string; params: ParamsOf<"message"> | ParamsOf<"peer-view"> }[] = [];
  const peerHandler = (params: ParamsOf<"peer-view">): ResultOf<"peer-view"> => {
    calls.push({ method: "peer-view", params });
    return peerView(directory, params.ownKey, (params.keys ?? []).length ? params.keys ?? [] : keys, params.allSpaces === true, params.projectRoot);
  };
  if (messageResponse === undefined) {
    daemon.ask = askFrom({ "peer-view": peerHandler });
  } else {
    daemon.ask = askFrom({
      "peer-view": peerHandler,
      message: (params) => {
        calls.push({ method: "message", params });
        return messageResponse;
      },
    });
  }
  return { daemon, calls };
}

function tempOrchDir(): OrchDir {
  const directory = makeTempOrchDir("orch-peer-identity-");
  directories.push(directory);
  process.env.ORCH_DIR = directory;
  return directory;
}

beforeEach(() => {
  savedEnv = Object.fromEntries(IDENTITY_ENV.map((name) => [name, process.env[name]]));
  for (const name of IDENTITY_ENV) delete process.env[name];
});

afterEach(() => {
  for (const name of IDENTITY_ENV) {
    if (savedEnv[name] === undefined) delete process.env[name];
    else process.env[name] = savedEnv[name];
  }
  while (directories.length > 0) {
    const directory = directories.pop();
    if (directory) removeTempDir(directory);
  }
});

describe("spawner provenance", () => {

  test("the registry keeps the exact spawning session distinct from the lease holder", () => {
    // Provenance and ownership are two facts on two timelines (Rule 11): who
    // spawned this agent never changes, who holds it can change every minute.
    // Both are keyed by a minted id — the spawner is an agent like any other.
    const orchDir = tempOrchDir();
    const session = getOrCreateSessionAgent(orchDir, {
      pid: 4242, startToken: "tok", sessionToken: "e2277e83-74d9", harnessId: "claude",
      cwd: "/w", label: "claude session", hostId: "h", hostName: "h", hostOs: "linux", now: 1,
    });
    const key = "stamp0001a";
    seedSpace(orchDir, "wF");
    seedAgent(key, {
      name: "fix-1",
      adapter: "pi",
      space: "wF",
      owner: "operator01",
      spawnedBy: session.id,
    }, orchDir);
    const record = spawnedRecords(orchDir).get(key);
    expect(record?.spawnedBy).toBe(session.id);
    expect(record?.heldBy?.orchId).toBe("operator01");
  });
});

describe("peer identity in messaging", () => {
  test("peer summaries take provenance and worktree facts from the daemon view", async () => {
    const directory = tempOrchDir();
    const spawnerKey = "orchestrator1";
    const peerKey = "worker0002";
    seedAgent(spawnerKey, { name: "orchestrator" }, directory);
    seedAgent(peerKey, {
      name: "worker",
      spawnedBy: spawnerKey,
      worktree: "/repo/.worktrees/worker",
      branch: "feature/worker",
    }, directory);
    seedLiveProcess(directory, peerKey);
    seedStatus(directory, peerKey, {
      agent: "pi", pid: process.pid, state: "working",
      label: "worker", spawnedByLabel: "stale status name",
    });

    const summary = (await peerSummaries(directory, daemonClientForPeers(directory, [peerKey]), "sender0001"))[0];
    expect(summary).toMatchObject({
      spawnedBy: spawnerKey,
      spawnedByLabel: "orchestrator",
      worktree: "/repo/.worktrees/worker",
      branch: "feature/worker",
    });
  });

  test("peer summaries render an unplaced agent without a local place name", async () => {
    const directory = tempOrchDir();
    const ownKey = "sender0001";
    const peerKey = "unplaced02";
    seedAgent(peerKey, { adapter: "pi" }, directory);
    seedLiveProcess(directory, peerKey);
    seedStatus(directory, peerKey, { agent: "pi", pid: process.pid, state: "idle", label: "unplaced" });

    const summary = (await peerSummaries(directory, daemonClientForPeers(directory, [peerKey]), ownKey))[0];
    expect(summary?.space).toBeNull();
    const output = JSON.stringify(summary);
    expect(output).not.toContain("local");
    expect(output).not.toContain("workspace");
  });

  test("orch_send reports the peer's NAME and calls the message RPC", async () => {
    const orchDir = tempOrchDir();
    const ownKey = "sender0001";
    const peerKey = "sweep20002";
    seedAgent(peerKey, { adapter: "pi", name: "sweep-2" }, orchDir);
    seedLiveProcess(orchDir, peerKey);
    seedStatus(orchDir, ownKey, { agent: "pi", label: "sweep-1", pid: process.pid, state: "working" });
    seedStatus(orchDir, peerKey, { agent: "pi", label: "sweep-2", pid: process.pid, state: "idle" });
    const { daemon, calls } = recordingDaemon(orchDir, [ownKey, peerKey], { accepted: true, id: "mail-1", ack: "acknowledged" });

    const result = await sendPeerMessage(orchDir, daemon, "sweep-2", "found it", ownKey);
    expect(result).toBe("sent to pi: sweep-2");
    expect(calls.find((call) => call.method === "message")?.params).toEqual({
      from: ownKey,
      target: peerKey,
      text: "found it",
    });
  });

  test("orch_send reports queued when the message is not acknowledged", async () => {
    const orchDir = tempOrchDir();
    const ownKey = "sender0001";
    const peerKey = "sweep20002";
    seedAgent(peerKey, { adapter: "pi", name: "sweep-2" }, orchDir);
    seedLiveProcess(orchDir, peerKey);
    seedStatus(orchDir, ownKey, { agent: "pi", label: "sweep-1", pid: process.pid, state: "working" });
    seedStatus(orchDir, peerKey, { agent: "pi", label: "sweep-2", pid: process.pid, state: "idle" });
    const { daemon } = recordingDaemon(orchDir, [ownKey, peerKey], { accepted: true, id: "mail-2", ack: "unavailable" });

    const result = await sendPeerMessage(orchDir, daemon, "sweep-2", "found it", ownKey);
    expect(result).toBe("sent to pi: sweep-2 (queued, not yet read)");
  });

  test("orch_send reports when the daemon is unreachable", async () => {
    const orchDir = tempOrchDir();
    const ownKey = "sender0001";
    const peerKey = "sweep20002";
    seedAgent(peerKey, { adapter: "pi", name: "sweep-2" }, orchDir);
    seedLiveProcess(orchDir, peerKey);
    seedStatus(orchDir, ownKey, { agent: "pi", label: "sweep-1", pid: process.pid, state: "working" });
    seedStatus(orchDir, peerKey, { agent: "pi", label: "sweep-2", pid: process.pid, state: "idle" });
    const { daemon } = recordingDaemon(orchDir, [ownKey, peerKey], undefined);

    const result = await sendPeerMessage(orchDir, daemon, "sweep-2", "found it", ownKey);
    expect(result).toBe("error: daemon unreachable; message not sent");
  });

  test("peer resolution errors list names and disambiguate duplicate names", async () => {
    const orchDir = tempOrchDir();
    const ownKey = "sender0001";
    const firstKey = "worker0001";
    const secondKey = "worker0002";
    const thirdKey = "worker0003";
    const seeds: readonly (readonly [string, string])[] = [[firstKey, "same-name"], [secondKey, "same-name"], [thirdKey, "other-name"]];
    for (const [key, name] of seeds) {
      seedAgent(key, { adapter: "pi", name }, orchDir);
      seedLiveProcess(orchDir, key);
    }
    const daemon = daemonClientForPeers(orchDir, [firstKey, secondKey, thirdKey]);

    const ambiguous = await resolvePeer(orchDir, daemon, "same-name", ownKey);
    expect(ambiguous).toEqual({
      error: `error: ambiguous target. Candidates: same-name (${firstKey}), same-name (${secondKey})`,
    });

    const missing = await resolvePeer(orchDir, daemon, "missing", ownKey);
    expect(missing).toEqual({
      error: `error: target not found. Candidates: same-name (${firstKey}), same-name (${secondKey}), other-name`,
    });
  });

  test("peers resolve by display name exactly like by key", async () => {
    const orchDir = tempOrchDir();
    const ownKey = "sender0001";
    const peerKey = "recon30003";
    seedAgent(peerKey, { adapter: "pi", name: "recon-3" }, orchDir);
    seedLiveProcess(orchDir, peerKey);
    seedStatus(orchDir, peerKey, { agent: "pi", label: "recon-3", pid: process.pid, state: "idle" });

    const resolved = await resolvePeer(orchDir, daemonClientForPeers(orchDir, [peerKey]), "recon-3", ownKey);
    expect("peer" in resolved && resolved.peer.key).toBe(peerKey);
  });

  test("\"spawner\" reaches the recorded spawner session across fleet scoping", async () => {
    const orchDir = tempOrchDir();
    const ownKey = "worker0004";
    seedAgent("session777", { adapter: "pi", name: "pi session" }, orchDir);
    seedLiveProcess(orchDir, "session777");
    seedStatus(orchDir, "session777", { agent: "pi", pid: process.pid, state: "idle" });
    const { daemon } = recordingDaemon(orchDir, ["session777"], { accepted: true, id: "mail-3", ack: "acknowledged" });
    daemon.ask = askFrom({
      "peer-view": (params) => peerView(orchDir, params.ownKey, params.keys?.length ? params.keys : ["session777"], params.allSpaces === true, params.projectRoot),
      self: () => ({
        id: ownKey, kind: "agent", space: null, depth: 1,
        view: {
          id: ownKey, name: "worker", label: null, harnessId: "pi", cwd: "/w", createdAt: 1,
          spawnedBy: "session777", spawnedByName: "pi session", rootAgentId: "session777", heldBy: null,
          environment: { plexer: null, handle: null, space: null, worktree: null, branch: null },
          tuning: { model: null, thinking: null }, endedAt: null,
        },
      }),
      message: () => ({ accepted: true, id: "mail-3", ack: "acknowledged" }),
    });
    const sent = await sendPeerMessage(orchDir, daemon, "spawner", "done with the sweep", ownKey);
    expect(sent).toStartWith("sent to ");

    const summaries = await peerSummaries(orchDir, daemon, ownKey);
    expect(summaries.find((peer) => peer.key === "session777")?.isSpawner).toBe(true);
  });

  test("the spawner resolves by its recorded name", async () => {
    const orchDir = tempOrchDir();
    seedAgent("operator01", { adapter: "pi", name: "claude session" }, orchDir);
    seedLiveProcess(orchDir, "operator01");
    seedStatus(orchDir, "operator01", { agent: "pi", pid: process.pid, state: "idle" });

    const resolved = await resolvePeer(orchDir, daemonWithSpawner(orchDir, "operator01", "claude session"), "claude session", "worker0005");
    expect("peer" in resolved && resolved.peer.key).toBe("operator01");
  });

  test("a spawner with no live status record is refused BY NAME, not with a bare key", async () => {
    const orchDir = tempOrchDir();
    seedAgent("operator01", { adapter: "pi", name: "claude session" }, orchDir);

    const resolved = await resolvePeer(orchDir, daemonWithSpawner(orchDir, "operator01", "claude session"), "spawner", "worker0005");
    expect(resolved).toEqual({
      error: "error: spawner claude session has no live status record to reply to. Write your result and end the turn; it is collected from your result file.",
    });
  });
});
