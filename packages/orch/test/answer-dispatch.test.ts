import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { deliverControl } from "../src/control/dispatch.ts";
import { AgentGoneError } from "../src/control/agent-gone.ts";
import {
  attachBridge,
  BridgeDetachedError,
  detachBridge,
  type BridgeLink,
} from "../src/control/bridge-links.ts";
import type { BridgeDelivery } from "../src/control/bridge-message.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { seedStatus } from "./helpers/presence.ts";
import { seedAgent } from "./helpers/agent.ts";
import { recordQuestion } from "../src/store/question-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const originalOrchDir = process.env.ORCH_DIR;
const tempDirs: string[] = [];
const links: { readonly key: string; readonly link: BridgeLink }[] = [];
const DEAD_PID = 0x7fffffff;

async function rejection(call: Promise<unknown>): Promise<unknown> {
  try {
    await call;
    return undefined;
  } catch (error) {
    return error;
  }
}

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-answer-dispatch-"));
  tempDirs.push(dir);
  return dir;
}

function target(): string {
  return mintAgentId();
}

function attach(key: string): BridgeDelivery[] {
  const deliveries: BridgeDelivery[] = [];
  const link: BridgeLink = { push: (delivery): void => { deliveries.push(delivery); } };
  attachBridge(key, link);
  links.push({ key, link });
  return deliveries;
}

/**
 * An asking agent, seeded the way one now exists: the DAEMON owns the pending
 * question, so the answerable record is a `questions` row. The presence `asking`
 * block is still written because presence keeps reporting the agent's STATE, but
 * it is no longer what an answer correlates against.
 */
function answerStatus(directory: string, key: string, asking?: { readonly id: string }): void {
  seedAgent(key, { adapter: "pi" }, directory);
  seedStatus(directory, key, {
    agent: "pi",
    ...(asking === undefined ? {} : { asking: { id: asking.id, question: "question", ts: "now" } }),
  });
  if (asking !== undefined) {
    recordQuestion(directory, { id: asking.id, agentId: key, question: "question", askedAt: Date.now() });
  }
}

afterEach(() => {
  for (const { key, link } of links.splice(0)) detachBridge(key, link);
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  for (const dir of tempDirs.splice(0)) removeTempDir(dir);
});

describe("answer over the bridge", () => {
  test("pushes the answer and its question id", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target();
    answerStatus(directory, key, { id: "question-1" });
    const deliveries = attach(key);

    expect(await deliverControl(key, { kind: "answer", text: "yes", id: "answer-1" }))
      .toEqual({ outcome: "invoke", ack: "expected" });
    expect(deliveries).toEqual([{
      id: "answer-1",
      message: { action: "answer", text: "yes", questionId: "question-1" },
    }]);
  });

  test("returns not-asking without pushing", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target();
    answerStatus(directory, key);
    const deliveries = attach(key);

    expect(await deliverControl(key, { kind: "answer", text: "yes", id: "answer-2" }))
      .toEqual({ outcome: "answer", reason: "not-asking", text: `${key} is not asking a question` });
    expect(deliveries).toHaveLength(0);
  });

  test("reports a detached bridge for a live asking agent", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target();
    answerStatus(directory, key, { id: "question-3" });

    expect(await rejection(deliverControl(key, { kind: "answer", text: "yes", id: "answer-3" })))
      .toBeInstanceOf(BridgeDetachedError);
  });

  test("reports a gone asking agent", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target();
    seedStatus(directory, key, {
      agent: "pi",
      pid: DEAD_PID,
      asking: { id: "question-4", question: "question", ts: "now" },
    });
    attach(key);

    expect(await rejection(deliverControl(key, { kind: "answer", text: "yes", id: "answer-4" })))
      .toBeInstanceOf(AgentGoneError);
  });

  test("answers with a clear absence when the adapter takes no answers", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target();
    seedAgent(key, { adapter: "claude" }, directory);
    seedStatus(directory, key, { agent: "claude" });

    expect(await deliverControl(key, { kind: "answer", text: "yes", id: "answer-5" })).toEqual({
      outcome: "answer",
      reason: "no-environment-role",
      text: `cannot answer ${key}: adapter claude takes no answers`,
    });
  });
});
