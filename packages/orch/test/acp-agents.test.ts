import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { methods } from "@agentclientprotocol/sdk";
import { parseSessionLog } from "../src/agent/session-log.ts";
import { logPathOf } from "../src/backends/headless/index.ts";
import { attachedLink, detachLink } from "../src/control/agent-links.ts";
import { rpcCall } from "../src/daemon/client/rpc.ts";
import { spawnHeldLaunch } from "../src/daemon/server/handlers/lifecycle.ts";
import { answerHere, outboxDeps } from "../src/daemon/server/handlers/write.ts";
import { rpcHandlers } from "../src/daemon/server/handlers/table.ts";
import { dropHeldPipes, heldPipes } from "../src/daemon/server/held-pipes.ts";
import { drainOutbox } from "../src/daemon/server/outbox.ts";
import { startRpcServer } from "../src/daemon/server/rpc.ts";
import type { DaemonState } from "../src/daemon/server/state.ts";
import { flushPresenceHistory, presenceAgentDir } from "../src/presence/history.ts";
import { RESULTS_FILE } from "../src/presence/schema.ts";
import { reapAgentRecord } from "../src/presence/store.ts";
import { placeHere } from "../src/process-place.ts";
import { hostIdentity } from "../src/hosts/identity.ts";
import { mintAgentId } from "../src/shared/agent-id.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { pendingQuestions } from "../src/store/question-rows.ts";
import { selectAgentStatus } from "../src/store/status-rows.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import { fakeAdapter } from "./helpers/adapter.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";
import { FakePtyProvider } from "./helpers/fake-pty.ts";
import { acpProgram, chunk, defaultFakeScript, fakeAcpAgent, permission, turn, type FakeAcpScript } from "./helpers/fake-acp-agent.ts";
import { testDaemonServices } from "./helpers/services.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const dirs: OrchDir[] = [];
const states: DaemonState[] = [];
const attached: { readonly directory: OrchDir; readonly key: string }[] = [];
const servers: RpcServer[] = [];

afterEach(async () => {
  for (const { directory, key } of attached.splice(0)) {
    const link = attachedLink(placeHere(directory, key));
    if (link !== null) detachLink(directory, key, link);
  }
  for (const state of states.splice(0)) state.held.killAll();
  dropHeldPipes();
  for (const server of servers.splice(0)) await server.close();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

/** The harness's ACP binding: a fake adapter with an acp role and no terminal form. */
const ADAPTER = fakeAdapter({
  acp: { argv: () => ["fake-acp"], env: () => ({ FAKE_ACP: "1" }), sharesSessions: false, install: {} },
});

function setup(turns: FakeAcpScript["turns"] = []) {
  const orchDir = tempOrchDir("orch-acp-agents-");
  dirs.push(orchDir);
  const agent = fakeAcpAgent(defaultFakeScript({ turns }));
  const program = acpProgram(agent);
  const state = idleDaemonState(testDaemonServices({ orchDir }), orchDir, new FakePtyProvider(), program.pipes);
  states.push(state);
  return { orchDir, state, agent, spawned: program.spawned };
}

type Harness = ReturnType<typeof setup>;

/** Start an `acp` agent under `key`, with `firstPrompt` queued the way a spawn queues it. */
async function launch(harness: Harness, key: string, firstPrompt: string | null): Promise<void> {
  attached.push({ directory: harness.orchDir, key });
  await spawnHeldLaunch(harness.state, ADAPTER, {
    form: "acp", key, name: "acp-worker", spawner: null, orchDir: harness.orchDir, cwd: harness.orchDir,
    model: "acp-model", thinking: "medium", firstPrompt,
  });
}

/** Deliver the queued first prompt the way the work loop does. */
async function deliverQueued(harness: Harness): Promise<void> {
  await drainOutbox(harness.orchDir, outboxDeps(harness.state));
}

function stateOf(orchDir: OrchDir, key: string): string | undefined {
  return selectAgentStatus(orchDir, key)?.state;
}

/** Wait until a condition holds, polling the store and the screen as orchd writes them. */
async function until(check: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("the condition was never reached");
}

/** Serves this harness's handler table on its socket, as orchd does, so a report reaches it over RPC. */
async function serve(harness: Harness): Promise<void> {
  const server = await startRpcServer(harness.orchDir, rpcHandlers(harness.state), { logger: harness.state.services.logger });
  servers.push(server);
  harness.state.server = server;
}

describe("harness reports about an agent orchd holds", () => {
  test("an agent in the acp form ignores a report-status and a report-result", async () => {
    const key = mintAgentId();
    const harness = setup();
    await launch(harness, key, null);
    await serve(harness);
    const before = selectAgentStatus(harness.orchDir, key)?.state;

    await rpcCall(harness.orchDir, "report-status", { key, status: { state: "done" } });
    await rpcCall(harness.orchDir, "report-result", { key, result: { text: "ignored", finishedAt: Date.now() } });
    flushPresenceHistory();

    expect(before).toBe("idle");
    expect(selectAgentStatus(harness.orchDir, key)?.state).toBe("idle");
    expect(existsSync(join(presenceAgentDir(key, harness.orchDir), RESULTS_FILE))).toBe(false);
  });

  test("an agent in the tui form takes a report-status and a report-result as before", async () => {
    const key = mintAgentId();
    const harness = setup();
    await serve(harness);
    registerSpawnedAgent(harness.orchDir, {
      form: "tui", key, harnessId: "pi", placed: false, cwd: harness.orchDir, name: "tui-worker", model: "test", spawner: null,
      process: { host: hostIdentity().id, pid: process.pid, startToken: `acp-tui-${key}` },
    });

    await rpcCall(harness.orchDir, "report-status", { key, status: { state: "done" } });
    await rpcCall(harness.orchDir, "report-result", { key, result: { text: "kept", finishedAt: Date.now() } });
    flushPresenceHistory();

    expect(selectAgentStatus(harness.orchDir, key)?.state).toBe("done");
    expect(readFileSync(join(presenceAgentDir(key, harness.orchDir), RESULTS_FILE), "utf8")).toContain("kept");
  });
});

describe("an agent orchd holds in the acp form", () => {
  test("a first prompt runs a turn: working, then done with its result stored, and the log holds the turn", async () => {
    const key = mintAgentId();
    const observed: (string | undefined)[] = [];
    const harness = setup([turn({ updates: [chunk("all done")], onStarted: () => { observed.push(stateOf(harness.orchDir, key)); } })]);
    await launch(harness, key, "do the work");
    await deliverQueued(harness);
    await until(() => stateOf(harness.orchDir, key) === "done");

    expect(observed).toEqual(["working"]);
    expect(selectAgentStatus(harness.orchDir, key)).toMatchObject({ state: "done", lastText: "all done" });
    const log = readFileSync(logPathOf(harness.orchDir, key), "utf8");
    expect(parseSessionLog(log)).toEqual([{ role: "assistant", text: "all done" }]);
    flushPresenceHistory();
    const results = readFileSync(join(presenceAgentDir(key, harness.orchDir), RESULTS_FILE), "utf8").trim().split("\n");
    expect(JSON.parse(results.at(-1) ?? "")).toMatchObject({ text: "all done" });
  });

  test("a spawn with no work reports idle with its session id and log path", async () => {
    const key = mintAgentId();
    const harness = setup();
    await launch(harness, key, null);
    expect(selectAgentStatus(harness.orchDir, key)).toMatchObject({
      state: "idle",
      sessionId: "test-session",
      sessionPath: logPathOf(harness.orchDir, key),
    });
  });

  test("a spawn with no first prompt creates its session log, empty", async () => {
    const key = mintAgentId();
    const harness = setup();
    await launch(harness, key, null);
    const logPath = logPathOf(harness.orchDir, key);
    expect(existsSync(logPath)).toBe(true);
    expect(parseSessionLog(readFileSync(logPath, "utf8"))).toEqual([]);
  });

  test("a permission ask is one open question with its options, and answering 1 selects the first option", async () => {
    const key = mintAgentId();
    const harness = setup([turn({ permissions: [permission("call-1")], waitForCancel: true, stopReason: "cancelled" })]);
    await launch(harness, key, "edit the file");
    await deliverQueued(harness);
    await until(() => stateOf(harness.orchDir, key) === "asking");

    expect(pendingQuestions(harness.orchDir)).toHaveLength(1);
    expect(pendingQuestions(harness.orchDir)[0]).toMatchObject({
      agentId: key,
      question: "Run call-1",
      options: [
        { id: "call-1-once", label: "Once", kind: "allow-once" },
        { id: "call-1-always", label: "Always", kind: "allow-always" },
        { id: "call-1-reject", label: "Reject", kind: "reject-once" },
        { id: "call-1-never", label: "Never", kind: "reject-always" },
      ],
    });
    expect(selectAgentStatus(harness.orchDir, key)?.blockedMessage).toBe("Run call-1");

    await answerHere(harness.state, placeHere(harness.orchDir, key), "1", null);
    await until(() => harness.agent.permissions.length === 1);
    expect(harness.agent.permissions[0]).toMatchObject({
      toolCallId: "call-1",
      response: { outcome: { outcome: "selected", optionId: "call-1-once" } },
    });
    expect(pendingQuestions(harness.orchDir)).toEqual([]);
    await until(() => stateOf(harness.orchDir, key) === "working");
    attachedLink(placeHere(harness.orchDir, key))?.abort?.();
    await until(() => stateOf(harness.orchDir, key) === "aborted");
  });

  test("abort during a turn sends session/cancel and ends the agent aborted", async () => {
    const key = mintAgentId();
    let started = false;
    const harness = setup([turn({ waitForCancel: true, stopReason: "cancelled", onStarted: () => { started = true; } })]);
    await launch(harness, key, "long task");
    await deliverQueued(harness);
    await until(() => started);

    attachedLink(placeHere(harness.orchDir, key))?.abort?.();
    await until(() => stateOf(harness.orchDir, key) === "aborted");
    expect(harness.agent.received.map((entry) => entry.method)).toContain(methods.agent.session.cancel);
  });

  test("the process exits: its link is detached and no pipes are held for it", async () => {
    const key = mintAgentId();
    const harness = setup();
    await launch(harness, key, null);
    expect(attachedLink(placeHere(harness.orchDir, key))).not.toBeNull();
    expect(heldPipes(key)).not.toBeNull();

    const far = harness.spawned[0];
    if (far === undefined) throw new Error("the agent process was never spawned");
    far.exit(0);
    await until(() => attachedLink(placeHere(harness.orchDir, key)) === null);
    expect(heldPipes(key)).toBeNull();
  });

  test("the row is removed before the process exits: no rejection escapes and no pipes stay held", async () => {
    const key = mintAgentId();
    const harness = setup();
    await launch(harness, key, null);
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown): void => { rejections.push(reason); };
    process.on("unhandledRejection", onRejection);
    try {
      reapAgentRecord(key, harness.orchDir);
      const far = harness.spawned[0];
      if (far === undefined) throw new Error("the agent process was never spawned");
      far.exit(0);
      await until(() => heldPipes(key) === null);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(rejections).toEqual([]);
    } finally {
      process.off("unhandledRejection", onRejection);
      // The row is gone, so its key has no place left for afterEach to detach.
      attached.length = 0;
    }
  });

  test("the agent's screen holds the rendered text of the turn's entries", async () => {
    const key = mintAgentId();
    const harness = setup([turn({ updates: [chunk("hello from acp")] })]);
    await launch(harness, key, "say hello");
    await deliverQueued(harness);
    await until(() => stateOf(harness.orchDir, key) === "done");
    const screen = () => harness.state.held.snapshot({ kind: "agent", agent: placeHere(harness.orchDir, key) });
    await until(() => screen().includes("hello from acp"));
    expect(screen()).toContain("assistant | hello from acp");
  });
});
