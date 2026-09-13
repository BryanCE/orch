import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { mintAgentId } from "../src/backends/identity.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { HARNESS_SESSION_ENV } from "../src/adapters/session-env.ts";
import { claimAgent } from "../src/store/agent-rows.ts";
import { callerKind as daemonCallerKind } from "../src/policy/caller.ts";
import { forbidNonOperatorOverride } from "../src/commands/target.ts";
import { ensureCallerRegistered } from "../src/identity/self.ts";
import { isolateHarnessSession, isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { seedAgent } from "./helpers/agent.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const directories: string[] = [];

function currentOrchDir(): string {
  const directory = process.env.ORCH_DIR;
  if (!directory) throw new Error("ORCH_DIR is required");
  return directory;
}

function callerKind(): ReturnType<typeof daemonCallerKind> {
  return daemonCallerKind(currentOrchDir());
}
const sessionEnv = HARNESS_SESSION_ENV.pi;
const savedSessionEnv = {
  marker: process.env[sessionEnv.marker],
  sessionId: process.env[sessionEnv.sessionId],
};
let restoreHarnessSession: (() => void) | undefined;

afterEach(() => {
  restoreOrchEnv();
  if (savedSessionEnv.marker === undefined) delete process.env[sessionEnv.marker];
  else process.env[sessionEnv.marker] = savedSessionEnv.marker;
  if (savedSessionEnv.sessionId === undefined) delete process.env[sessionEnv.sessionId];
  else process.env[sessionEnv.sessionId] = savedSessionEnv.sessionId;
  restoreHarnessSession?.();
  restoreHarnessSession = undefined;
  while (directories.length > 0) removeTempDir(directories.pop() ?? "");
});

function setupClaimedAgent(token: string): string {
  isolateOrchEnv();
  restoreHarnessSession = isolateHarnessSession("pi");
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

  test("a harness marker is a session even when its token differs", () => {
    const id = setupClaimedAgent("session-a");
    process.env[LAUNCH_ENV] = id;
    process.env[sessionEnv.sessionId] = "session-b";
    expect(callerKind()).toBe("session");
  });

  test("a harness marker is a session without a launch credential", () => {
    setupClaimedAgent("session-a");
    delete process.env[LAUNCH_ENV];
    expect(callerKind()).toBe("session");
  });

  test("no harness marker is the operator", () => {
    isolateOrchEnv();
    expect(callerKind()).toBe("operator");
  });

  test("an unregistered session asks the daemon registration seam", async () => {
    isolateOrchEnv();
    restoreHarnessSession = isolateHarnessSession("pi");
    const directory = mkdtempSync(join(tmpdir(), "orch-caller-register-"));
    directories.push(directory);
    process.env.ORCH_DIR = directory;
    process.env[sessionEnv.marker] = "1";
    process.env[sessionEnv.sessionId] = "fresh-session";
    let registeredDirectory: string | undefined;
    await ensureCallerRegistered(directory, (registered) => {
      registeredDirectory = registered;
      return Promise.resolve({ id: "registered-agent" });
    });
    expect(registeredDirectory).toBe(directory);
  });

  test("override flags are allowed only for the operator", () => {
    isolateOrchEnv();
    expect(() => forbidNonOperatorOverride(currentOrchDir(), "--force")).not.toThrow();
  });

  test("override flags refuse a driving session", () => {
    setupClaimedAgent("session-a");
    delete process.env[LAUNCH_ENV];
    expect(() => forbidNonOperatorOverride(currentOrchDir(), "--force")).toThrow(
      "--force is operator-only: a driving session may only touch agents it holds.",
    );
  });

  test("override flags refuse a spawned agent", () => {
    const id = setupClaimedAgent("session-a");
    process.env[LAUNCH_ENV] = id;
    process.env[sessionEnv.sessionId] = "session-a";
    expect(() => forbidNonOperatorOverride(currentOrchDir(), "--steal")).toThrow(
      "--steal is operator-only: a driving session may only touch agents it holds.",
    );
  });
});
