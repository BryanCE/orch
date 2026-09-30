import { afterEach, describe, expect, test } from "bun:test";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { createDaemonLink } from "../src/agent/daemon-client.ts";
import { startRpcServer } from "../src/daemon/server/rpc.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import type { DaemonLink } from "../src/types/agent.ts";
import type { OrchDir } from "../src/types/core.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { seedAgent } from "./helpers/agent.ts";
import { recordingLogger } from "./helpers/logger.ts";
import { stubRpcHandlers } from "./helpers/rpc-handlers.ts";
import { testServices } from "./helpers/services.ts";

const envNames = [
  LAUNCH_ENV,
  "ORCH_DIR",
  "ORCH_HARNESS",
  "PI_CODING_AGENT",
  "PI_SESSION_ID",
  "OMP_SESSION_ID",
  "CODEX_PID",
  "CLAUDECODE",
  "CLAUDE_CODE_SESSION_ID",
  "CLAUDE_PID",
] as const;
const originalEnv = new Map(envNames.map((name) => [name, process.env[name]]));
const servers: RpcServer[] = [];
const directories: OrchDir[] = [];

function tempDir(): OrchDir {
  const directory = tempOrchDir("orch-daemon-link-identify-");
  directories.push(directory);
  process.env.ORCH_DIR = directory;
  return directory;
}

function linkFor(directory: OrchDir): DaemonLink {
  return createDaemonLink(directory, testServices({ orchDir: directory, settings: { daemon: { report_timeout_ms: 5000 } } }).settings);
}

function observedMethods(records: ReturnType<typeof recordingLogger>["records"]): string[] {
  return records.flatMap((record) => record.event === "rpc" && typeof record.fields?.method === "string"
    ? [record.fields.method]
    : []);
}

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  while (directories.length) removeTempDir(directories.pop()!);
  for (const name of envNames) {
    const value = originalEnv.get(name);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("daemon link identity", () => {
  test("uses the launch credential without an RPC when there is no session token", async () => {
    const directory = tempDir();
    const credential = mintAgentId();
    process.env[LAUNCH_ENV] = credential;
    delete process.env.PI_SESSION_ID;
    const capture = recordingLogger();
    servers.push(await startRpcServer(directory, stubRpcHandlers(), { logger: capture.logger }));

    const identity = await linkFor(directory).identify("pi");

    expect(identity).toBe(credential);
    expect(observedMethods(capture.records)).toEqual([]);
  });

  test("registers a session and returns the id from the RPC", async () => {
    const directory = tempDir();
    delete process.env[LAUNCH_ENV];
    const capture = recordingLogger();
    servers.push(await startRpcServer(directory, stubRpcHandlers(), { logger: capture.logger }));

    const identity = await linkFor(directory).identify("pi", "session-register");

    expect(identity).toMatch(/^[a-z0-9]{10}$/);
    expect(observedMethods(capture.records)).toEqual(["register-session"]);
  });

  test("claims the launch credential through RPC when a session token exists", async () => {
    const directory = tempDir();
    const credential = mintAgentId();
    seedAgent(credential, {}, directory);
    process.env[LAUNCH_ENV] = credential;
    const capture = recordingLogger();
    servers.push(await startRpcServer(directory, stubRpcHandlers(), { logger: capture.logger }));

    const identity = await linkFor(directory).identify("pi", "session-claim");

    expect(identity).toBe(credential);
    expect(observedMethods(capture.records)).toEqual(["claim-identity"]);
  });
});
