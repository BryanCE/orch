import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { mintAgentId } from "../src/backends/identity.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { HARNESS_SESSION_ENV } from "../src/adapters/session-env.ts";
import { claimAgent } from "../src/store/agent-rows.ts";
import { callerKind } from "../src/policy/caller.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { seedAgent } from "./helpers/agent.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const directories: string[] = [];
const sessionEnv = HARNESS_SESSION_ENV.pi;
const savedSessionEnv = {
  marker: process.env[sessionEnv.marker],
  sessionId: process.env[sessionEnv.sessionId],
};

afterEach(() => {
  restoreOrchEnv();
  if (savedSessionEnv.marker === undefined) delete process.env[sessionEnv.marker];
  else process.env[sessionEnv.marker] = savedSessionEnv.marker;
  if (savedSessionEnv.sessionId === undefined) delete process.env[sessionEnv.sessionId];
  else process.env[sessionEnv.sessionId] = savedSessionEnv.sessionId;
  while (directories.length > 0) removeTempDir(directories.pop() ?? "");
});

function setupClaimedAgent(token: string): string {
  isolateOrchEnv();
  const directory = mkdtempSync(join(tmpdir(), "orch-caller-kind-"));
  directories.push(directory);
  process.env.ORCH_DIR = directory;
  const id = mintAgentId();
  seedAgent(id, {}, directory);
  expect(claimAgent(directory, id, token, 1_000)).toEqual({ kind: "stamped" });
  process.env[sessionEnv.marker] = "1";
  return id;
}

describe("caller kind", () => {
  test("id + recorded token is agent", () => {
    const id = setupClaimedAgent("session-a");
    process.env[LAUNCH_ENV] = id;
    process.env[sessionEnv.sessionId] = "session-a";
    expect(callerKind()).toBe("agent");
  });

  test("id + other token is human", () => {
    const id = setupClaimedAgent("session-a");
    process.env[LAUNCH_ENV] = id;
    process.env[sessionEnv.sessionId] = "session-b";
    expect(callerKind()).toBe("human");
  });

  test("id + no token is human", () => {
    const id = setupClaimedAgent("session-a");
    process.env[LAUNCH_ENV] = id;
    delete process.env[sessionEnv.sessionId];
    expect(callerKind()).toBe("human");
  });

  test("no id is human", () => {
    isolateOrchEnv();
    expect(callerKind()).toBe("human");
  });
});
