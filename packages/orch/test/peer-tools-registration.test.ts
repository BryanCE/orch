import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createAgentPresence } from "../src/agent/presence.ts";
import { registerPeerTools } from "../src/agent/peers.ts";
import { INBOX_FILE } from "../src/presence/schema.ts";
import type { HarnessApi, HarnessEventHandler } from "../src/types/agent.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const originalOrchDir = process.env.ORCH_DIR;
const originalSpawner = process.env.ORCH_SPAWNER;
const originalSpawnerLabel = process.env.ORCH_SPAWNER_LABEL;
const directories: string[] = [];

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
    paneId: null,
    extensionHash: "test",
    ack: {
      messageIdOf: () => undefined,
      isAcked: () => false,
      markAcked: () => undefined,
      post: () => Promise.resolve(true),
    },
    reportStatus: () => undefined,
  });
}

function tempOrchDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-peer-tools-"));
  directories.push(directory);
  process.env.ORCH_DIR = directory;
  return directory;
}

afterEach(() => {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  if (originalSpawner === undefined) delete process.env.ORCH_SPAWNER;
  else process.env.ORCH_SPAWNER = originalSpawner;
  if (originalSpawnerLabel === undefined) delete process.env.ORCH_SPAWNER_LABEL;
  else process.env.ORCH_SPAWNER_LABEL = originalSpawnerLabel;
  while (directories.length > 0) removeTempDir(directories.pop()!);
});

describe("peer tool registration", () => {
  test("does not register orch_send when no spawner address exists", () => {
    tempOrchDir();
    delete process.env.ORCH_SPAWNER;
    const { harness, toolNames } = fakeHarness();

    registerPeerTools(harness, fakePresence(harness));

    expect(toolNames).not.toContain("orch_send");
    expect(toolNames).toContain("orch_agents");
    expect(toolNames).toContain("orch_read");
  });

  test("does not register orch_send when the spawner pid is dead", () => {
    const directory = tempOrchDir();
    process.env.ORCH_SPAWNER = "dead-spawner";
    seedStatus(directory, "dead-spawner", { pid: 2147483646 });
    const { harness, toolNames } = fakeHarness();

    registerPeerTools(harness, fakePresence(harness));

    expect(toolNames).not.toContain("orch_send");
  });

  test("registers orch_send when the spawner has live presence and an inbox", () => {
    const directory = tempOrchDir();
    process.env.ORCH_SPAWNER = "live-spawner";
    const spawnerDir = seedStatus(directory, "live-spawner", { pid: process.pid });
    writeFileSync(join(spawnerDir, INBOX_FILE), "");
    const { harness, toolNames } = fakeHarness();

    registerPeerTools(harness, fakePresence(harness));

    expect(toolNames).toContain("orch_send");
  });
});
