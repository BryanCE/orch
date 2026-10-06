import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { endpointPaths } from "../src/daemon/client/wire.ts";
import { sessionClaim } from "../src/daemon/client/registration.ts";
import { registerSession } from "../src/daemon/server/session-registry.ts";
import { agentById } from "../src/store/agent-rows.ts";
import { currentLease } from "../src/store/lease-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { seedOperator } from "./helpers/agent.ts";
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
function registerPiSession(directory: OrchDir): string {
  const claim = sessionClaim(directory, undefined, { harness: "pi", sessionToken: "pi-session", pid: process.pid });
  return registerSession(directory, claim, DAEMON_TOKEN).id;
}

describe("a harness session records the terminal it started in", () => {
  test("a pi typed into a registered terminal is that terminal's, and the terminal holds it", () => {
    const directory = claimDir();
    const terminal = seedOperator(directory);
    const session = registerPiSession(directory);
    expect(agentById(directory, session)?.spawnedBy).toBe(terminal);
    expect(agentById(directory, session)?.rootAgentId).toBe(terminal);
    expect(currentLease(directory, session)?.orchId).toBe(terminal);
  }, 30_000);

  test("a harness started outside any registered terminal is a root", () => {
    const directory = claimDir();
    const session = registerPiSession(directory);
    expect(agentById(directory, session)?.spawnedBy).toBeNull();
    expect(currentLease(directory, session)).toBeNull();
  }, 30_000);
});
