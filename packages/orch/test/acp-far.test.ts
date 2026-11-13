// An agent a linked host's orchd holds in the acp form, driven and read from this host's orchd over
// the real link.
import { afterEach, describe, expect, test } from "bun:test";
import { methods } from "@agentclientprotocol/sdk";
import { rpcCall } from "../src/daemon/client/rpc.ts";
import { abortAnywhere } from "../src/daemon/server/handlers/drive.ts";
import { spawnHeadless } from "../src/daemon/server/handlers/lifecycle.ts";
import { answer, dispatch } from "../src/daemon/server/handlers/write.ts";
import { dropHeldPipes } from "../src/daemon/server/held-pipes.ts";
import type { DaemonState } from "../src/daemon/server/state.ts";
import { hostIdentity } from "../src/hosts/identity.ts";
import { mintAgentId } from "../src/shared/agent-id.ts";
import { agentView } from "../src/store/agent-view.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { selectAgentStatus } from "../src/store/status-rows.ts";
import type { CallerCredential } from "../src/types/core.ts";
import type { HostGreeting } from "../src/types/host.ts";
import { stampGovernance } from "../src/daemon/server/governance.ts";
import type { Governance } from "../src/daemon/client/protocol.ts";
import { acpProgram, chunk, defaultFakeScript, fakeAcpAgent, modelSelector, permission, turn, type FakeAcpScript } from "./helpers/fake-acp-agent.ts";
import { HELD_FAR_CATALOGUE, nearOrchd, type NearOrchd } from "./helpers/held-far.ts";
import { testHost } from "./helpers/host.ts";
import { startFarOrchd, type FarOrchd } from "./helpers/far-orchd.ts";

const fars: FarOrchd[] = [];
const nears: NearOrchd[] = [];
const previousCodexHome = process.env.CODEX_HOME;

const OPERATOR: CallerCredential = { launch: null, session: null, pid: process.pid };

function asOperator<P extends Governance, R>(near: NearOrchd, verb: (state: DaemonState, params: P) => R, params: P): R {
  return verb(near.state, stampGovernance(near.state, { ...params, caller: OPERATOR }));
}

async function until(check: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("the condition was never reached");
}

function greeting(id: string): HostGreeting {
  return { host: testHost(id, `machine-${id}`), commit: null, version: "0.1.0" };
}

async function acpThere(id: string, turns: FakeAcpScript["turns"]) {
  const agent = fakeAcpAgent(defaultFakeScript({ turns, configOptions: [modelSelector(["gpt-5.6-luna"])] }));
  const program = acpProgram(agent);
  const far = await startFarOrchd(greeting(id), { models: HELD_FAR_CATALOGUE, pipes: program.pipes });
  fars.push(far);
  process.env.CODEX_HOME = far.orchDir;
  const key = mintAgentId();
  await spawnHeadless(far.state, {
    form: "acp", key, name: "acp-far", spawner: null, adapter: "codex", model: "gpt-5.6-luna", thinking: "medium", prompt: null, cwd: far.orchDir,
  }, hostIdentity().id);
  const near = await nearOrchd(far, key, {
    name: "acp-far", form: "acp", harness: "codex", model: "gpt-5.6-luna", followEvents: true, serve: true,
  });
  nears.push(near);
  return { far, near, key, agent };
}

afterEach(async () => {
  for (const near of nears.splice(0)) await near.close();
  while (fars.length) await fars.pop()!.close();
  dropHeldPipes();
  closeAllStores();
  if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
  else process.env.CODEX_HOME = previousCodexHome;
});

describe("an acp agent held on a linked host, from here", () => {
  test("dispatch from here runs a turn there, and result here names the host", async () => {
    const { far, near, key } = await acpThere("acp-far-result", [turn({ updates: [chunk("far acp done")] })]);
    const sent = await asOperator(near, dispatch, { target: key, text: "do it" });
    await until(() => selectAgentStatus(far.orchDir, key)?.state === "done");

    expect(agentView(far.orchDir, key)?.form).toBe("acp");
    expect(await rpcCall(near.orchDir, "agent-read", { caller: OPERATOR, key, read: { kind: "result" } })).toMatchObject({
      host: "box", reading: { kind: "result", lookup: { kind: "found", payload: "far acp done" } },
    });
    expect(sent).toMatchObject({ accepted: true });
  });

  test("tail and peek here read the far transcript and name the host", async () => {
    const { far, near, key } = await acpThere("acp-far-tail", [turn({ updates: [chunk("far acp done")] })]);
    await asOperator(near, dispatch, { target: key, text: "do it" });
    await until(() => selectAgentStatus(far.orchDir, key)?.state === "done");

    for (const read of [{ kind: "tail", lines: 10 }, { kind: "screen", lines: 50 }] as const) {
      const reply = await rpcCall(near.orchDir, "agent-read", { caller: OPERATOR, key, read });
      expect(reply.host).toBe("box");
      expect(JSON.stringify(reply.reading)).toContain("far acp done");
    }
  });

  test("a permission ask there is a question here, and answer 2 from here selects the second option", async () => {
    const { far, near, key, agent } = await acpThere("acp-far-permission", [turn({ permissions: [permission("call-1")], waitForCancel: true, stopReason: "cancelled" })]);
    await asOperator(near, dispatch, { target: key, text: "do it" });
    await until(() => selectAgentStatus(far.orchDir, key)?.state === "asking");
    const { questions } = await rpcCall(near.orchDir, "questions", { caller: OPERATOR });
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({ key, question: "Run call-1" });

    await asOperator(near, answer, { target: key, text: "2" });
    await until(() => agent.permissions.length === 1);
    expect(agent.permissions[0]).toMatchObject({
      toolCallId: "call-1", response: { outcome: { outcome: "selected", optionId: "call-1-always" } },
    });
  });

  test("abort from here cancels the turn there", async () => {
    let started = false;
    const { far, near, key, agent } = await acpThere("acp-far-abort", [turn({
      waitForCancel: true, stopReason: "cancelled", onStarted: () => { started = true; },
    })]);
    await asOperator(near, dispatch, { target: key, text: "do it" });
    await until(() => started);
    await asOperator(near, abortAnywhere, { target: key });
    await until(() => selectAgentStatus(far.orchDir, key)?.state === "aborted");

    expect(agent.received.map((entry) => entry.method)).toContain(methods.agent.session.cancel);
  });
});
