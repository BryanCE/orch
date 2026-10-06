import { tempOrchDir as makeTempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { LAUNCH_ENV } from "../src/identity/launch.ts";



import { createAgentPresence } from "../src/agent/presence.ts";
import { registerPeerTools } from "../src/agent/peers.ts";
import type { HarnessApi, HarnessEventHandler } from "../src/types/agent.ts";
import { stubDaemonLink } from "./helpers/daemon-client.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
const originalOrchDir = process.env.ORCH_DIR;
const originalAgentKey = process.env[LAUNCH_ENV];
const directories: OrchDir[] = [];

function fakeHarness(): { harness: HarnessApi; toolNames: string[] } {
  const toolNames: string[] = [];
  const handlers = new Map<string, HarnessEventHandler[]>();
  const harness: HarnessApi = {
    on(name: string, handler: HarnessEventHandler): void {
      handlers.set(name, [...(handlers.get(name) ?? []), handler]);
    },
    registerTool: (tool) => {
      toolNames.push(tool.name);
    },
    registerCommand: () => undefined,
    sendUserMessage: () => undefined,
    setModel: () => Promise.resolve(true),
    getThinkingLevel: () => undefined,
    setThinkingLevel: () => undefined,
    events: { on: () => undefined },
  };
  return { harness, toolNames };
}

function fakePresence(harness: HarnessApi) {
  return createAgentPresence({
    harness,
    identity: { agentId: "pi", settleEvent: "agent_settled" },
    extensionHash: "test",
    daemon: stubDaemonLink(),
  });
}

function tempOrchDir(): OrchDir {
  const directory = makeTempOrchDir("orch-peer-tools-");
  directories.push(directory);
  process.env.ORCH_DIR = directory;
  return directory;
}

afterEach(() => {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  if (originalAgentKey === undefined) delete process.env[LAUNCH_ENV];
  else process.env[LAUNCH_ENV] = originalAgentKey;
  while (directories.length > 0) removeTempDir(directories.pop()!);
});

describe("peer tool registration", () => {
  test("does not register orch_send without a launch credential", () => {
    const directory = tempOrchDir();
    delete process.env[LAUNCH_ENV];
    const { harness, toolNames } = fakeHarness();

    registerPeerTools(directory, harness, fakePresence(harness), stubDaemonLink());

    expect(toolNames).not.toContain("orch_send");
    expect(toolNames).toContain("orch_agents");
    expect(toolNames).toContain("orch_read");
  });

  test("registers orch_send when a launch credential exists", () => {
    const directory = tempOrchDir();
    process.env[LAUNCH_ENV] = "worker0001";
    const { harness, toolNames } = fakeHarness();

    registerPeerTools(directory, harness, fakePresence(harness), stubDaemonLink());

    expect(toolNames).toContain("orch_send");
  });
});
