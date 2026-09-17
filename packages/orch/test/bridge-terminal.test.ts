import type { OrchDir } from "../src/types/core.ts";
import type { RunRecord } from "../src/types/store.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { recordAgentStatus } from "../src/presence/store.ts";
import { selectAgentStatus } from "../src/store/status-rows.ts";
import { upsertRun } from "../src/store/run-rows.ts";
import { stubDaemonClient } from "./helpers/daemon-client.ts";
import { seedAgent } from "./helpers/agent.ts";
import type { DaemonClient, HarnessApi, HarnessContext, HarnessEventHandler } from "../src/types/agent.ts";
import { testServices } from "./helpers/services.ts";

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

const roots: OrchDir[] = [];
// A launch hands over one minted id and nothing else: a key with a
// plexer and a grouping in it is not an identity, and presence would skip it.
const key = "worker0001";

function fakeDaemonClient(orchDir: OrchDir): DaemonClient {
  const client = stubDaemonClient();
  return {
    ...client,
    reportStatus: (agentKey, patch) => {
      recordAgentStatus(orchDir, agentKey, patch, Date.now());
      return Promise.resolve(true);
    },
    reportResult: (agentKey, result) => {
      if (result.dispatchId === undefined || result.dispatchId === null) return Promise.resolve(true);
      const now = Date.now();
      const run: RunRecord = {
        dispatchId: result.dispatchId,
        agentKey,
        state: "done",
        startedAt: now,
        finishedAt: result.finishedAt,
        result: result.text,
      };
      if (result.task !== undefined && result.task !== null) run.task = result.task;
      if (result.model !== undefined && result.model !== null) run.model = result.model.id;
      if (result.tokens !== undefined && result.tokens !== null) {
        run.tokensIn = result.tokens.input;
        run.tokensOut = result.tokens.output;
        run.cacheRead = result.tokens.cacheRead;
        run.cacheWrite = result.tokens.cacheWrite;
      }
      if (result.cost !== undefined && result.cost !== null) run.cost = result.cost;
      if (result.turns !== undefined && result.turns !== null) run.turns = result.turns;
      upsertRun(orchDir, run);
      return Promise.resolve(true);
    },
  };
}

const { createAgentPresence } = await import("../src/agent/presence.ts");
const { registerAgentTools } = await import("../src/agent/tools.ts");

afterEach(() => {
  for (const root of roots.splice(0)) removeTempDir(root);
  delete process.env[LAUNCH_ENV];
  delete process.env.ORCH_DIR;
});

describe("bridge terminal turn seam", () => {
  async function settle(event: unknown = {}, signal = "agent_settled", text?: string): Promise<string> {
    const root = tempOrchDir("orch-bridge-terminal-");
    roots.push(root);
    process.env.ORCH_DIR = root;
    process.env[LAUNCH_ENV] = key;
    seedAgent(key, {}, root);
    const harness = fakeHarness();
    const daemon = fakeDaemonClient(root);
    const presence = createAgentPresence({
      harness,
      identity: { agentId: "pi", settleEvent: "agent_settled" },
      extensionHash: "test",
      daemon,
    });
    registerAgentTools(harness, {
      presence,
      daemon,
      identity: { agentId: "pi", settleEvent: "agent_settled" },
      notify: () => undefined,
      refreshLabels: () => Promise.resolve(),
    }, root, testServices({ orchDir: root, settings: null }).settings);
    const ctx = harnessContext();
    harness.fire("session_start", {}, ctx);
    harness.fire("agent_start", {}, ctx);
    if (text !== undefined) harness.fire("message_end", { message: { role: "assistant", content: text } }, ctx);
    harness.fire(signal, event, signal === "agent_settled" ? undefined : ctx);
    await Promise.resolve();
    const status = selectAgentStatus(root, key);
    if (!status) throw new Error("presence status was not reported");
    presence.stopPresence();
    return status.state;
  }

  test("empty and tool-only turn_end turns still publish a terminal idle state", async () => {
    expect(await settle({}, "turn_end")).toBe("idle");
  });

  test("a settled turn with assistant text publishes done", async () => {
    expect(await settle({}, "agent_settled", "finished")).toBe("done");
  });
});
