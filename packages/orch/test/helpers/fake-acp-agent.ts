import {
  agent,
  methods,
  ndJsonStream,
  PROTOCOL_VERSION,
  type InitializeResponse,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionConfigOption,
  type SessionUpdate,
  type StopReason,
} from "@agentclientprotocol/sdk";
import type { AcpStreams } from "../../src/acp/session.ts";

/** One scripted turn, with concurrent permission requests. */
export interface FakeAcpTurn {
  readonly updates: readonly SessionUpdate[];
  readonly permissions: readonly Omit<RequestPermissionRequest, "sessionId">[];
  readonly stopReason: StopReason;
  readonly waitForCancel?: boolean;
  readonly onStarted?: () => void;
}

/** Session capabilities, replay and turns for the fake agent. */
export interface FakeAcpScript {
  readonly initialize: InitializeResponse;
  readonly sessionId: string;
  readonly configOptions: SessionConfigOption[];
  readonly replay: readonly SessionUpdate[];
  readonly turns: readonly FakeAcpTurn[];
}

/** Runs an SDK agent on in-memory byte streams. */
export function fakeAcpAgent(script: FakeAcpScript) {
  const toAgent = new TransformStream<Uint8Array, Uint8Array>();
  const toClient = new TransformStream<Uint8Array, Uint8Array>();
  const received: { method: string; params: unknown }[] = [];
  const permissions: { toolCallId: string; response: RequestPermissionResponse }[] = [];
  const turns = [...script.turns];
  let cancelTurn: (() => void) | null = null;
  const record = (method: string, params: unknown) => received.push({ method, params });
  const app = agent();
  app.onRequest(methods.agent.initialize, ({ params }) => {
    record(methods.agent.initialize, params);
    return script.initialize;
  });
  app.onRequest(methods.agent.session.new, ({ params }) => {
    record(methods.agent.session.new, params);
    return { sessionId: script.sessionId, configOptions: script.configOptions };
  });
  app.onRequest(methods.agent.session.load, async ({ params, client }) => {
    record(methods.agent.session.load, params);
    for (const update of script.replay) {
      await client.notify(methods.client.session.update, { sessionId: params.sessionId, update });
    }
    return { configOptions: script.configOptions };
  });
  app.onRequest(methods.agent.session.resume, ({ params }) => {
    record(methods.agent.session.resume, params);
    return { configOptions: script.configOptions };
  });
  app.onRequest(methods.agent.session.prompt, async ({ params, client }) => {
    record(methods.agent.session.prompt, params);
    const turn = turns.shift();
    if (!turn) throw new Error("No scripted ACP turn remains");
    const cancelled = new Promise<void>((resolve) => { cancelTurn = resolve; });
    try {
      turn.onStarted?.();
      for (const update of turn.updates) {
        await client.notify(methods.client.session.update, { sessionId: params.sessionId, update });
      }
      await Promise.all(turn.permissions.map(async (ask) => {
        const response = await client.request(methods.client.session.requestPermission, {
          ...ask, sessionId: params.sessionId,
        });
        permissions.push({ toolCallId: ask.toolCall.toolCallId, response });
      }));
      if (turn.waitForCancel) await cancelled;
      return { stopReason: turn.stopReason };
    } finally {
      cancelTurn = null;
    }
  });
  app.onNotification(methods.agent.session.cancel, ({ params }) => {
    record(methods.agent.session.cancel, params);
    cancelTurn?.();
  });
  app.onRequest(methods.agent.session.setMode, ({ params }) => {
    record(methods.agent.session.setMode, params);
    return {};
  });
  app.onRequest(methods.agent.session.setConfigOption, ({ params }) => {
    record(methods.agent.session.setConfigOption, params);
    return { configOptions: script.configOptions };
  });
  app.onRequest(methods.agent.session.close, ({ params }) => {
    record(methods.agent.session.close, params);
    return {};
  });
  const connection = app.connect(ndJsonStream(toClient.writable, toAgent.readable));
  const streams: AcpStreams = { input: toAgent.writable, output: toClient.readable };
  return { streams, received, permissions, connection };
}

/** The default script: a load-capable session with one model selector, replacing any field the overrides set. */
export function defaultFakeScript(overrides: Partial<FakeAcpScript> = {}): FakeAcpScript {
  return {
    initialize: {
      protocolVersion: PROTOCOL_VERSION,
      agentCapabilities: { loadSession: true, sessionCapabilities: { resume: {}, close: {} } },
    },
    sessionId: "test-session",
    configOptions: [{
      id: "model-selector", name: "Model", category: "model", type: "select",
      currentValue: "first", options: [{ value: "first", name: "First" }, { value: "next", name: "Next" }],
    }],
    replay: [],
    turns: [],
    ...overrides,
  };
}

/** One agent message chunk carrying the given text. */
export function chunk(text: string): SessionUpdate {
  return { sessionUpdate: "agent_message_chunk", content: { type: "text", text } };
}

/** A permission request for one tool call, with an allow once, allow always, reject once and reject always option. */
export function permission(toolCallId: string): Omit<RequestPermissionRequest, "sessionId"> {
  return {
    toolCall: { toolCallId, title: `Run ${toolCallId}` },
    options: [
      { optionId: `${toolCallId}-once`, name: "Once", kind: "allow_once" },
      { optionId: `${toolCallId}-always`, name: "Always", kind: "allow_always" },
      { optionId: `${toolCallId}-reject`, name: "Reject", kind: "reject_once" },
      { optionId: `${toolCallId}-never`, name: "Never", kind: "reject_always" },
    ],
  };
}

/** A scripted turn with no updates or permissions that ends with end_turn, unless overridden. */
export function turn(overrides: Partial<FakeAcpTurn> = {}): FakeAcpTurn {
  return { updates: [], permissions: [], stopReason: "end_turn", ...overrides };
}
