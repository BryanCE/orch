import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { endpointPaths } from "../src/daemon/client/wire.ts";
import { sessionClaim } from "../src/daemon/client/registration.ts";
import { registerSession } from "../src/daemon/server/session-registry.ts";
import { agentById, ensureHost, getOrCreateSessionAgent, liveAgents } from "../src/store/agent-rows.ts";
import { recordProcess } from "../src/store/interval-rows.ts";
import { callerKindOf } from "../src/policy/caller.ts";
import { selfIdentityOf } from "../src/identity/self.ts";
import { OPERATOR_HARNESS_ID } from "../src/identity/operator.ts";
import { hostIdentity } from "../src/host.ts";
import { hostedHere } from "../src/local-process.ts";
import { processStartToken } from "../src/process-identity.ts";
import type { CallerCredential } from "../src/types/core.ts";
import { currentLease } from "../src/store/lease-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { seedAgent, seedOperator } from "./helpers/agent.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";

const DAEMON_TOKEN = "test-token";
const dirs: OrchDir[] = [];

beforeEach(() => { isolateOrchEnv(); });
afterEach(() => {
  closeAllStores();
  restoreOrchEnv();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function claimDir(): OrchDir {
  const directory = tempOrchDir("orch-session-provenance-");
  dirs.push(directory);
  const token = endpointPaths(directory).token;
  mkdirSync(dirname(token), { recursive: true });
  writeFileSync(token, DAEMON_TOKEN, { mode: 0o600 });
  return directory;
}

/** Register this test process as a pi session, the way the pi bridge registers pi. */
async function registerPiSession(directory: OrchDir): Promise<string> {
  const claim = sessionClaim(directory, undefined, { harness: "pi", sessionToken: "pi-session", pid: process.pid });
  return (await registerSession(directory, claim, DAEMON_TOKEN)).id;
}

describe("a harness session records the terminal it started in", () => {
  test("a pi typed into a registered terminal is that terminal's, and the terminal holds it", async () => {
    const directory = claimDir();
    const terminal = seedOperator(directory);
    const session = await registerPiSession(directory);
    expect(agentById(directory, session)?.spawnedBy).toBe(terminal);
    expect(agentById(directory, session)?.rootAgentId).toBe(terminal);
    expect(currentLease(directory, session)?.orchId).toBe(terminal);
  }, 30_000);

  test("a harness started outside any registered terminal is a root", async () => {
    const directory = claimDir();
    const session = await registerPiSession(directory);
    expect(agentById(directory, session)?.spawnedBy).toBeNull();
    expect(currentLease(directory, session)).toBeNull();
  }, 30_000);
});

/** The runner's parent process, with its real start token: the process the runner was started inside. */
function runnerParent(): { pid: number; startToken: string } {
  const startToken = processStartToken(process.ppid);
  if (startToken === undefined) throw new Error(`no start token for the runner's parent pid ${process.ppid}`);
  return { pid: process.ppid, startToken };
}

/** A spawned worker whose live process is the runner's parent, so the runner descends from it. */
function seedEnclosingWorker(directory: OrchDir): string {
  const host = hostIdentity();
  seedAgent("worker01", {}, directory);
  ensureHost(directory, host, Date.now());
  recordProcess(directory, "worker01", Date.now(), { host: host.id, ...runnerParent() });
  return "worker01";
}

/** The runner as a raw process: no harness marker, no launch credential. */
function runnerCredential(): CallerCredential {
  return { launch: null, session: null, process: hostedHere(process.pid, processStartToken(process.pid) ?? null) };
}

describe("a process with no harness marker inside a live agent's tree is that agent", () => {
  test("registering it mints no row and answers with the enclosing agent", async () => {
    const directory = claimDir();
    const worker = seedEnclosingWorker(directory);
    const before = liveAgents(directory).length;
    const claim = sessionClaim(directory, undefined, { harness: OPERATOR_HARNESS_ID, sessionToken: undefined, pid: process.pid });
    expect((await registerSession(directory, claim, DAEMON_TOKEN)).id).toBe(worker);
    expect(liveAgents(directory)).toHaveLength(before);
    expect(liveAgents(directory).some((row) => row.kind === "operator")).toBe(false);
  }, 30_000);

  test("its identity and kind are the enclosing agent's, never the operator's", () => {
    const directory = claimDir();
    const worker = seedEnclosingWorker(directory);
    expect(selfIdentityOf(directory, runnerCredential())?.id).toBe(worker);
    expect(callerKindOf(directory, runnerCredential())).toBe("agent");
  });

  test("a plain terminal with no agent above it is still the operator", () => {
    const directory = claimDir();
    expect(selfIdentityOf(directory, runnerCredential())).toBeNull();
    expect(callerKindOf(directory, runnerCredential())).toBe("operator");
  });

  test("the store refuses an operator row with a spawner", () => {
    const directory = claimDir();
    const worker = seedEnclosingWorker(directory);
    expect(() => getOrCreateSessionAgent(directory, {
      pid: process.pid, startToken: "start-x", harnessId: OPERATOR_HARNESS_ID, cwd: "/repo", label: "shell",
      host: hostIdentity(), spawnedBy: worker, now: Date.now(),
    })).toThrow(/never filed as the operator/);
  });
});
