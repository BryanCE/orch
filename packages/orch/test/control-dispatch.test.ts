import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { deliverControl as daemonDeliverControl } from "../src/control/dispatch.ts";
import { AgentGoneError } from "../src/control/agent-gone.ts";
import {
  attachBridge as daemonAttachBridge,
  BridgeDetachedError,
  detachBridge as daemonDetachBridge,
  type BridgeLink,
} from "../src/control/bridge-links.ts";
import type { BridgeDelivery } from "../src/control/bridge-message.ts";
import { settleControlOutcome } from "../src/control/outcome.ts";
import { getBackend, registerBackend } from "../src/backends/registry.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { seedStatus } from "./helpers/presence.ts";
import { seedAgent, seedLiveProcess } from "./helpers/agent.ts";
import { currentTuning, endProcess } from "../src/store/interval-rows.ts";
import { recordQuestion } from "../src/store/question-rows.ts";
import type { AdapterId } from "../src/types/adapter.ts";
import { FakePanedBackend } from "./helpers/backend.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { testServices } from "./helpers/services.ts";

const originalOrchDir = process.env.ORCH_DIR;
const tempDirs: string[] = [];
const links: { readonly key: string; readonly link: BridgeLink }[] = [];

async function rejection(call: Promise<unknown>): Promise<unknown> {
  try {
    await call;
    return undefined;
  } catch (error) {
    return error;
  }
}

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-control-dispatch-"));
  tempDirs.push(dir);
  return dir;
}

function target(): string {
  return mintAgentId();
}

function requiredOrchDir(): string {
  const orchDir = process.env.ORCH_DIR;
  if (!orchDir) throw new Error("ORCH_DIR is required");
  return orchDir;
}

function attachBridge(key: string, link: BridgeLink): void {
  daemonAttachBridge(requiredOrchDir(), key, link);
}

function detachBridge(key: string, link: BridgeLink): void {
  daemonDetachBridge(requiredOrchDir(), key, link);
}

function deliverControl(targetKey: string, action: Parameters<typeof daemonDeliverControl>[3]): ReturnType<typeof daemonDeliverControl> {
  const orchDir = requiredOrchDir();
  const settings = testServices({ orchDir, settings: null }).settings.current();
  return daemonDeliverControl(orchDir, settings, targetKey, action);
}

/** A live agent: registered with this runner as its process, plus its status. */
function presence(directory: string, key: string, agent: AdapterId, extra: Record<string, unknown> = {}): void {
  seedAgent(key, { adapter: agent }, directory);
  seedLiveProcess(directory, key);
  seedStatus(directory, key, { agent, ...extra });
}

function captureBridge(key: string, onPush?: (delivery: BridgeDelivery) => void): BridgeDelivery[] {
  const deliveries: BridgeDelivery[] = [];
  const link: BridgeLink = {
    push(delivery): void {
      deliveries.push(delivery);
      onPush?.(delivery);
    },
  };
  attachBridge(key, link);
  links.push({ key, link });
  return deliveries;
}

afterEach(() => {
  for (const { key, link } of links.splice(0)) detachBridge(key, link);
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  for (const dir of tempDirs.splice(0)) removeTempDir(dir);
});

describe("deliverControl bridge dispatch", () => {
  test("pushes run and steer with their action ids", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const runTarget = target();
    presence(directory, runTarget, "pi");
    const run = captureBridge(runTarget);

    await deliverControl(runTarget, { kind: "run", text: "start", id: "run-1" });
    expect(run).toEqual([{ id: "run-1", message: { action: "dispatch", text: "start" } }]);

    const steerTarget = target();
    presence(directory, steerTarget, "pi");
    const steer = captureBridge(steerTarget);
    await deliverControl(steerTarget, { kind: "steer", text: "adjust", id: "steer-1" });
    expect(steer).toEqual([{ id: "steer-1", message: { action: "steer", text: "adjust" } }]);
  });

  test("reports a detached bridge for a live agent", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target();
    presence(directory, key, "pi");

    expect(await rejection(deliverControl(key, { kind: "steer", text: "lost", id: "steer-1" })))
      .toBeInstanceOf(BridgeDetachedError);
  });

  test("reports a gone agent before pushing to its link", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target();
    presence(directory, key, "pi");
    endProcess(directory, key, Date.now());
    const deliveries = captureBridge(key);

    expect(await rejection(deliverControl(key, { kind: "steer", text: "lost", id: "steer-1" })))
      .toBeInstanceOf(AgentGoneError);
    expect(deliveries).toHaveLength(0);
  });

  test("answers only when status has no pending question", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target();
    presence(directory, key, "pi");
    const deliveries = captureBridge(key);

    expect(await deliverControl(key, { kind: "answer", text: "yes", id: "answer-1" }))
      .toEqual({ outcome: "answer", reason: "not-asking", text: `${key} is not asking a question` });
    expect(deliveries).toHaveLength(0);
  });

  test("pushes an answer with the asking question id", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target();
    presence(directory, key, "pi", { asking: { id: "question-1", question: "ship?", ts: "now" } });
    // The daemon owns the pending question now, so the answerable record is the
    // `questions` row; presence still reports the STATE but no longer carries the
    // id an answer correlates against.
    recordQuestion(directory, { id: "question-1", agentId: key, question: "ship?", askedAt: Date.now() });
    const deliveries = captureBridge(key);

    await deliverControl(key, { kind: "answer", text: "yes", id: "answer-1" });
    expect(deliveries).toEqual([{
      id: "answer-1",
      message: { action: "answer", text: "yes", questionId: "question-1" },
    }]);
  });

  test("pushes model changes and waits for the control outcome", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target();
    presence(directory, key, "pi", { model: { provider: "provider", id: "model" }, thinking: "high" });
    const deliveries = captureBridge(key, (delivery) => {
      const message = delivery.message;
      if (message.action !== "model") return;
      const model = message.model;
      queueMicrotask(() => settleControlOutcome({
        key,
        id: delivery.id,
        command: "model",
        requested: { model },
        applied: { model: "provider/model", thinking: "high" },
      }));
    });

    await deliverControl(key, { kind: "model", model: "provider/model:high", id: "model-1" });
    expect(deliveries).toEqual([{ id: "model-1", message: { action: "model", model: "provider/model:high" } }]);
    expect(currentTuning(directory, key)).toMatchObject({ model: "provider/model", thinking: "high" });
  });

  test("rejects an outcome whose applied pin differs from the request", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target();
    presence(directory, key, "pi");
    captureBridge(key, (delivery) => {
      if (delivery.message.action !== "model") return;
      const requestedModel = delivery.message.model;
      queueMicrotask(() => settleControlOutcome({
        key,
        id: delivery.id,
        command: "model",
        requested: { model: requestedModel },
        applied: { model: "provider/other", thinking: "high" },
      }));
    });

    expect(await rejection(deliverControl(key, { kind: "model", model: "provider/model:high", id: "model-2" })))
      .toEqual(new Error("pinned provider/model:high, agent reports provider/other:high"));
    expect(currentTuning(directory, key)?.model).toBe("");
  });

  test("uses the backend input path when the adapter bridge takes no steers", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target();
    seedAgent(key, { adapter: "claude", backend: "headless", handle: key }, directory);
    seedLiveProcess(directory, key);
    seedStatus(directory, key, { agent: "claude" });
    const submitted: { handle: unknown; text: string }[] = [];
    const backend = new FakePanedBackend();
    const previous = getBackend("headless");
    if (!previous) throw new Error("headless backend is not registered");
    Object.defineProperty(backend, "agentInput", {
      value: {
        submit(handle: unknown, text: string): void { submitted.push({ handle, text }); },
        sendKeys: () => undefined,
        focus: () => undefined,
      },
    });
    registerBackend(backend);
    try {
      const deliveries = captureBridge(key);
      await deliverControl(key, { kind: "steer", text: "hello", id: "steer-1" });
      expect(submitted).toEqual([{ handle: key, text: "hello" }]);
      expect(deliveries).toHaveLength(0);
    } finally {
      registerBackend(previous);
    }
  });
});
