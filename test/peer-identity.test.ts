import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { allAdapters } from "../src/adapters/registry.ts";
import { agentIdentityEnv, spawnerIdentity, worktreeEnv } from "../src/policy/spawner.ts";
import { getOrCreateSessionAgent } from "../src/store/agent-rows.ts";
import { peerSummaries, resolvePeer, sendPeerMessage } from "../src/agent/peers.ts";
import { spawnedRecords } from "../src/presence/store.ts";
import { presenceAgentDir } from "../src/presence/writer.ts";
import { INBOX_FILE } from "../src/presence/schema.ts";
import { seedStatus } from "./helpers/presence.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedAgent } from "./helpers/agent.ts";

const IDENTITY_ENV = [
  "ORCH_DIR", LAUNCH_ENV, "ORCH_SESSION_KEY", "ORCH_SPAWNER", "ORCH_SPAWNER_LABEL",
  "ORCH_AGENT_NAME", "ORCH_AGENT_WORKTREE", "ORCH_AGENT_BRANCH",
  ...allAdapters().flatMap((adapter) => [adapter.sessionEnvMarker, adapter.sessionIdEnv, adapter.sessionPidEnv])
    .filter((name): name is string => name !== undefined),
];

const directories: string[] = [];
let savedEnv: Record<string, string | undefined> = {};

function tempOrchDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-peer-identity-"));
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
  while (directories.length > 0) removeTempDir(directories.pop()!);
});

describe("spawner identity", () => {
  test("a bare operator with no session markers is just the operator", () => {
    tempOrchDir();
    expect(spawnerIdentity()).toEqual({ key: null, label: "operator" });
  });

  test("an unregistered Claude Code session is labelled by its harness, with no id", () => {
    tempOrchDir();
    process.env.CLAUDECODE = "1";
    expect(spawnerIdentity()).toEqual({ key: null, label: "claude session" });
  });

  test("a session orch has registered IS addressable, by the id orch minted", () => {
    const orchDir = tempOrchDir();
    process.env.CLAUDECODE = "1";
    process.env.CLAUDE_CODE_SESSION_ID = "e2277e83-74d9";
    // TASKS/08: a participant outside a plexer must be nameable. The id comes from
    // orch's own record for this session token - never from a plexer coordinate,
    // and never the literal string "operator".
    const registered = getOrCreateSessionAgent(orchDir, {
      pid: 4242, startToken: "tok", sessionToken: "e2277e83-74d9", harnessId: "claude",
      cwd: "/w", label: "claude session", hostId: "h", hostName: "h", hostOs: "linux", now: 1,
    });
    expect(spawnerIdentity().key).toBe(registered.id);
  });

  test("an unregistered session has no id to hand out, and does not invent one", () => {
    tempOrchDir();
    process.env.CLAUDECODE = "1";
    process.env.CLAUDE_CODE_SESSION_ID = "never-registered";
    expect(spawnerIdentity().key).toBeNull();
  });

  test("an orch-spawned orchestrator acts as the id orch minted for it", () => {
    const orchDir = tempOrchDir();
    const key = "lead0000ab";
    seedSpace(orchDir, "wF");
    seedAgent(key, { space: "wF", adapter: "pi" });
    seedStatus(orchDir, key, { agent: "pi", label: "lead-1", pid: process.pid, state: "working" });
    process.env[LAUNCH_ENV] = key;
    // Identity is the minted id and nothing else: the launch key IS that id, so
    // there is no plexer and no grouping riding inside it to travel as identity.
    expect(spawnerIdentity().key).toBe("lead0000ab");
  });

  test("agentIdentityEnv stamps a reply address only when the spawner has one", () => {
    expect(agentIdentityEnv("sweep-2", { key: "session-1", label: "pi session" })).toEqual({
      ORCH_AGENT_NAME: "sweep-2",
      ORCH_SPAWNER: "session-1",
      ORCH_SPAWNER_LABEL: "pi session",
    });
    // An owner token proves who may STEER an agent; it is not a presence dir.
    // Stamping it as ORCH_SPAWNER hands the worker an unreachable reply address.
    expect(agentIdentityEnv("sweep-2", { key: null, label: "claude session" })).toEqual({
      ORCH_AGENT_NAME: "sweep-2",
      ORCH_SPAWNER_LABEL: "claude session",
    });
  });

  test("worktreeEnv stamps worktree identity only for isolated agents", () => {
    expect(worktreeEnv("/repo/.orch-worktrees/fix-1", "orch/fix-1")).toEqual({
      ORCH_AGENT_WORKTREE: "/repo/.orch-worktrees/fix-1",
      ORCH_AGENT_BRANCH: "orch/fix-1",
    });
    expect(worktreeEnv("/repo/.orch-worktrees/fix-1", undefined)).toEqual({
      ORCH_AGENT_WORKTREE: "/repo/.orch-worktrees/fix-1",
    });
    expect(worktreeEnv(undefined, "orch/fix-1")).toEqual({});
  });

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
    });
    const record = spawnedRecords().get(key);
    expect(record?.spawnedBy).toBe(session.id);
    expect(record?.heldBy?.orchId).toBe("operator01");
  });
});

/**
 * The seam no unit test owned. `spawnerIdentity` MINTS the address, `agentIdentityEnv`
 * STAMPS it into ORCH_SPAWNER, and `resolvePeer` RESOLVES it. Each was verified against
 * its own local contract while the invariant spanning all three — an address orch hands
 * out is an address orch can reach — had no owner and no test. That is how every pi
 * worker spawned from a Claude Code session came to be told to reply to a mailbox that
 * never existed.
 */
describe("the spawner address invariant", () => {
  function stampedSpawnerAddress(): string | undefined {
    return agentIdentityEnv("worker-1", spawnerIdentity()).ORCH_SPAWNER;
  }

  test("an UNREGISTERED session stamps no address, so no worker is handed an unreachable one", () => {
    tempOrchDir();
    process.env.CLAUDECODE = "1";
    process.env.CLAUDE_CODE_SESSION_ID = "c0f80035-1859-4757-8c32-15bcaa9c761a";
    expect(stampedSpawnerAddress()).toBeUndefined();
  });

  test("a bare operator stamps no address", () => {
    tempOrchDir();
    expect(stampedSpawnerAddress()).toBeUndefined();
  });

  test("an address that IS stamped resolves to a live inbox", () => {
    const orchDir = tempOrchDir();
    process.env.CLAUDECODE = "1";
    process.env.CLAUDE_CODE_SESSION_ID = "c0f80035-1859";
    // TASKS/08: a session is an agent with the same addressability. Its address is
    // the id orch minted for it, not a plexer coordinate and not ORCH_SESSION_KEY.
    const registered = getOrCreateSessionAgent(orchDir, {
      pid: 4242, startToken: "tok", sessionToken: "c0f80035-1859", harnessId: "claude",
      cwd: "/w", label: "claude session", hostId: "h", hostName: "h", hostOs: "linux", now: 1,
    });
    seedStatus(orchDir, registered.id, { agent: "pi", pid: process.pid, state: "idle" });

    const address = stampedSpawnerAddress();
    expect(address).toBe(registered.id);
    process.env.ORCH_SPAWNER = address;
    process.env.ORCH_SPAWNER_LABEL = "claude session";

    const resolved = resolvePeer("spawner", "worker0006");
    expect("error" in resolved ? resolved.error : null).toBeNull();
  });
});

describe("peer identity in messaging", () => {
  test("peer summaries render an unplaced agent without a local place name", () => {
    const directory = tempOrchDir();
    const ownKey = "sender0001";
    const peerKey = "unplaced02";
    seedStatus(directory, peerKey, { agent: "pi", pid: process.pid, state: "idle", label: "unplaced" });

    const summary = peerSummaries(ownKey)[0];
    expect(summary?.space).toBeNull();
    const output = JSON.stringify(summary);
    expect(output).not.toContain("local");
    expect(output).not.toContain("workspace");
  });

  test("orch_send reports the peer's NAME, and stamps the sender's name on the message", () => {
    const orchDir = tempOrchDir();
    const ownKey = "sender0001";
    const peerKey = "sweep20002";
    seedStatus(orchDir, ownKey, { agent: "pi", label: "sweep-1", pid: process.pid, state: "working" });
    seedStatus(orchDir, peerKey, { agent: "pi", label: "sweep-2", pid: process.pid, state: "idle" });

    const result = sendPeerMessage("sweep-2", "found it", ownKey);
    expect(result).toBe("sent to pi: sweep-2");
    const inbox = readFileSync(join(presenceAgentDir(peerKey), INBOX_FILE), "utf8");
    expect(inbox).toContain(`[from sweep-1 (${ownKey})] found it`);
  });

  test("peers resolve by display name exactly like by key", () => {
    const orchDir = tempOrchDir();
    const ownKey = "sender0001";
    const peerKey = "recon30003";
    seedStatus(orchDir, peerKey, { agent: "pi", label: "recon-3", pid: process.pid, state: "idle" });

    const resolved = resolvePeer("recon-3", ownKey);
    expect("peer" in resolved && resolved.peer.key).toBe(peerKey);
  });

  test("\"spawner\" reaches the stamped spawner session across fleet scoping", () => {
    const orchDir = tempOrchDir();
    const ownKey = "worker0004";
    seedStatus(orchDir, "session777", { agent: "pi", pid: process.pid, state: "idle" });
    process.env.ORCH_SPAWNER = "session777";
    process.env.ORCH_SPAWNER_LABEL = "pi session";

    const sent = sendPeerMessage("spawner", "done with the sweep", ownKey);
    expect(sent).toStartWith("sent to ");
    const inbox = readFileSync(join(presenceAgentDir("session777"), INBOX_FILE), "utf8");
    expect(inbox).toContain("done with the sweep");

    const summaries = peerSummaries(ownKey);
    expect(summaries.find((peer) => peer.key === "session777")?.isSpawner).toBe(true);
  });

  test("a spawner with no inbox is refused BY NAME, not with a bare key", () => {
    tempOrchDir();
    process.env.ORCH_SPAWNER = "operator01";
    process.env.ORCH_SPAWNER_LABEL = "claude session";

    const resolved = resolvePeer("spawner", "worker0005");
    expect("error" in resolved && resolved.error).toContain("claude session");
  });
});
