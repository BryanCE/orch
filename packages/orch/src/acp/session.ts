import {
  client,
  methods,
  ndJsonStream,
  PROTOCOL_VERSION,
  type AgentRequestParamsByMethod,
  type InitializeResponse,
  type LoadSessionResponse,
  type NewSessionResponse,
  type PermissionOptionKind,
  type SessionNotification,
  type SessionUpdate,
  type StopReason,
} from "@agentclientprotocol/sdk";
import type { QuestionOption } from "../types/question.ts";

/** The agent process's stdin and stdout. */
export interface AcpStreams {
  readonly input: WritableStream<Uint8Array>;
  readonly output: ReadableStream<Uint8Array>;
}

/** How to open the conversation. `existing` loads the session when the agent offers load, else resumes it. */
export type AcpOpen =
  | { readonly kind: "new"; readonly cwd: string }
  | { readonly kind: "existing"; readonly cwd: string; readonly sessionId: string }
  | { readonly kind: "load"; readonly cwd: string; readonly sessionId: string }
  | { readonly kind: "resume"; readonly cwd: string; readonly sessionId: string };

/** A tool call waiting for permission. */
export interface AcpPermissionAsk {
  readonly toolCallId: string;
  readonly title: string;
  readonly options: readonly QuestionOption[];
}

/** Receives updates and answers independent permission requests. */
export interface AcpSessionHandlers {
  onUpdate(update: SessionUpdate): void;
  onPermission(ask: AcpPermissionAsk): Promise<string | null>;
  /** Called once, before a `session/load` request replays the whole conversation as updates. */
  onLoad?(): void;
}

/** What the agent said it supports. */
export interface AcpOffer {
  readonly load: boolean;
  readonly resume: boolean;
  readonly close: boolean;
  readonly modelOption: string | null;
}

/** Client identity sent during initialization. */
export interface AcpClientInfo {
  readonly name: string;
  readonly version: string;
}

/** One conversation on a live ACP connection. */
export interface AcpSession {
  readonly sessionId: string;
  readonly offer: AcpOffer;
  prompt(text: string): Promise<StopReason>;
  cancel(): Promise<void>;
  setMode(modeId: string): Promise<void>;
  setModel(value: string): Promise<void>;
  close(): Promise<void>;
  readonly ended: Promise<void>;
}

function optionKind(kind: PermissionOptionKind): QuestionOption["kind"] {
  switch (kind) {
    case "allow_once": return "allow-once";
    case "allow_always": return "allow-always";
    case "reject_once": return "reject-once";
    case "reject_always": return "reject-always";
  }
}

/** What an agent says about itself at initialization. */
export interface AcpAgentProbe {
  readonly name: string | null;
  readonly version: string | null;
  readonly protocolVersion: number;
  readonly load: boolean;
  readonly resume: boolean;
}

type AcpConnection = ReturnType<ReturnType<typeof client>["connect"]>;

/** Sends initialize and returns the agent's answer. Every ACP entry point shares this request. */
async function initializeAgent(connection: AcpConnection, info: AcpClientInfo): Promise<InitializeResponse> {
  const initializeParams = {
    protocolVersion: PROTOCOL_VERSION,
    clientInfo: info,
    clientCapabilities: {},
  } satisfies AgentRequestParamsByMethod[typeof methods.agent.initialize];
  return connection.agent.request(methods.agent.initialize, initializeParams);
}

/** Which ways to reopen a session the agent said it supports. */
function offeredSessions(initialized: InitializeResponse): { readonly load: boolean; readonly resume: boolean; readonly close: boolean } {
  const caps = initialized.agentCapabilities;
  return {
    load: caps?.loadSession === true,
    resume: caps?.sessionCapabilities?.resume != null,
    close: caps?.sessionCapabilities?.close != null,
  };
}

/** Connects, initializes, and reports who the agent is and which ways it reopens a session. Opens no session and ends the connection. */
export async function probeAcpAgent(streams: AcpStreams, info: AcpClientInfo): Promise<AcpAgentProbe> {
  const app = client({ name: info.name });
  const connection = app.connect(ndJsonStream(streams.input, streams.output));
  try {
    const initialized = await initializeAgent(connection, info);
    const { load, resume } = offeredSessions(initialized);
    return {
      name: initialized.agentInfo?.name ?? null,
      version: initialized.agentInfo?.version ?? null,
      protocolVersion: initialized.protocolVersion,
      load,
      resume,
    };
  } finally {
    connection.close();
    await connection.closed;
  }
}

/** Opens one session over the supplied process streams. */
export async function openAcpSession(
  streams: AcpStreams,
  open: AcpOpen,
  handlers: AcpSessionHandlers,
  info: AcpClientInfo,
): Promise<AcpSession> {
  let sessionId: string | null = open.kind === "new" ? null : open.sessionId;
  let earlyUpdates: SessionNotification[] = [];
  const asks = new Set<() => void>();
  const cancelAsks = () => {
    for (const cancel of asks) cancel();
  };
  const app = client({ name: info.name });
  app.onNotification(methods.client.session.update, ({ params }) => {
    if (sessionId === null) earlyUpdates.push(params);
    else if (params.sessionId === sessionId) handlers.onUpdate(params.update);
  });
  app.onRequest(methods.client.session.requestPermission, async ({ params }) => {
    if (sessionId !== null && params.sessionId !== sessionId) {
      return { outcome: { outcome: "cancelled" } };
    }
    let cancel: (() => void) | undefined;
    const cancelled = new Promise<null>((resolve) => {
      cancel = () => resolve(null);
      asks.add(cancel);
    });
    try {
      const answer = await Promise.race([
        cancelled,
        Promise.resolve().then(() => handlers.onPermission({
          toolCallId: params.toolCall.toolCallId,
          title: params.toolCall.title ?? params.toolCall.toolCallId,
          options: params.options.map((option) => ({
            id: option.optionId,
            label: option.name,
            kind: optionKind(option.kind),
          })),
        })),
      ]);
      return {
        outcome: answer === null
          ? { outcome: "cancelled" }
          : { outcome: "selected", optionId: answer },
      };
    } finally {
      if (cancel) asks.delete(cancel);
    }
  });
  const connection = app.connect(ndJsonStream(streams.input, streams.output));
  const ended = connection.closed.then(cancelAsks);
  try {
    const initialized = await initializeAgent(connection, info);
    if (initialized.protocolVersion !== PROTOCOL_VERSION) {
      throw new Error(`ACP protocol version ${initialized.protocolVersion} does not match client version ${PROTOCOL_VERSION}`);
    }
    const { load, resume, close } = offeredSessions(initialized);
    const mode = open.kind === "existing" ? (load ? "load" : "resume") : open.kind;
    if (open.kind === "existing" && !load && !resume) throw new Error("Agent offers neither session/load nor session/resume");
    if (mode === "load" && !load) throw new Error("Agent does not offer session/load");
    if (mode === "resume" && !resume) throw new Error("Agent does not offer session/resume");
    const params = { cwd: open.cwd, mcpServers: [] } satisfies AgentRequestParamsByMethod[typeof methods.agent.session.new];
    let response: LoadSessionResponse;
    if (open.kind === "new") {
      const created: NewSessionResponse = await connection.agent.request(methods.agent.session.new, params);
      sessionId = created.sessionId;
      response = created;
    } else {
      if (mode === "load") handlers.onLoad?.();
      response = await connection.agent.request(
        mode === "load" ? methods.agent.session.load : methods.agent.session.resume,
        { ...params, sessionId: open.sessionId },
      );
    }
    if (sessionId === null) throw new Error("Agent did not return a session id");
    const id = sessionId;
    for (const notification of earlyUpdates) {
      if (notification.sessionId === id) handlers.onUpdate(notification.update);
    }
    earlyUpdates = [];
    const offer: AcpOffer = {
      load,
      resume,
      close,
      modelOption: response.configOptions?.find((option) => option.category === "model")?.id ?? null,
    };
    let prompting = false;
    return {
      sessionId: id,
      offer,
      ended,
      prompt(text) {
        const pending = (async () => {
          if (prompting) throw new Error("An ACP prompt is already running");
          prompting = true;
          try {
            const result = await connection.agent.request(methods.agent.session.prompt, {
              sessionId: id,
              prompt: [{ type: "text", text }],
            });
            return result.stopReason;
          } finally {
            prompting = false;
          }
        })();
        void pending.catch(() => undefined);
        return pending;
      },
      async cancel() {
        cancelAsks();
        await connection.agent.notify(methods.agent.session.cancel, { sessionId: id });
      },
      async setMode(modeId) {
        await connection.agent.request(methods.agent.session.setMode, { sessionId: id, modeId });
      },
      async setModel(value) {
        if (offer.modelOption === null) throw new Error("Agent does not offer a model config option");
        await connection.agent.request(methods.agent.session.setConfigOption, {
          sessionId: id, configId: offer.modelOption, value,
        });
      },
      async close() {
        cancelAsks();
        try {
          if (offer.close) await connection.agent.request(methods.agent.session.close, { sessionId: id });
        } finally {
          connection.close();
          await ended;
        }
      },
    };
  } catch (error) {
    connection.close();
    await ended;
    throw error;
  }
}
