// opencode's own server, driven over its HTTP API and its event stream: the driver of opencode's
// `server` form. opencode's wire format lives in this module and nowhere else.
//
// Modelled on t3code's packages/provider-opencode/src/server/v2 (acp/findings/t3code-bindings.md):
// one private `opencode serve` per agent on a loopback port it picks, a generated password over
// HTTP Basic, the event stream subscribed before any session call, and turns read from
// `session.execution.*`. Checked against opencode 2.2.7's own /openapi.json.
import { randomBytes } from "node:crypto";
import { splitThinkingSuffix } from "../policy/thinking.ts";
import { errorMessage, isRecord, sleep, textValue } from "../util.ts";
import type { AgentLink } from "../control/agent-links.ts";
import type { BridgeDelivery } from "../shared/bridge-message.ts";
import type { SessionViewEntry } from "../types/adapter.ts";
import type { BackendSpawnOpts } from "../types/backend.ts";
import type { HeldSession, HeldSessionDriver, SessionLinkEvents, SessionOpen, SessionOpenContext, TurnOutcome } from "../types/held-session.ts";
import type { JsonRecord } from "../types/core.ts";
import type { PipesProcess } from "../types/pipes.ts";
import type { ThinkingLevel } from "../types/policy.ts";
import type { QuestionOption } from "../types/question.ts";

/** `opencode serve` on a loopback port the OS picks; it prints the URL it took. */
const SERVE_ARGV = ["opencode", "serve", "--hostname=127.0.0.1", "--port=0"] as const;
const LISTENING = /server listening on\s+(https?:\/\/\S+)/i;
/** opencode's HTTP Basic user is fixed; the password is the one the launch generated. */
const BASIC_USER = "opencode";

/** The replies orch offers for a permission ask, in opencode's reply vocabulary. */
const PERMISSION_OPTIONS: readonly QuestionOption[] = [
  { id: "once", label: "Allow once", kind: "allow-once" },
  { id: "always", label: "Always allow", kind: "allow-always" },
  { id: "reject", label: "Reject", kind: "reject-once" },
];

/** orch's thinking level as opencode names the variant: opencode calls no thinking `none`. */
function variantName(level: ThinkingLevel): string {
  return level === "off" ? "none" : level;
}

/** A model as opencode's API takes it. */
interface ModelRef {
  readonly providerID: string;
  readonly id: string;
  readonly variant?: string;
}

/** opencode names a model `provider/model`; the provider ends at the first slash. */
function parseModel(spec: string): ModelRef {
  const slash = spec.indexOf("/");
  if (slash <= 0 || slash === spec.length - 1) throw new Error(`opencode names a model provider/model; ${spec} is not one`);
  return { providerID: spec.slice(0, slash), id: spec.slice(slash + 1) };
}

function recordAt(value: unknown, key: string): JsonRecord | undefined {
  if (!isRecord(value)) return undefined;
  const inner = value[key];
  return isRecord(inner) ? inner : undefined;
}

/** One opencode server: where it listens and the credential it takes. */
interface OpencodeServer {
  readonly url: string;
  readonly authorization: string;
}

/** Call the server and answer its JSON body; a status other than 2xx throws with the body. */
async function call(server: OpencodeServer, method: string, path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`${server.url}${path}`, {
    method,
    headers: { authorization: server.authorization, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`opencode ${method} ${path} answered ${response.status}: ${text.slice(0, 300)}`);
  if (text.length === 0) return undefined;
  const parsed: unknown = JSON.parse(text);
  return parsed;
}

/** The `data` record of a response; a response without one throws. */
function dataOf(response: unknown, what: string): JsonRecord {
  const data = recordAt(response, "data");
  if (data === undefined) throw new Error(`opencode answered ${what} without data`);
  return data;
}

/** Read the server's stdout until it says where it listens; then keep draining it, so the
 *  server never blocks on a full pipe. Rejects when the process exits or the wait runs out. */
async function awaitListening(child: PipesProcess, timeoutMs: number): Promise<string> {
  const reader = child.output.getReader();
  const decoder = new TextDecoder();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const read = (async (): Promise<string> => {
    let buffered = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) throw new Error("opencode serve closed its output before it listened");
      buffered += decoder.decode(value, { stream: true });
      const url = LISTENING.exec(buffered)?.[1];
      if (url !== undefined) return url;
    }
  })();
  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { reject(new Error(`opencode serve did not say it is listening within ${timeoutMs} ms`)); }, timeoutMs);
  });
  const exited = child.exited.then((exit): never => {
    throw new Error(`opencode serve exited before it listened: code ${String(exit.code)}, signal ${String(exit.signal)}`);
  });
  // Whichever loses the race still settles later; none of them may surface as unhandled.
  for (const pending of [read, timedOut, exited]) pending.catch(() => undefined);
  try {
    return await Promise.race([read, timedOut, exited]);
  } finally {
    clearTimeout(timer);
    void (async () => {
      try {
        for (;;) if ((await reader.read()).done) return;
      } catch {
        // The process ended; there is nothing left to drain.
      }
    })();
  }
}

/** Each event the stream carries, until the stream ends or `signal` aborts it. */
async function* eventStream(server: OpencodeServer, signal: AbortSignal): AsyncGenerator<JsonRecord> {
  const response = await fetch(`${server.url}/api/event`, { headers: { authorization: server.authorization, accept: "text/event-stream" }, signal });
  if (!response.ok || response.body === null) throw new Error(`opencode GET /api/event answered ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  for (;;) {
    // fetch types its body loosely; a chunk is bytes or it is not read.
    const chunk: { readonly done: boolean; readonly value?: unknown } = await reader.read();
    if (chunk.done) return;
    if (!(chunk.value instanceof Uint8Array)) continue;
    buffered += decoder.decode(chunk.value, { stream: true });
    let newline = buffered.indexOf("\n");
    while (newline >= 0) {
      const line = buffered.slice(0, newline).trimEnd();
      buffered = buffered.slice(newline + 1);
      newline = buffered.indexOf("\n");
      if (!line.startsWith("data:")) continue;
      try {
        const event: unknown = JSON.parse(line.slice("data:".length).trim());
        if (isRecord(event)) yield event;
      } catch {
        // A frame that is not JSON carries nothing orch reads.
      }
    }
  }
}

/** The most descriptive argument of a tool call, as the session view shows it. */
function toolArgument(input: unknown): string {
  if (!isRecord(input)) return "";
  for (const key of ["command", "path", "filePath", "pattern", "url", "query"]) {
    const value = textValue(input[key]);
    if (value !== undefined) return value;
  }
  return JSON.stringify(input);
}

/** The text parts of a tool result. */
function toolText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content.flatMap((part) => isRecord(part) && part.type === "text" ? [textValue(part.text) ?? ""] : []).join("\n");
}

/** The model the launch asks for, with the thinking level as a variant when the model offers it. */
async function launchModel(server: OpencodeServer, spec: string, thinking: ThinkingLevel | undefined, context: SessionOpenContext): Promise<ModelRef> {
  const ref = parseModel(spec);
  const { server_ready_ms: waitMs, spawn_attach_poll_ms: pollMs } = context.settings.timeouts;
  // A cold server lists a partial catalogue at first (t3code's makeOpenCode2ModelLoader); read it
  // again until the model shows or the wait runs out.
  const deadline = Date.now() + waitMs;
  for (;;) {
    const response = await call(server, "GET", "/api/model");
    const models = isRecord(response) && Array.isArray(response.data) ? response.data.filter(isRecord) : [];
    const model = models.find((candidate) => candidate.providerID === ref.providerID && candidate.id === ref.id);
    if (model !== undefined) {
      if (thinking === undefined) return ref;
      const variants = Array.isArray(model.variants) ? model.variants.flatMap((variant) => isRecord(variant) && typeof variant.id === "string" ? [variant.id] : []) : [];
      const variant = variantName(thinking);
      if (variants.includes(variant)) return { ...ref, variant };
      context.logger.warn("opencode.thinking-not-offered", { model: spec, thinking, variants: variants.join(", ") });
      return ref;
    }
    if (Date.now() >= deadline) {
      const offered = models.map((candidate) => `${String(candidate.providerID)}/${String(candidate.id)}`);
      throw new Error(`opencode offers no model ${spec}; it offers ${offered.join(", ")}`);
    }
    await sleep(pollMs);
  }
}

/** Open the agent's session on a started server and the link orchd drives it through. */
async function openSession(child: PipesProcess, password: string, open: SessionOpen, opts: BackendSpawnOpts, events: SessionLinkEvents, context: SessionOpenContext): Promise<HeldSession> {
  const url = await awaitListening(child, context.settings.timeouts.server_ready_ms);
  const server: OpencodeServer = { url, authorization: `Basic ${Buffer.from(`${BASIC_USER}:${password}`, "utf8").toString("base64")}` };
  const reportError = (error: unknown): void => { events.onError(error instanceof Error ? error : new Error(String(error))); };

  let model: ModelRef | null = opts.model === undefined ? null : await launchModel(server, opts.model, opts.thinking, context);
  let sessionId: string | null = null;
  let running = false;
  let closed = false;
  /** Deliveries sent and not yet taken by a turn, oldest first, with the inbox id opencode gave each. */
  const pending: { readonly deliveryId: string; readonly inboxId: string }[] = [];
  let turnDelivery = "";
  let turnText = "";
  let turnMessage: string | null = null;
  const toolNames = new Map<string, string>();
  /** Open asks: orch's question id to opencode's request id. */
  const asks = new Map<string, string>();

  const emit = (entries: readonly SessionViewEntry[]): void => { if (entries.length > 0) events.onEntries(entries); };
  const dropAsks = (): void => {
    for (const questionId of asks.keys()) events.onAskDropped(questionId);
    asks.clear();
  };
  const endTurn = (outcome: TurnOutcome): void => {
    if (!running) return;
    running = false;
    dropAsks();
    events.onTurnEnded(outcome, turnText);
  };

  /** Apply one event of the current session. */
  const onEvent = (type: string, data: JsonRecord): void => {
    switch (type) {
      case "session.execution.started":
        running = true;
        turnText = "";
        turnMessage = null;
        turnDelivery = pending.shift()?.deliveryId ?? turnDelivery;
        events.onTurnStarted(turnDelivery);
        return;
      case "session.inbox.delivered": {
        // A steer taken into a running turn is no later turn's delivery.
        const index = pending.findIndex((entry) => entry.inboxId === data.inboxID);
        if (index >= 0) pending.splice(index, 1);
        return;
      }
      case "session.text.ended": {
        const text = textValue(data.text) ?? "";
        const message = textValue(data.assistantMessageID) ?? null;
        turnText = message !== null && message === turnMessage && turnText.length > 0 ? `${turnText}\n${text}` : text;
        turnMessage = message;
        emit([{ role: "assistant", text }]);
        return;
      }
      case "session.tool.input.started": {
        const id = textValue(data.id);
        const name = textValue(data.name);
        if (id !== undefined && name !== undefined) toolNames.set(id, name);
        return;
      }
      case "session.tool.called": {
        const name = toolNames.get(textValue(data.id) ?? "") ?? "tool";
        emit([{ role: "assistant", toolCalls: [{ name, arg: toolArgument(data.input) }] }]);
        return;
      }
      case "session.tool.success":
      case "session.tool.failed": {
        const id = textValue(data.id) ?? "";
        const name = toolNames.get(id) ?? "tool";
        toolNames.delete(id);
        const failed = type === "session.tool.failed";
        emit([{ role: "tool", tool: name, text: failed ? textValue(recordAt(data, "error")?.message) ?? "" : toolText(data.content), isError: failed }]);
        return;
      }
      case "permission.asked": {
        const requestId = textValue(data.id);
        if (requestId === undefined) return;
        const resources = Array.isArray(data.resources) ? data.resources.flatMap((resource) => typeof resource === "string" ? [resource] : []) : [];
        const title = textValue(data.message) ?? `${textValue(data.action) ?? "permission"}: ${resources.join(", ")}`;
        asks.set(events.onAsk({ toolCallId: requestId, title, options: PERMISSION_OPTIONS }), requestId);
        return;
      }
      case "permission.replied": {
        // A reply orch did not send, from another opencode client, settles the ask here too.
        for (const [questionId, requestId] of asks) {
          if (requestId !== data.requestID) continue;
          asks.delete(questionId);
          events.onAskDropped(questionId);
          if (asks.size === 0) events.onAsksSettled();
        }
        return;
      }
      case "session.execution.succeeded":
        endTurn({ state: "done", error: null });
        return;
      case "session.execution.failed":
        endTurn({ state: "error", error: textValue(recordAt(data, "error")?.message) ?? "opencode reported the turn failed" });
        return;
      case "session.execution.interrupted":
        endTurn({ state: "aborted", error: null });
        return;
      default:
        return;
    }
  };

  // The stream is volatile: subscribe before any session call, or the first events are lost.
  const subscription = new AbortController();
  const stream = eventStream(server, subscription.signal);
  const first = await stream.next();
  void (async () => {
    try {
      if (first.done !== true) {
        for (let next = await stream.next(); next.done !== true; next = await stream.next()) {
          const event = next.value;
          const data = recordAt(event, "data");
          if (data === undefined || sessionId === null || data.sessionID !== sessionId) continue;
          if (typeof event.type === "string") onEvent(event.type, data);
        }
      }
      if (!closed) reportError(new Error("opencode's event stream ended"));
    } catch (error: unknown) {
      if (!closed) reportError(error);
    }
  })();

  const createSession = async (): Promise<string> => {
    const created = await call(server, "POST", "/api/session", { location: { directory: open.cwd }, ...(model === null ? {} : { model }) });
    const id = textValue(dataOf(created, "session create").id);
    if (id === undefined) throw new Error("opencode created a session without an id");
    return id;
  };
  try {
    if (open.kind === "new") {
      sessionId = await createSession();
    } else {
      await call(server, "GET", `/api/session/${encodeURIComponent(open.sessionId)}`);
      sessionId = open.sessionId;
      if (model !== null) await call(server, "POST", `/api/session/${encodeURIComponent(sessionId)}/model`, { model });
    }
  } catch (error: unknown) {
    closed = true;
    subscription.abort();
    throw error;
  }
  const sessionPath = (suffix: string): string => {
    if (sessionId === null) throw new Error("opencode session is not open");
    return `/api/session/${encodeURIComponent(sessionId)}${suffix}`;
  };

  const prompt = async (delivery: BridgeDelivery, text: string, mode: "queue" | "steer"): Promise<void> => {
    const sent = await call(server, "POST", sessionPath("/prompt"), { text, delivery: mode });
    const inboxId = textValue(dataOf(sent, "prompt").id) ?? "";
    pending.push({ deliveryId: delivery.id, inboxId });
    emit([{ role: "user", text }]);
    events.onApplied(delivery.id);
  };

  const link: AgentLink = {
    takes: ["dispatch", "steer", "answer", "model"],
    push(delivery: BridgeDelivery) {
      if (closed) {
        reportError(new Error(`opencode link is closed: ${delivery.message.action} ${delivery.id} was not sent`));
        return;
      }
      const message = delivery.message;
      switch (message.action) {
        case "dispatch":
          void prompt(delivery, message.text, "queue").catch(reportError);
          return;
        case "steer":
          void prompt(delivery, message.text, "steer").catch(reportError);
          return;
        case "answer": {
          const requestId = asks.get(message.questionId);
          if (requestId === undefined || message.optionId === null) {
            reportError(new Error(`No open opencode permission for ${message.questionId}`));
            return;
          }
          asks.delete(message.questionId);
          void call(server, "POST", sessionPath(`/permission/${encodeURIComponent(requestId)}/reply`), { decision: message.optionId })
            .then(() => {
              events.onApplied(delivery.id);
              if (asks.size === 0) events.onAsksSettled();
            }, reportError);
          return;
        }
        case "model": {
          const { bare, thinking } = splitThinkingSuffix(message.model);
          const next = { ...parseModel(bare), ...(thinking === undefined ? {} : { variant: variantName(thinking) }) };
          void call(server, "POST", sessionPath("/model"), { model: next })
            .then(() => {
              model = next;
              events.onApplied(delivery.id);
            }, reportError);
          return;
        }
        default: {
          const exhaustive: never = message;
          return exhaustive;
        }
      }
    },
    abort() {
      dropAsks();
      void call(server, "POST", sessionPath("/interrupt")).catch((error: unknown) => { reportError(new Error(`opencode interrupt failed: ${errorMessage(error)}`)); });
    },
    async reset() {
      if (running) throw new Error("a turn is running; abort it before starting a new conversation");
      pending.length = 0;
      dropAsks();
      sessionId = await createSession();
      events.onReset(sessionId);
    },
    close() {
      closed = true;
      pending.length = 0;
      dropAsks();
      subscription.abort();
    },
  };
  return { link, sessionId };
}

/** The `server` form's driver for opencode. */
export const opencodeServerDriver: HeldSessionDriver = {
  // An opencode session lives in opencode's own store, which its TUI reads too.
  sharesSessions: true,
  launch(opts: BackendSpawnOpts) {
    const password = randomBytes(32).toString("base64url");
    return {
      argv: SERVE_ARGV,
      // opencode 2 prefers OPENCODE_PASSWORD and falls back to the V1 name; an inherited one must not win.
      env: { OPENCODE_PASSWORD: password, OPENCODE_SERVER_PASSWORD: password },
      open: (child, open, events, context) => openSession(child, password, open, opts, events, context),
    };
  },
  // A recorded session is a row in opencode's store; the server opens it by id.
  reopens: () => Promise.resolve(true),
};
