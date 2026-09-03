import { afterEach, describe, expect, test } from "bun:test";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { mkdtempSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readStatus } from "../src/presence/writer.ts";
import { stubDaemonClient } from "./helpers/daemon-client.ts";
import type { HarnessApi, HarnessContext, HarnessEventHandler } from "../src/types/agent.ts";

interface FakeHarness extends HarnessApi {
  fire(name: string, event?: unknown, context?: HarnessContext): void;
}

function fakeHarness(): FakeHarness {
  const handlers = new Map<string, HarnessEventHandler[]>();
  const harness: FakeHarness = {
    on(name: string, handler: HarnessEventHandler): void {
      handlers.set(name, [...(handlers.get(name) ?? []), handler]);
    },
    registerTool: () => undefined,
    registerCommand: () => undefined,
    sendUserMessage: () => undefined,
    setModel: () => Promise.resolve(true),
    getThinkingLevel: () => undefined,
    setThinkingLevel: () => undefined,
    events: { on: () => undefined },
    fire(name: string, event: unknown = {}, context: HarnessContext = harnessContext()): void {
      for (const handler of handlers.get(name) ?? []) void handler(event, context);
    },
  };
  return harness;
}

function harnessContext(): HarnessContext {
  return {
    hasUI: false,
    sessionManager: {
      getSessionFile: () => undefined,
      getSessionId: () => undefined,
      getBranch: () => [],
    },
    modelRegistry: { find: () => undefined },
    ui: { notify: () => undefined, setStatus: () => undefined, setWidget: () => undefined },
    isIdle: () => true,
    getContextUsage: () => undefined,
  };
}

const roots: string[] = [];
// A launch hands over one minted id and nothing else: a key with a
// plexer and a grouping in it is not an identity, and presence would skip it.
const key = "worker0001";
const { createAgentPresence } = await import("../src/agent/presence.ts");
const { registerAgentTools } = await import("../src/agent/tools.ts");

afterEach(() => {
  for (const root of roots.splice(0)) removeTempDir(root);
  delete process.env[LAUNCH_ENV];
  delete process.env.ORCH_DIR;
});

describe("bridge terminal turn seam", () => {
  async function settle(event: unknown = {}, signal = "agent_settled", text?: string): Promise<string> {
    const root = mkdtempSync(join(tmpdir(), "orch-bridge-terminal-"));
    roots.push(root);
    process.env.ORCH_DIR = root;
    process.env[LAUNCH_ENV] = key;
    const harness = fakeHarness();
    const presence = createAgentPresence({
      harness,
      identity: { agentId: "pi", settleEvent: "agent_settled" },
      extensionHash: "test",
      daemon: stubDaemonClient(),
    });
    registerAgentTools(harness, {
      presence,
      daemon: stubDaemonClient(),
      identity: { agentId: "pi", settleEvent: "agent_settled" },
      notify: () => undefined,
      refreshLabels: () => Promise.resolve(),
    });
    const ctx = harnessContext();
    harness.fire("session_start", {}, ctx);
    harness.fire("agent_start", {}, ctx);
    if (text !== undefined) harness.fire("message_end", { message: { role: "assistant", content: text } }, ctx);
    harness.fire(signal, event, signal === "agent_settled" ? undefined : ctx);
    await Promise.resolve();
    const directory = presence.dir();
    if (!directory) throw new Error("presence did not initialise");
    const status = readStatus(directory);
    presence.stopPresence();
    return typeof status.state === "string" ? status.state : "";
  }

  test("empty and tool-only turn_end turns still publish a terminal idle state", async () => {
    expect(await settle({}, "turn_end")).toBe("idle");
  });

  test("a settled turn with assistant text publishes done", async () => {
    expect(await settle({}, "agent_settled", "finished")).toBe("done");
  });
});
