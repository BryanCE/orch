// Driving a held agent on another host from this host's orchd: every drive verb goes through
// the handler the CLI calls here, over the real link, to the far orchd that holds the agent's
// PTY, and answers as it does for an agent here.
import { afterEach, describe, expect, test } from "bun:test";
import { attachFakeBridge, detachFakeBridges, heldFarAgent, nearOrchd, startHeldFar, type HeldFar, type NearOrchd } from "./helpers/held-far.ts";
import type { FakePty } from "./helpers/fake-pty.ts";
import { testHost } from "./helpers/host.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { rpcCall } from "../src/daemon/client/rpc.ts";
import { dispatch, steer, answer } from "../src/daemon/server/handlers/write.ts";
import { clearSession, setModel } from "../src/daemon/server/handlers/lifecycle.ts";
import { abortAnywhere } from "../src/daemon/server/handlers/drive.ts";
import { rename } from "../src/daemon/server/handlers/lease.ts";
import { ownedAgents } from "../src/daemon/server/handlers/owned.ts";
import { outboxMessageState, selectOutboxMessage } from "../src/store/outbox-rows.ts";
import { pendingQuestion, recordQuestion } from "../src/store/question-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { selectAgentStatus } from "../src/store/status-rows.ts";
import { stampGovernance } from "../src/daemon/server/governance.ts";
import type { Governance } from "../src/daemon/client/protocol.ts";
import type { DaemonState } from "../src/daemon/server/state.ts";
import type { CallerCredential } from "../src/types/core.ts";
import type { HostGreeting } from "../src/types/host.ts";
import type { AgentState } from "../src/agent-state.ts";

const fars: HeldFar[] = [];
const nears: NearOrchd[] = [];

afterEach(async () => {
  detachFakeBridges();
  for (const near of nears.splice(0)) await near.close();
  closeAllStores();
  while (fars.length) await fars.pop()!.close();
});

function greeting(id: string): HostGreeting {
  return { host: testHost(id, `machine-${id}`), commit: null, version: "0.1.0" };
}

/** A pi agent held on the far host `id`, spawned at this host's asking, with its bridge attached
 *  there, and this host's orchd linked to that host as box. */
async function heldThere(id: string): Promise<{ far: HeldFar; near: NearOrchd; key: string; pty: FakePty; deliveries: ReturnType<typeof attachFakeBridge> }> {
  const far = await startHeldFar(greeting(id));
  fars.push(far);
  const { key, pty } = await heldFarAgent(far);
  const deliveries = attachFakeBridge(far, key);
  const near = await nearOrchd(far, key);
  nears.push(near);
  return { far, near, key, pty, deliveries };
}

/** The operator at this host's terminal: the caller that spawned every agent here. */
const OPERATOR: CallerCredential = { launch: null, session: null, pid: process.pid };

/** A drive verb run by this host's orchd for the operator's CLI, its params stamped as orchd stamps them. */
function asOperator<P extends Governance, R>(near: NearOrchd, verb: (state: DaemonState, params: P) => R, params: P): R {
  return verb(near.state, stampGovernance(near.state, { ...params, caller: OPERATOR }));
}

/** The harness reports its state to the far orchd, over that orchd's socket. */
function report(far: HeldFar, key: string, state: AgentState): Promise<unknown> {
  return rpcCall(far.orchDir, "report-status", { key, status: { state } });
}

/** Resolves once the PTY has been typed `text`. */
function typed(pty: FakePty, text: string): Promise<void> {
  return new Promise((resolve) => {
    const poll = (): void => { if (pty.written.join("").includes(text)) resolve(); else setTimeout(poll, 5); };
    poll();
  });
}

/** `orch reset` here: the far harness takes `/new` in its PTY and comes back idle. */
async function resetThere(far: HeldFar, near: NearOrchd, key: string, pty: FakePty): Promise<unknown> {
  const cleared = asOperator(near, clearSession, { target: key });
  await typed(pty, "/new\r");
  await report(far, key, "idle");
  return cleared;
}

describe("a held agent on a linked host, driven from here", () => {
  test("dispatch to a fresh agent reaches its bridge there and is acknowledged", async () => {
    const { far, near, key, deliveries } = await heldThere("held-d1");
    const answered = await asOperator(near, dispatch, { target: key, text: "do the far thing" });
    expect(answered).toMatchObject({ accepted: true, ack: "acknowledged" });
    expect(deliveries.map((delivery) => delivery.message)).toEqual([{ action: "dispatch", text: "do the far thing" }]);
    expect(outboxMessageState(far.orchDir, answered.id)).toBe("delivered");
    expect(selectOutboxMessage(near.orchDir, answered.id)).toBeUndefined();
  });

  test("dispatch to an agent that finished a turn resets it there first, as orch dispatch does", async () => {
    const { far, near, key, pty, deliveries } = await heldThere("held-d2");
    await report(far, key, "working");
    await report(far, key, "done");
    expect(await resetThere(far, near, key, pty)).toEqual({ ok: true });
    expect(selectAgentStatus(far.orchDir, key)?.state).toBe("idle");
    // A clear drops the model, so dispatch pins it again before the work goes.
    expect(await asOperator(near, setModel, { target: key, model: "openai/gpt-5.6-luna:medium" })).toEqual({ ok: true, applied: "openai/gpt-5.6-luna:medium" });
    const answered = await asOperator(near, dispatch, { target: key, text: "the next task", worker: { harness: "pi", context: { maySpawn: false } } });
    expect(answered).toMatchObject({ accepted: true, ack: "acknowledged" });
    const [pin, work] = deliveries.map((delivery) => delivery.message);
    expect(pin).toEqual({ action: "model", model: "openai/gpt-5.6-luna:medium" });
    expect(work).toMatchObject({ action: "dispatch" });
    expect(work?.action === "dispatch" ? work.text : "").toContain("the next task");
    expect(deliveries).toHaveLength(2);
  });

  test("dispatch --rename renames it in both stores, then delivers", async () => {
    const { far, near, key, deliveries } = await heldThere("held-d3");
    expect(await asOperator(near, rename, { target: key, name: "far-renamed" })).toEqual({ id: key, name: "far-renamed", chrome: "none", chromeError: null });
    expect(agentView(far.orchDir, key)?.name).toBe("far-renamed");
    expect(agentView(near.orchDir, key)?.name).toBe("far-renamed");
    expect(await asOperator(near, dispatch, { target: key, text: "renamed work" })).toMatchObject({ accepted: true, ack: "acknowledged" });
    expect(deliveries.map((delivery) => delivery.message)).toEqual([{ action: "dispatch", text: "renamed work" }]);
  });

  test("steer reaches its bridge there and is acknowledged", async () => {
    const { far, near, key, deliveries } = await heldThere("held-s1");
    await report(far, key, "working");
    expect(await asOperator(near, steer, { target: key, text: "change course" })).toMatchObject({ accepted: true, ack: "acknowledged" });
    expect(deliveries.map((delivery) => delivery.message)).toEqual([{ action: "steer", text: "change course" }]);
  });

  test("answer settles the question pending there, through its bridge", async () => {
    const { far, near, key, deliveries } = await heldThere("held-a1");
    recordQuestion(far.orchDir, { id: "q-held", agentId: key, question: "which branch?", askedAt: Date.now() });
    await report(far, key, "asking");
    expect(await asOperator(near, answer, { target: key, text: "main" })).toMatchObject({ accepted: true, ack: "acknowledged" });
    expect(deliveries.map((delivery) => delivery.message)).toEqual([{ action: "answer", text: "main", questionId: "q-held" }]);
    expect(pendingQuestion(far.orchDir, key)).toBeUndefined();
  });

  test("model switches the running agent there and records what it applied", async () => {
    const { far, near, key, deliveries } = await heldThere("held-m1");
    expect(await asOperator(near, setModel, { target: key, model: "openai/gpt-5.6-sol:high" })).toEqual({ ok: true, applied: "openai/gpt-5.6-sol:high" });
    expect(deliveries.map((delivery) => delivery.message)).toEqual([{ action: "model", model: "openai/gpt-5.6-sol:high" }]);
    expect(agentView(far.orchDir, key)?.tuning).toMatchObject({ model: "openai/gpt-5.6-sol", thinking: "high" });
  });

  test("reset types the harness's reset into its PTY there and answers once it is idle again", async () => {
    const { far, near, key, pty } = await heldThere("held-r1");
    await report(far, key, "idle");
    expect(await resetThere(far, near, key, pty)).toEqual({ ok: true });
    expect(pty.written.join("")).toBe("/new\r");
  });

  test("abort sends two Escapes into its PTY there", async () => {
    const { near, key, pty } = await heldThere("held-x1");
    expect(await asOperator(near, abortAnywhere, { target: key })).toEqual({ outcome: "aborted" });
    expect(pty.written).toEqual(["\x1b", "\x1b"]);
  });

  test("abort with text cancels the turn, then steers the text in its place", async () => {
    const { far, near, key, pty, deliveries } = await heldThere("held-x2");
    await report(far, key, "working");
    expect(await asOperator(near, abortAnywhere, { target: key })).toEqual({ outcome: "aborted" });
    expect(await asOperator(near, steer, { target: key, text: "do this instead" })).toMatchObject({ accepted: true, ack: "acknowledged" });
    expect(pty.written).toEqual(["\x1b", "\x1b"]);
    expect(deliveries.map((delivery) => delivery.message)).toEqual([{ action: "steer", text: "do this instead" }]);
  });

  test("broadcast --all counts it among the operator's live agents and steers it there", async () => {
    const { far, near, key, deliveries } = await heldThere("held-b1");
    await report(far, key, "working");
    expect(ownedAgents(near.state, { caller: OPERATOR, live: true }).keys).toContain(key);
    expect(await asOperator(near, steer, { target: key, text: "everyone: stop and commit" })).toMatchObject({ accepted: true, ack: "acknowledged" });
    expect(deliveries.map((delivery) => delivery.message)).toEqual([{ action: "steer", text: "everyone: stop and commit" }]);
  });
});
