import { afterEach, describe, expect, test } from "bun:test";
import {
  methods,
  PROTOCOL_VERSION,
  type SessionUpdate,
} from "@agentclientprotocol/sdk";
import {
  openAcpSession,
  probeAcpAgent,
  type AcpPermissionAsk,
  type AcpSessionHandlers,
} from "../src/acp/session.ts";
import {
  chunk,
  defaultFakeScript,
  fakeAcpAgent,
  modelSelector,
  permission,
  turn,
  type FakeAcpScript,
} from "./helpers/fake-acp-agent.ts";

const info = { name: "orch-test", version: "test" };
const cwd = "/acp-test";
const sessionId = "test-session";
const agents: ReturnType<typeof fakeAcpAgent>[] = [];

function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error("Deferred promise not initialized"); };
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function setup(overrides: Partial<FakeAcpScript> = {}) {
  const fake = fakeAcpAgent(defaultFakeScript(overrides));
  agents.push(fake);
  return fake;
}

function handlers(updates: SessionUpdate[] = []): AcpSessionHandlers {
  return { onUpdate: (update) => updates.push(update), onPermission: () => Promise.resolve(null) };
}

afterEach(async () => {
  for (const fake of agents.splice(0)) {
    fake.connection.close();
    await fake.connection.closed;
  }
});

describe("ACP session", () => {
  test("a full turn delivers chunks in order and sends only text", async () => {
    const updates = [chunk("hello"), chunk(" world")];
    const fake = setup({ turns: [turn({ updates })] });
    const seen: SessionUpdate[] = [];
    const session = await openAcpSession(fake.streams, { kind: "new", cwd }, handlers(seen), info);
    expect(await session.prompt("go")).toBe("end_turn");
    expect(seen).toEqual(updates);
    expect(fake.received).toEqual([
      { method: methods.agent.initialize, params: { protocolVersion: PROTOCOL_VERSION, clientInfo: info, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false, auth: { terminal: false } } } },
      { method: methods.agent.session.new, params: { cwd, mcpServers: [] } },
      { method: methods.agent.session.prompt, params: { sessionId, prompt: [{ type: "text", text: "go" }] } },
    ]);
    await session.close();
    await session.ended;
    expect(fake.received.at(-1)).toEqual({ method: methods.agent.session.close, params: { sessionId } });
  });

  test("cancel during a turn notifies the agent and rejects concurrent prompts", async () => {
    const started = deferred<void>();
    const fake = setup({ turns: [turn({ waitForCancel: true, stopReason: "cancelled", onStarted: () => started.resolve() })] });
    const session = await openAcpSession(fake.streams, { kind: "new", cwd }, handlers(), info);
    const prompt = session.prompt("go");
    await started.promise;
    expect(session.prompt("overlap")).rejects.toThrow("already running");
    await session.cancel();
    expect(await prompt).toBe("cancelled");
    expect(fake.received.at(-1)).toEqual({ method: methods.agent.session.cancel, params: { sessionId } });
    await session.close();
  });

  test("concurrent permissions answered in reverse order retain their option ids", async () => {
    const first = deferred<string | null>();
    const second = deferred<string | null>();
    const both = deferred<void>();
    const answeredSecond = deferred<void>();
    const asks: AcpPermissionAsk[] = [];
    const fake = setup({ turns: [turn({ permissions: [permission("one"), permission("two")] })] });
    const session = await openAcpSession(fake.streams, { kind: "new", cwd }, {
      ...handlers(),
      onPermission(ask) {
        asks.push(ask);
        if (ask.toolCallId === "two") {
          both.resolve();
          return second.promise.then((answer) => { answeredSecond.resolve(); return answer; });
        }
        return first.promise;
      },
    }, info);
    const prompt = session.prompt("go");
    await both.promise;
    second.resolve("two-always");
    await answeredSecond.promise;
    first.resolve("one-once");
    expect(await prompt).toBe("end_turn");
    expect(fake.permissions).toEqual([
      { toolCallId: "two", response: { outcome: { outcome: "selected", optionId: "two-always" } } },
      { toolCallId: "one", response: { outcome: { outcome: "selected", optionId: "one-once" } } },
    ]);
    expect(asks.find((ask) => ask.toolCallId === "one")).toEqual({
      toolCallId: "one", title: "Run one", options: [
        { id: "one-once", label: "Once", kind: "allow-once" },
        { id: "one-always", label: "Always", kind: "allow-always" },
        { id: "one-reject", label: "Reject", kind: "reject-once" },
        { id: "one-never", label: "Never", kind: "reject-always" },
      ],
    });
    await session.close();
  });

  test("a disconnect mid-prompt rejects the retained prompt and settles ended with no unhandled rejection", async () => {
    const started = deferred<void>();
    const unhandled: unknown[] = [];
    const record = (reason: unknown) => { unhandled.push(reason); };
    process.on("unhandledRejection", record);
    try {
      const fake = setup({ turns: [turn({ waitForCancel: true, onStarted: () => started.resolve() })] });
      const relay = new TransformStream<Uint8Array, Uint8Array>();
      const link = new AbortController();
      fake.streams.output.pipeTo(relay.writable, { signal: link.signal }).catch(() => undefined);
      const session = await openAcpSession(
        { input: fake.streams.input, output: relay.readable }, { kind: "new", cwd }, handlers(), info,
      );
      const prompt = session.prompt("go");
      await started.promise;
      link.abort(new Error("agent disconnected"));
      await new Promise((done) => setTimeout(done, 0));
      expect(await prompt.then(() => "resolved", () => "rejected")).toBe("rejected");
      await session.ended;
      await new Promise((done) => setTimeout(done, 0));
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", record);
    }
  });

  test("cancel answers every open ask as cancelled without waiting for the user", async () => {
    const asking = deferred<void>();
    const neverAnswered = deferred<string | null>();
    const fake = setup({ turns: [turn({ permissions: [permission("one")], waitForCancel: true, stopReason: "cancelled" })] });
    const session = await openAcpSession(fake.streams, { kind: "new", cwd }, {
      ...handlers(),
      onPermission() { asking.resolve(); return neverAnswered.promise; },
    }, info);
    const prompt = session.prompt("go");
    await asking.promise;
    await session.cancel();
    expect(await prompt).toBe("cancelled");
    expect(fake.permissions).toEqual([{ toolCallId: "one", response: { outcome: { outcome: "cancelled" } } }]);
    neverAnswered.resolve("one-once");
    await session.close();
  });

  test("probeAcpAgent reports the agent's name, version and protocol version and opens no session", async () => {
    const fake = setup({ initialize: { protocolVersion: PROTOCOL_VERSION, agentInfo: { name: "probe-agent", version: "1.2.3" } } });
    expect(await probeAcpAgent(fake.streams, info)).toEqual({ name: "probe-agent", version: "1.2.3", protocolVersion: PROTOCOL_VERSION, load: false, resume: false });
    expect(fake.received.map((request) => request.method)).toEqual([methods.agent.initialize]);
  });

  test("load replays all updates before opening resolves", async () => {
    const replay = [chunk("first"), chunk("second"), chunk("third")];
    const fake = setup({ replay });
    const seen: SessionUpdate[] = [];
    const session = await openAcpSession(fake.streams, { kind: "load", cwd, sessionId }, handlers(seen), info);
    expect(session.sessionId).toBe(sessionId);
    expect(seen).toEqual(replay);
    expect(fake.received.at(-1)).toEqual({ method: methods.agent.session.load, params: { cwd, sessionId, mcpServers: [] } });
    await session.close();
  });

  test("load and resume require their advertised capability", async () => {
    for (const kind of ["load", "resume"] satisfies ("load" | "resume")[]) {
      const fake = setup({ initialize: { protocolVersion: PROTOCOL_VERSION } });
      const opening = openAcpSession(fake.streams, { kind, cwd, sessionId }, handlers(), info);
      expect(opening).rejects.toThrow(`session/${kind}`);
      await opening.catch(() => undefined);
      expect(fake.received).toHaveLength(1);
    }
  });

  test("a wrong protocol version names both versions and disconnects", async () => {
    const wrongVersion = PROTOCOL_VERSION + PROTOCOL_VERSION;
    const fake = setup({ initialize: { protocolVersion: wrongVersion } });
    const opening = openAcpSession(fake.streams, { kind: "new", cwd }, handlers(), info);
    expect(opening).rejects.toThrow(
      `ACP protocol version ${wrongVersion} does not match client version ${PROTOCOL_VERSION}`,
    );
    await opening.catch(() => undefined);
    expect(fake.received).toHaveLength(1);
  });

  test("resume reads capabilities and the model selector from real response fields", async () => {
    const fake = setup();
    const session = await openAcpSession(fake.streams, { kind: "resume", cwd, sessionId }, handlers(), info);
    expect(session.offer).toEqual({ load: true, resume: true, close: true, modelOption: "model-selector" });
    expect(fake.received.at(-1)).toEqual({ method: methods.agent.session.resume, params: { cwd, sessionId, mcpServers: [] } });
    await session.setMode("plan");
    await session.setModel("next");
    expect(fake.received.slice(-2)).toEqual([
      { method: methods.agent.session.setMode, params: { sessionId, modeId: "plan" } },
      { method: methods.agent.session.setConfigOption, params: { sessionId, configId: "model-selector", value: "next" } },
    ]);
    await session.close();
  });

  test("no model selector rejects model changes; closing needs no close capability", async () => {
    const fake = setup({ configOptions: [], initialize: { protocolVersion: PROTOCOL_VERSION } });
    const session = await openAcpSession(fake.streams, { kind: "new", cwd }, handlers(), info);
    expect(session.offer).toEqual({ load: false, resume: false, close: false, modelOption: null });
    expect(session.setModel("next")).rejects.toThrow("model config option");
    await session.close();
    await session.ended;
    expect(fake.received.map((request) => request.method)).toEqual([methods.agent.initialize, methods.agent.session.new]);
  });
});

/** A thought-level option offering `values`, the first one selected. */
const effort = (values: readonly string[]) => ({
  id: "reasoning_effort", name: "Effort", category: "thought_level", type: "select" as const,
  currentValue: values[0] ?? "", options: values.map((value) => ({ value, name: value })),
});

const configCalls = (fake: ReturnType<typeof fakeAcpAgent>) =>
  fake.received.filter((request) => request.method === methods.agent.session.setConfigOption).map((request) => request.params);

describe("ACP session options", () => {
  test("a model the agent does not offer throws by name and sends nothing", async () => {
    const fake = setup();
    const session = await openAcpSession(fake.streams, { kind: "new", cwd }, handlers(), info);
    expect(session.setModel("gpt-other")).rejects.toThrow("Agent offers no model gpt-other; it offers first, next");
    await session.setModel("first");
    expect(configCalls(fake)).toEqual([]);
    await session.close();
  });

  test("a thinking level is selected when offered and skipped, with nothing sent, when not", async () => {
    const fake = setup({ configOptions: [modelSelector(["first"]), effort(["low", "high"])] });
    const session = await openAcpSession(fake.streams, { kind: "new", cwd }, handlers(), info);
    expect(await session.setThinking("off")).toBe(false);
    expect(await session.setThinking("high")).toBe(true);
    expect(configCalls(fake)).toEqual([{ sessionId, configId: "reasoning_effort", value: "high" }]);
    await session.close();
  });

  test("an agent with no thinking option takes no level", async () => {
    const fake = setup();
    const session = await openAcpSession(fake.streams, { kind: "new", cwd }, handlers(), info);
    expect(await session.setThinking("high")).toBe(false);
    expect(configCalls(fake)).toEqual([]);
    await session.close();
  });

  test("a config_option_update replaces the options the session selects from", async () => {
    const update: SessionUpdate = { sessionUpdate: "config_option_update", configOptions: [modelSelector(["first", "late"])] };
    const fake = setup({ turns: [turn({ updates: [update] })] });
    const session = await openAcpSession(fake.streams, { kind: "new", cwd }, handlers(), info);
    await session.prompt("hi");
    await session.setModel("late");
    expect(configCalls(fake)).toEqual([{ sessionId, configId: "model-selector", value: "late" }]);
    await session.close();
  });

  test("renew opens a fresh session, carries the selected model over, and closes the old one", async () => {
    const fake = setup();
    const session = await openAcpSession(fake.streams, { kind: "new", cwd }, handlers(), info);
    await session.setModel("next");
    expect(await session.renew()).toBe(`${sessionId}-2`);
    expect(session.sessionId).toBe(`${sessionId}-2`);
    expect(fake.received.slice(-3)).toEqual([
      { method: methods.agent.session.new, params: { cwd, mcpServers: [] } },
      { method: methods.agent.session.setConfigOption, params: { sessionId: `${sessionId}-2`, configId: "model-selector", value: "next" } },
      { method: methods.agent.session.close, params: { sessionId } },
    ]);
    await session.close();
  });
});
