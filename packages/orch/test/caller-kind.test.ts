import type { OrchDir } from "../src/types/core.ts";
import { orchDirAt } from "../src/services.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { mintAgentId } from "../src/backends/identity.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { HARNESS_SESSION_ENV } from "../src/adapters/session-env.ts";
import { agentIdBySessionToken, claimAgent } from "../src/store/agent-rows.ts";
import { callerKind as daemonCallerKind } from "../src/policy/caller.ts";
import { registerCallerSession, refuseNonOperatorOverride, whoAmI } from "../src/commands/self.ts";
import { isolateHarnessSession, isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { seedAgent } from "./helpers/agent.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { servedServices } from "./helpers/daemon-state.ts";
import type { RpcServer } from "../src/types/daemon.ts";

const directories: OrchDir[] = [];
const servers: RpcServer[] = [];

function currentOrchDir(): OrchDir {
  const directory = process.env.ORCH_DIR;
  if (!directory) throw new Error("ORCH_DIR is required");
  return orchDirAt(directory);
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

afterEach(async () => {
  while (servers.length > 0) await servers.pop()!.close();
  restoreOrchEnv();
  if (savedSessionEnv.marker === undefined) delete process.env[sessionEnv.marker];
  else process.env[sessionEnv.marker] = savedSessionEnv.marker;
  if (savedSessionEnv.sessionId === undefined) delete process.env[sessionEnv.sessionId];
  else process.env[sessionEnv.sessionId] = savedSessionEnv.sessionId;
  restoreHarnessSession?.();
  restoreHarnessSession = undefined;
  while (directories.length > 0) removeTempDir(directories.pop() ?? "");
});

function setupOperator(): void {
  isolateOrchEnv();
  restoreHarnessSession = isolateHarnessSession("pi");
  delete process.env[sessionEnv.marker];
  delete process.env[sessionEnv.sessionId];
}

function setupClaimedAgent(token: string): string {
  isolateOrchEnv();
  restoreHarnessSession = isolateHarnessSession("pi");
  const directory = tempOrchDir("orch-caller-kind-");
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
    setupOperator();
    expect(callerKind()).toBe("operator");
  });

  test("an unregistered session asks the daemon registration seam", async () => {
    isolateOrchEnv();
    restoreHarnessSession = isolateHarnessSession("pi");
    const directory = tempOrchDir("orch-caller-register-");
    directories.push(directory);
    process.env.ORCH_DIR = directory;
    process.env[sessionEnv.marker] = "1";
    process.env[sessionEnv.sessionId] = "fresh-session";
    const services = await servedServices({ orchDir: directory, settings: { defaults: { adapter: "pi", backend: "headless" } } }, servers);
    await registerCallerSession(services);
    const self = await whoAmI(services);
    expect(self.kind).toBe("session");
    expect(self.id).toBe(agentIdBySessionToken(directory, "fresh-session"));
  });

  test("override flags are allowed only for the operator", () => {
    setupOperator();
    expect(() => refuseNonOperatorOverride({ kind: "operator" }, "--force")).not.toThrow();
  });

  test("override flags refuse a driving session", () => {
    setupClaimedAgent("session-a");
    delete process.env[LAUNCH_ENV];
    expect(() => refuseNonOperatorOverride({ kind: "session" }, "--force")).toThrow(
      "--force is operator-only: a driving session may only touch agents it holds.",
    );
  });

  test("override flags refuse a spawned agent", () => {
    const id = setupClaimedAgent("session-a");
    process.env[LAUNCH_ENV] = id;
    process.env[sessionEnv.sessionId] = "session-a";
    expect(() => refuseNonOperatorOverride({ kind: "agent" }, "--steal")).toThrow(
      "--steal is operator-only: a driving session may only touch agents it holds.",
    );
  });
});
