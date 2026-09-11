import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createAgentPresence } from "../src/agent/presence.ts";
import type { BridgeDelivery } from "../src/control/bridge-message.ts";
import type { DaemonClient, HarnessApi, HarnessContext } from "../src/types/agent.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const originalOrchDir = process.env.ORCH_DIR;
const directories: string[] = [];

interface HarnessCall { content: string; options: { deliverAs?: "steer" | "followUp" } | undefined }

function fakeContext(): HarnessContext {
  return {
    hasUI: false,
    sessionManager: {
      getSessionFile: () => undefined,
      getSessionId: () => undefined,
      getBranch: () => [],
    },
    modelRegistry: { find: (provider, id) => ({ provider, id }) },
    ui: {
      notify: () => undefined,
      setStatus: () => undefined,
      setWidget: () => undefined,
    },
    isIdle: () => true,
    getContextUsage: () => undefined,
  };
}

function fakeHarness(): { harness: HarnessApi; messages: HarnessCall[]; models: string[] } {
  const messages: HarnessCall[] = [];
  const models: string[] = [];
  return {
    messages,
    models,
    harness: {
      on: () => undefined,
      registerTool: () => undefined,
      registerCommand: () => undefined,
      sendUserMessage: (content, options) => messages.push({ content, options }),
      setModel: (model) => {
        models.push(`${model.provider}/${model.id}`);
        return Promise.resolve(true);
      },
      getThinkingLevel: () => undefined,
      setThinkingLevel: () => undefined,
      events: { on: () => undefined },
    },
  };
}

function fakeDaemon(): {
  daemon: DaemonClient;
  deliveries: (delivery: BridgeDelivery) => void;
  attached: string[];
  acks: string[];
  detached: number;
} {
  const acked = new Set<string>();
  let onDelivery: ((delivery: BridgeDelivery) => void) | undefined;
  const attached: string[] = [];
  const acks: string[] = [];
  let detached = 0;
  const daemon: DaemonClient = {
    isAcked: (id) => acked.has(id),
    markAcked: (id) => { acked.add(id); },
    ask: () => Promise.resolve(undefined),
    attach: (key, callback) => {
      attached.push(key);
      onDelivery = callback;
    },
    detach: () => { detached += 1; },
    attached: () => onDelivery !== undefined,
    postAck: (id) => {
      acks.push(id);
      return Promise.resolve(true);
    },
    postControlOutcome: () => Promise.resolve(true),
  };
  return {
    daemon,
    deliveries: (delivery) => onDelivery?.(delivery),
    attached,
    acks,
    get detached() { return detached; },
  };
}

function presence(daemon: DaemonClient, harness: HarnessApi) {
  process.env.ORCH_DIR = mkdtempSync(join(tmpdir(), "orch-bridge-apply-"));
  directories.push(process.env.ORCH_DIR);
  const value = createAgentPresence({
    harness,
    identity: { agentId: "pi", settleEvent: "agent_settled" },
    extensionHash: "test",
    daemon,
  });
  value.setLastCtx(fakeContext());
  value.initPresence(true);
  return value;
}

afterEach(() => {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  while (directories.length > 0) removeTempDir(directories.pop() ?? "");
});

describe("presence bridge delivery", () => {
  test("applies dispatch before ack, dedupes redelivery, and detaches", () => {
    const { harness, messages } = fakeHarness();
    const link = fakeDaemon();
    const value = presence(link.daemon, harness);
    expect(link.attached).toHaveLength(1);

    const delivery: BridgeDelivery = { id: "dispatch-1", message: { action: "dispatch", text: "do work" } };
    link.deliveries(delivery);
    expect(messages).toEqual([{ content: "do work", options: undefined }]);
    expect(link.acks).toEqual(["dispatch-1"]);

    link.deliveries(delivery);
    expect(messages).toHaveLength(1);
    expect(link.acks).toEqual(["dispatch-1", "dispatch-1"]);

    value.stopPresence();
    expect(link.detached).toBe(1);
  });

  test("applies model deliveries through model control", async () => {
    const { harness, models } = fakeHarness();
    const link = fakeDaemon();
    const value = presence(link.daemon, harness);

    link.deliveries({ id: "model-1", message: { action: "model", model: "openai/gpt" } });
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    expect(models).toEqual(["openai/gpt"]);
    expect(link.acks).toEqual(["model-1"]);
    value.stopPresence();
  });

  test("resolves matching answers and drops answers for other questions", async () => {
    const { harness } = fakeHarness();
    const link = fakeDaemon();
    const value = presence(link.daemon, harness);

    const answer = value.answers.await("question-1", undefined);
    link.deliveries({ id: "answer-1", message: { action: "answer", questionId: "question-1", text: "yes" } });
    expect(await answer).toEqual({ deliveryId: "answer-1", text: "yes" });
    expect(link.acks).toEqual(["answer-1"]);

    link.deliveries({ id: "answer-2", message: { action: "answer", questionId: "question-2", text: "no" } });
    expect(link.acks).toEqual(["answer-1"]);
    value.stopPresence();
  });
});
