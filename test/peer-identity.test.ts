import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { agentIdentityEnv, spawnerIdentity, worktreeEnv } from "../src/policy/spawner.ts";
import { peerSummaries, resolvePeer, sendPeerMessage } from "../src/agent/peers.ts";
import { recordSpawned, spawnedRecords } from "../src/presence/store.ts";
import { presenceAgentDir } from "../src/presence/writer.ts";
import { INBOX_FILE } from "../src/presence/schema.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const IDENTITY_ENV = ["ORCH_DIR", "ORCH_AGENT_KEY", "ORCH_SESSION_KEY", "ORCH_SPAWNER", "ORCH_SPAWNER_LABEL", "ORCH_AGENT_NAME", "CLAUDECODE", "CLAUDE_CODE_SESSION_ID", "ORCH_AGENT_WORKTREE", "ORCH_AGENT_BRANCH"] as const;

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

  test("a Claude Code session names itself through its env marker", () => {
    tempOrchDir();
    process.env.CLAUDECODE = "1";
    expect(spawnerIdentity()).toEqual({ key: null, label: "claude session" });
  });

  test("a Claude Code session has NO reply address; its session id only names it apart", () => {
    tempOrchDir();
    process.env.CLAUDECODE = "1";
    process.env.CLAUDE_CODE_SESSION_ID = "e2277e83-74d9";
    // A harness session with no presence dir has no inbox to reply to, whether or
    // not it exports a session id. The id distinguishes two parallel sessions in
    // the LABEL; minting it as a key hands workers an address that cannot resolve.
    expect(spawnerIdentity()).toEqual({ key: null, label: "claude session e2277e83" });
  });

  test("a harness session with presence hands out its own reply address", () => {
    const orchDir = tempOrchDir();
    seedStatus(orchDir, "session-4242", { agent: "pi", pid: process.pid, state: "idle" });
    process.env.ORCH_SESSION_KEY = "session-4242";
    process.env.CLAUDECODE = "1"; // the presence key wins over the generic marker
    expect(spawnerIdentity()).toEqual({ key: "session-4242", label: "pi session" });
  });

  test("an orch-spawned orchestrator is named by its own agent name and harness", () => {
    const orchDir = tempOrchDir();
    const key = "headless~wF~lead0000ab";
    recordSpawned(key, { name: "lead-1", workspace: "wF", adapter: "pi" });
    seedStatus(orchDir, key, { agent: "pi", label: "lead-1", pid: process.pid, state: "working" });
    process.env.ORCH_AGENT_KEY = key;
    expect(spawnerIdentity()).toEqual({ key, label: "lead-1 (pi)" });
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

  test("the registry keeps the exact spawning session distinct from the workspace owner", () => {
    tempOrchDir();
    const key = "headless~wF~stamp0001a";
    recordSpawned(key, {
      name: "fix-1",
      workspace: "wF",
      owner: "herdr~wF~operator",
      spawnedBy: "claude-session-e2277e83-74d9",
      spawnedByLabel: "claude session",
    });
    const record = spawnedRecords().get(key);
    expect(record?.owner).toBe("herdr~wF~operator");
    expect(record?.spawnedBy).toBe("claude-session-e2277e83-74d9");
    expect(record?.spawnedByLabel).toBe("claude session");
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

  test("a Claude Code session stamps no address, so no worker is handed an unreachable one", () => {
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
    seedStatus(orchDir, "session-4242", { agent: "pi", pid: process.pid, state: "idle" });
    process.env.ORCH_SESSION_KEY = "session-4242";

    const address = stampedSpawnerAddress();
    expect(address).toBe("session-4242");
    process.env.ORCH_SPAWNER = address;
    process.env.ORCH_SPAWNER_LABEL = "pi session";

    const resolved = resolvePeer("spawner", "headless~wF~worker0006");
    expect("error" in resolved ? resolved.error : null).toBeNull();
  });
});

describe("peer identity in messaging", () => {
  test("orch_send reports the peer's NAME, and stamps the sender's name on the message", () => {
    const orchDir = tempOrchDir();
    const ownKey = "headless~wF~sender0001";
    const peerKey = "headless~wF~sweep20002";
    seedStatus(orchDir, ownKey, { agent: "pi", label: "sweep-1", pid: process.pid, state: "working" });
    seedStatus(orchDir, peerKey, { agent: "pi", label: "sweep-2", pid: process.pid, state: "idle" });

    const result = sendPeerMessage("sweep-2", "found it", ownKey);
    expect(result).toBe("sent to pi: sweep-2");
    const inbox = readFileSync(join(presenceAgentDir(peerKey), INBOX_FILE), "utf8");
    expect(inbox).toContain(`[from sweep-1 (${ownKey})] found it`);
  });

  test("peers resolve by display name exactly like by key", () => {
    const orchDir = tempOrchDir();
    const ownKey = "headless~wF~sender0001";
    const peerKey = "headless~wF~recon30003";
    seedStatus(orchDir, peerKey, { agent: "pi", label: "recon-3", pid: process.pid, state: "idle" });

    const resolved = resolvePeer("recon-3", ownKey);
    expect("peer" in resolved && resolved.peer.key).toBe(peerKey);
  });

  test("\"spawner\" reaches the stamped spawner session across fleet scoping", () => {
    const orchDir = tempOrchDir();
    const ownKey = "headless~wF~worker0004";
    seedStatus(orchDir, "session-777", { agent: "pi", pid: process.pid, state: "idle" });
    process.env.ORCH_SPAWNER = "session-777";
    process.env.ORCH_SPAWNER_LABEL = "pi session";

    const sent = sendPeerMessage("spawner", "done with the sweep", ownKey);
    expect(sent).toStartWith("sent to ");
    const inbox = readFileSync(join(presenceAgentDir("session-777"), INBOX_FILE), "utf8");
    expect(inbox).toContain("done with the sweep");

    const summaries = peerSummaries(ownKey);
    expect(summaries.find((peer) => peer.key === "session-777")?.isSpawner).toBe(true);
  });

  test("a spawner with no inbox is refused BY NAME, not with a bare key", () => {
    tempOrchDir();
    process.env.ORCH_SPAWNER = "herdr~wF~operator";
    process.env.ORCH_SPAWNER_LABEL = "claude session";

    const resolved = resolvePeer("spawner", "headless~wF~worker0005");
    expect("error" in resolved && resolved.error).toContain("claude session");
  });
});
