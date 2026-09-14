import type { OrchDir } from "../src/types/core.ts";
import { RPC_PARAMS } from "../src/daemon/client/protocol.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { insertOutboxMessage, markOutboxDelivered, selectPendingOutbox } from "../src/store/outbox-rows.ts";
import { drainOutbox } from "../src/daemon/server/outbox.ts";
import { ReplayBuffer } from "../src/daemon/server/replay.ts";
import type { BridgeMessage } from "../src/control/bridge-message.ts";
import type { OutboxDelivery } from "../src/types/daemon.ts";
import { mintAgentId } from "../src/backends/identity.ts";

const message = (text: string): BridgeMessage => ({ action: "dispatch", text });

type RpcEvent = Parameters<ReplayBuffer["push"]>[0];
type TransitionEvent = Extract<RpcEvent, { type: "transition" }>;
const fixtureAgent = mintAgentId();

function transitionEvent(overrides: Partial<TransitionEvent> = {}): TransitionEvent {
  return {
    type: "transition",
    key: "event",
    ts: new Date(0).toISOString(),
    agent: fixtureAgent,
    tab: "tab",
    model: "model",
    oldState: "idle",
    newState: "working",
    ...overrides,
  };
}

const dirs: OrchDir[] = [];
afterEach(() => {
  while (dirs.length > 0) removeTempDir(dirs.pop()!);
});

function fixture(): OrchDir {
  const dir = tempOrchDir("orch-hardening-");
  dirs.push(dir);
  return dir;
}

describe("broker daemon hardening", () => {
  test("dispatch/steer validation rejects null, arrays, and non-string fields", () => {
    for (const params of [null, [], { target: null, text: "x" }, { target: "a", text: 3 }]) {
      expect(RPC_PARAMS.dispatch.safeParse(params).success).toBe(false);
    }
    expect(RPC_PARAMS.dispatch.safeParse({ target: "agent:a", text: "hello" }).success).toBe(true);
  });

  test("ack is idempotent when the same id is acknowledged twice", () => {
    const dir = fixture();
    insertOutboxMessage(dir, { id: "ack-once", target: "agent:a", payload: message("x") });
    markOutboxDelivered(dir, "ack-once");
    expect(() => markOutboxDelivered(dir, "ack-once")).not.toThrow();
    expect(selectPendingOutbox(dir, Date.now())).toEqual([]);
  });

  test("a throwing delivery is retried and does not poison later messages", async () => {
    const dir = fixture();
    insertOutboxMessage(dir, { id: "throws", target: "a", payload: message("x") });
    insertOutboxMessage(dir, { id: "works", target: "b", payload: message("y") });
    const delivered: string[] = [];
    const result = await drainOutbox(dir, {
      now: () => 1_000,
      maxAttempts: 5,
      deliver: (target) => {
        if (target === "a") return Promise.reject(new Error("backend down"));
        delivered.push(target);
        return Promise.resolve<OutboxDelivery>("acked");
      },
    });
    expect(result).toEqual({ retried: 1, awaiting: 0 });
    expect(delivered).toEqual(["b"]);
    expect(selectPendingOutbox(dir, 1_501).map((message) => message.id)).toEqual(["throws"]);
  });

  test("concurrent drains do not redeliver one message id", async () => {
    const dir = fixture();
    insertOutboxMessage(dir, { id: "single", target: "a", payload: message("x") });
    let deliveries = 0;
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    const deps = { now: () => 0, maxAttempts: 5, deliver: async () => { deliveries += 1; await blocked; return "acked" as const; } };
    const first = drainOutbox(dir, deps);
    await Bun.sleep(0);
    const second = drainOutbox(dir, deps);
    release();
    await Promise.all([first, second]);
    expect(deliveries).toBe(1);
  });

  test("replay after the newest sequence is empty without a gap", () => {
    const dir = fixture();
    const buffer = new ReplayBuffer(dir);
    buffer.push(transitionEvent({ key: "event" }));
    expect(buffer.since(99)).toEqual({ events: [], gap: false, oldestSeq: 1 });
  });

});
