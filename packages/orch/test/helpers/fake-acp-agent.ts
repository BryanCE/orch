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
import type { PipesProvider } from "../../src/types/pipes.ts";
import { fakePipes } from "./fake-pipes.ts";

/** A fake agent on the far end of the pipes orchd spawns. Its process id is this test's own
 *  pid, so orchd reads the held process as live, as a started harness is. */
export function acpProgram(agent: ReturnType<typeof fakeAcpAgent>) {
  const { provider, spawned } = fakePipes(() => process.pid);
  const pipes: PipesProvider = {
    spawn(request) {
      const child = provider.spawn(request);
      const far = spawned.at(-1);
      if (far === undefined) throw new Error("no pipes process was spawned");
      void far.fromOrchd.pipeTo(agent.streams.input);
      void agent.streams.output.pipeTo(far.toOrchd);
      return child;
    },
  };
  return { pipes, spawned };
}

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
  /** When set, `session/load` rejects with this message. */
  readonly loadError?: string;
}

/** Runs an SDK agent on in-memory byte streams. */
export function fakeAcpAgent(script: FakeAcpScript) {
  const toAgent = new TransformStream<Uint8Array, Uint8Array>();
  const toClient = new TransformStream<Uint8Array, Uint8Array>();
  const received: { method: string; params: unknown }[] = [];
  const permissions: { toolCallId: string; response: RequestPermissionResponse }[] = [];
  const turns = [...script.turns];
  let cancelTurn: (() => void) | null = null;
  // Each session starts on the script's options; setting one changes what the agent reports.
  let options: SessionConfigOption[] = structuredClone(script.configOptions);
  let sessions = 0;
  const record = (method: string, params: unknown) => received.push({ method, params });
  const app = agent();
  app.onRequest(methods.agent.initialize, ({ params }) => {
    record(methods.agent.initialize, params);
    return script.initialize;
  });
  app.onRequest(methods.agent.session.new, ({ params }) => {
    record(methods.agent.session.new, params);
    sessions += 1;
    options = structuredClone(script.configOptions);
    // The first session is the script's id; each fresh one after it is numbered.
    return { sessionId: sessions === 1 ? script.sessionId : `${script.sessionId}-${sessions}`, configOptions: options };
  });
  app.onRequest(methods.agent.session.load, async ({ params, client }) => {
    record(methods.agent.session.load, params);
    if (script.loadError !== undefined) throw new Error(script.loadError);
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
    options = options.map((option) => option.id === params.configId && option.type === "select" && typeof params.value === "string" ? { ...option, currentValue: params.value } : option);
    return { configOptions: options };
  });
  app.onRequest(methods.agent.session.close, ({ params }) => {
    record(methods.agent.session.close, params);
    return {};
  });
  const connection = app.connect(ndJsonStream(toClient.writable, toAgent.readable));
  const streams: AcpStreams = { input: toAgent.writable, output: toClient.readable };
  return { streams, received, permissions, connection };
}

/** A model selector offering `values`, the first one selected, as a binding reports it. */
export function modelSelector(values: readonly string[]): SessionConfigOption {
  const [first] = values;
  if (first === undefined) throw new Error("a model selector offers at least one model");
  return {
    id: "model-selector", name: "Model", category: "model", type: "select",
    currentValue: first, options: values.map((value) => ({ value, name: value })),
  };
}

/** The default script: a load-capable session with one model selector, replacing any field the overrides set. */
export function defaultFakeScript(overrides: Partial<FakeAcpScript> = {}): FakeAcpScript {
  return {
    initialize: {
      protocolVersion: PROTOCOL_VERSION,
      agentCapabilities: { loadSession: true, sessionCapabilities: { resume: {}, close: {} } },
    },
    sessionId: "test-session",
    configOptions: [modelSelector(["first", "next"])],
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
