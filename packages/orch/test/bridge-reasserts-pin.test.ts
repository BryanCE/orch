import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { createAgentPresence } from "../src/agent/presence.ts";
import { registerAgentTools } from "../src/agent/tools.ts";
import type { BridgeDelivery } from "../src/control/bridge-message.ts";
import type {
  ControlOutcomeReport,
  DaemonLink,
  HarnessApi,
  HarnessContext,
  HarnessEventHandler,
} from "../src/types/agent.ts";
import type { ThinkingLevel } from "../src/types/policy.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { testServices } from "./helpers/services.ts";

interface FakeHarness extends HarnessApi {
  fire(name: string, event?: unknown, context?: HarnessContext): void;
  modelCalls: string[];
  thinkingCalls: ThinkingLevel[];
  clampThinking: boolean;
}

function context(): HarnessContext {
  return {
    hasUI: true,
    sessionManager: {
      getSessionFile: () => undefined,
      getSessionId: () => undefined,
      getBranch: () => [],
    },
    modelRegistry: {
      find: (provider, id) => ({ provider, id }),
    },
    ui: {
      notify: () => undefined,
      setStatus: () => undefined,
      setWidget: () => undefined,
    },
    isIdle: () => true,
    getContextUsage: () => undefined,
  };
}

function fakeHarness(): FakeHarness {
  const handlers = new Map<string, HarnessEventHandler[]>();
  let thinking: ThinkingLevel = "low";
  const harness: FakeHarness = {
    on(name, handler): void {
      handlers.set(name, [...(handlers.get(name) ?? []), handler]);
    },
    registerTool: () => undefined,
    registerCommand: () => undefined,
    sendUserMessage: () => undefined,
    setModel: (nextModel) => {
      harness.modelCalls.push(`${nextModel.provider}/${nextModel.id}`);
      harness.fire("model_select", { model: nextModel }, context());
      return Promise.resolve(true);
    },
    getThinkingLevel: () => thinking,
    setThinkingLevel: (level) => {
      harness.thinkingCalls.push(level);
      if (harness.clampThinking) {
        thinking = "low";
        return;
      }
      thinking = level;
      harness.fire("thinking_level_select", { level }, context());
    },
    events: { on: () => undefined },
    fire(name, event = {}, ctx = context()): void {
      for (const handler of handlers.get(name) ?? []) void handler(event, ctx);
    },
    modelCalls: [],
    thinkingCalls: [],
    clampThinking: false,
  };
  return harness;
}

function fakeDaemon(): {
  daemon: DaemonLink;
  deliver(delivery: BridgeDelivery): void;
  reports: ControlOutcomeReport[];
} {
  let onDelivery: ((delivery: BridgeDelivery) => void) | undefined;
  const reports: ControlOutcomeReport[] = [];
  const acked = new Set<string>();
  return {
    daemon: {
      isAcked: (id) => acked.has(id),
      markAcked: (id) => acked.add(id),
      ask: () => Promise.resolve(undefined),
      attach: (_key, callback) => { onDelivery = callback; },
      detach: () => { onDelivery = undefined; },
      attached: () => onDelivery !== undefined,
      postAck: () => Promise.resolve(true),
      postQuestion: () => Promise.resolve(),
      postControlOutcome: (report) => {
        reports.push(report);
        return Promise.resolve(true);
      },
      reportStatus: () => Promise.resolve(true),
      reportResult: () => Promise.resolve(true),
    },
    deliver: (delivery) => onDelivery?.(delivery),
    reports,
  };
}

const roots: OrchDir[] = [];
const originalOrchDir = process.env.ORCH_DIR;
const originalLaunch = process.env[LAUNCH_ENV];

afterEach(() => {
  for (const root of roots.splice(0)) removeTempDir(root);
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  if (originalLaunch === undefined) delete process.env[LAUNCH_ENV];
  else process.env[LAUNCH_ENV] = originalLaunch;
});

async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function setup(): {
  harness: FakeHarness;
  daemon: ReturnType<typeof fakeDaemon>;
  presence: ReturnType<typeof createAgentPresence>;
} {
  const root = tempOrchDir(`orch-reassert-${randomUUID()}-`);
  roots.push(root);
  process.env.ORCH_DIR = root;
  process.env[LAUNCH_ENV] = "worker0001";
  const harness = fakeHarness();
  const daemon = fakeDaemon();
  const presence = createAgentPresence({
    harness,
    identity: { agentId: "pi", settleEvent: "agent_settled" },
    extensionHash: "test",
    daemon: daemon.daemon,
  });
  const ctx = context();
  presence.setLastCtx(ctx);
  presence.initPresence(true);
  const settings = testServices({ orchDir: root, settings: null }).settings;
  registerAgentTools(harness, {
    presence,
    daemon: daemon.daemon,
    identity: { agentId: "pi", settleEvent: "agent_settled" },
    notify: () => undefined,
    refreshLabels: () => Promise.resolve(),
  }, root, settings);
  return { harness, daemon, presence };
}

describe("bridge reasserts orch model pins", () => {
  test("reasserts after session_start and reports the applied pin", async () => {
    const { harness, daemon, presence } = setup();
    daemon.deliver({ id: "model-1", message: { action: "model", model: "openai/gpt:medium" } });
    await flush();
    expect(harness.modelCalls).toEqual(["openai/gpt"]);
    expect(harness.thinkingCalls).toEqual(["medium"]);

    harness.fire("session_start");
    await flush();
    expect(harness.modelCalls).toEqual(["openai/gpt", "openai/gpt"]);
    expect(harness.thinkingCalls).toEqual(["medium", "medium"]);
    expect(daemon.reports.at(-1)?.applied).toEqual({ model: "openai/gpt", thinking: "medium" });
    harness.fire("session_shutdown");
    presence.stopPresence();
  });

  test("reasserts one time for a foreign level and ignores apply events", async () => {
    const { harness, daemon, presence } = setup();
    daemon.deliver({ id: "model-1", message: { action: "model", model: "openai/gpt:medium" } });
    await flush();
    const modelCallsAfterPin = harness.modelCalls.length;
    const thinkingCallsAfterPin = harness.thinkingCalls.length;

    harness.fire("thinking_level_select", { level: "low" });
    await flush();
    expect(harness.modelCalls).toHaveLength(modelCallsAfterPin + 1);
    expect(harness.thinkingCalls).toHaveLength(thinkingCallsAfterPin + 1);
    expect(daemon.reports.at(-1)?.applied?.thinking).toBe("medium");

    harness.fire("session_shutdown");
    presence.stopPresence();
  });

  test("a harness clamp does not create a reassert loop", async () => {
    const { harness, daemon, presence } = setup();
    daemon.deliver({ id: "model-1", message: { action: "model", model: "openai/gpt:medium" } });
    await flush();
    harness.clampThinking = true;
    await presence.modelControl.reassert();
    expect(harness.modelCalls).toHaveLength(2);
    expect(harness.thinkingCalls).toHaveLength(2);
    expect(daemon.reports.at(-1)?.applied).toEqual({ model: "openai/gpt", thinking: "low" });
    harness.fire("session_shutdown");
    presence.stopPresence();
  });
});
