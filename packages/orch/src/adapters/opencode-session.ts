// One agent's session on the shared opencode server (./opencode-server.ts): opening it, and the
// link orchd drives it through. The server form shows the session on orchd's own screen; the tui
// form shows it in opencode's terminal program attached to the same server. Either way orchd reads
// the turn from the session's events, so presence and every control are the same.
//
// After the server's event stream comes back from a gap, the session is caught up the way t3code's
// v2 adapter does: its latest messages say whether a turn ran or ended in the gap, the active
// sessions say whether one runs now, and its pending permission requests replace the open asks.
import { errorMessage, isRecord, sleep, textValue } from "../util.ts";
import { dataOf, recordAt, type OpencodeServer, type ServerEvent } from "./opencode-server.ts";
import { closedLinkError, type AgentLink } from "../control/agent-links.ts";
import { applyLinkModel } from "../control/link-model.ts";
import type { BridgeDelivery } from "../shared/bridge-message.ts";
import type { SessionViewEntry } from "../types/adapter.ts";
import type { JsonRecord } from "../types/core.ts";
import type { HeldSession, SessionLinkEvents, SessionOpen, SessionOpenContext, TurnOutcome } from "../types/held-session.ts";
import type { ThinkingLevel } from "../types/policy.ts";
import type { QuestionOption } from "../types/question.ts";

/** The replies orch offers for a permission ask, in opencode's reply vocabulary. */
const PERMISSION_OPTIONS: readonly QuestionOption[] = [
  { id: "once", label: "Allow once", kind: "allow-once" },
  { id: "always", label: "Always allow", kind: "allow-always" },
  { id: "reject", label: "Reject", kind: "reject-once" },
];

/** How an `idle` message closes a turn, in presence terms. */
const IDLE_OUTCOMES: Readonly<Record<string, TurnOutcome["state"]>> = { succeeded: "done", failed: "error", interrupted: "aborted" };

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


/** The records of a response's `data` list. */
function dataList(response: unknown): JsonRecord[] {
  return isRecord(response) && Array.isArray(response.data) ? response.data.filter(isRecord) : [];
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

/** The text an assistant message says, its text parts joined. */
function assistantText(message: JsonRecord): string {
  if (!Array.isArray(message.content)) return "";
  return message.content.flatMap((part) => isRecord(part) && part.type === "text" ? [textValue(part.text) ?? ""] : []).join("\n");
}

/** What a launch asks of the session: its model and thinking level, and the variables its tools
 *  run with. */
export interface SessionLaunch {
  readonly model: string | undefined;
  readonly thinking: ThinkingLevel | undefined;
  readonly env: Readonly<Record<string, string>>;
}

/** The model the launch asks for, with the thinking level as a variant when the model offers it. */
async function launchModel(server: OpencodeServer, spec: string, thinking: ThinkingLevel | undefined, context: SessionOpenContext): Promise<ModelRef> {
  const ref = parseModel(spec);
  const { server_ready_ms: waitMs, spawn_attach_poll_ms: pollMs } = context.settings.timeouts;
  // A cold server lists a partial catalogue at first (t3code's makeOpenCode2ModelLoader); read it
  // again until the model shows or the wait runs out.
  const deadline = Date.now() + waitMs;
  for (;;) {
    const models = dataList(await server.call("GET", "/api/model"));
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

function sessionPath(sessionId: string, suffix = ""): string {
  return `/api/session/${encodeURIComponent(sessionId)}${suffix}`;
}

/** Create the session, or check the recorded one exists, then put the launch's model and
 *  variables on it. Answers its id. */
export async function openSessionOn(server: OpencodeServer, open: SessionOpen, launch: SessionLaunch, context: SessionOpenContext): Promise<string> {
  const model = launch.model === undefined ? null : await launchModel(server, launch.model, launch.thinking, context);
  let sessionId: string;
  if (open.kind === "new") {
    const created = await server.call("POST", "/api/session", { location: { directory: open.cwd }, ...(model === null ? {} : { model }) });
    const id = textValue(dataOf(created, "session create").id);
    if (id === undefined) throw new Error("opencode created a session without an id");
    sessionId = id;
  } else {
    await server.call("GET", sessionPath(open.sessionId));
    sessionId = open.sessionId;
    if (model !== null) await server.call("POST", sessionPath(sessionId, "/model"), { model });
  }
  // The server is shared, so the agent's own variables reach its tools through its session.
  await server.call("PUT", sessionPath(sessionId, "/environment"), { variables: launch.env });
  return sessionId;
}

/** Shows a fresh session in the terminal program attached to the old one. */
export type TerminalFollow = (sessionId: string) => Promise<void>;

/** Drive an open session in `cwd` through a link. The session's events reach `events` until the
 *  link closes or the server is lost. A reset opens a fresh session on the model the agent runs
 *  now, with the launch's variables; `follow` then moves the attached terminal program to it. */
export function driveSession(server: OpencodeServer, openedId: string, cwd: string, launch: SessionLaunch, follow: TerminalFollow | null, events: SessionLinkEvents, context: SessionOpenContext): HeldSession {
  let current = launch;
  /** False until the session takes a prompt or runs a turn: an unused session is already fresh. */
  let used = false;
  const reportError = (error: unknown): void => { events.onError(error instanceof Error ? error : new Error(String(error))); };
  let sessionId = openedId;
  let running = false;
  let closed = false;
  /** Deliveries sent and not yet taken by a turn, oldest first, with the inbox id opencode gave each. */
  const pending: { readonly deliveryId: string; readonly inboxId: string }[] = [];
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
  const startTurn = (deliveryId: string): void => {
    used = true;
    running = true;
    turnText = "";
    turnMessage = null;
    events.onTurnStarted(deliveryId);
  };
  const endTurn = (outcome: TurnOutcome): void => {
    if (!running) return;
    running = false;
    dropAsks();
    events.onTurnEnded(outcome, turnText);
  };
  const ask = (request: JsonRecord): void => {
    const requestId = textValue(request.id);
    if (requestId === undefined || [...asks.values()].includes(requestId)) return;
    const resources = Array.isArray(request.resources) ? request.resources.flatMap((resource) => typeof resource === "string" ? [resource] : []) : [];
    const title = textValue(request.message) ?? `${textValue(request.action) ?? "permission"}: ${resources.join(", ")}`;
    asks.set(events.onAsk({ toolCallId: requestId, title, options: PERMISSION_OPTIONS }), requestId);
  };
  const settleAsk = (requestId: unknown): void => {
    for (const [questionId, held] of asks) {
      if (held !== requestId) continue;
      asks.delete(questionId);
      events.onAskDropped(questionId);
      if (asks.size === 0) events.onAsksSettled();
    }
  };

  /** Apply one event of the current session. */
  const onEvent = ({ type, data }: ServerEvent): void => {
    switch (type) {
      case "session.execution.started":
        startTurn(pending.shift()?.deliveryId ?? "");
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
      case "permission.asked":
        ask(data);
        return;
      case "permission.replied":
        // A reply orch did not send, from the terminal program, settles the ask here too.
        settleAsk(data.requestID);
        return;
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

  /** Read the session again after a gap in the stream: a turn that started or ended in the gap,
   *  and the permission requests that are open now. */
  const catchUp = async (): Promise<void> => {
    const id = sessionId;
    const limit = context.settings.servers.backfill_messages;
    const [listed, active, requested] = await Promise.all([
      server.call("GET", `${sessionPath(id, "/message")}?order=desc&limit=${String(limit)}`),
      server.call("GET", "/api/session/active"),
      server.call("GET", sessionPath(id, "/permission")),
    ]);
    if (closed || id !== sessionId) return;
    // Oldest first.
    const messages = dataList(listed).reverse();
    for (const message of messages) {
      const index = pending.findIndex((entry) => entry.inboxId === message.id);
      if (index < 0) continue;
      // The prompt was taken in the gap; the turn it started, if it started one, is read below.
      const [taken] = pending.splice(index, 1);
      if (!running && taken !== undefined) startTurn(taken.deliveryId);
    }
    const activeData = isRecord(active) ? active.data : undefined;
    const isActive = Array.isArray(activeData)
      ? activeData.some((session) => isRecord(session) && session.id === id)
      : isRecord(activeData) && Object.hasOwn(activeData, id);
    const lastOf = (type: string): number => {
      for (let index = messages.length - 1; index >= 0; index--) if (messages[index]?.type === type) return index;
      return -1;
    };
    const lastIdle = lastOf("idle");
    const lastUser = lastOf("user");
    if (running && !isActive && lastIdle > lastUser) {
      const idle = messages[lastIdle];
      const lastAssistant = messages.slice(0, lastIdle).reverse().find((message) => message.type === "assistant");
      if (lastAssistant !== undefined) {
        const text = assistantText(lastAssistant);
        if (text.length > 0 && text !== turnText) {
          turnText = text;
          emit([{ role: "assistant", text }]);
        }
      }
      const state = IDLE_OUTCOMES[textValue(idle?.outcome) ?? ""] ?? "done";
      endTurn({ state, error: state === "error" ? textValue(recordAt(idle, "error")?.message) ?? "opencode reported the turn failed" : null });
    } else if (!running && isActive) {
      startTurn(pending.shift()?.deliveryId ?? "");
    }
    const open = dataList(requested);
    const openIds = new Set(open.map((request) => request.id));
    for (const requestId of [...asks.values()]) if (!openIds.has(requestId)) settleAsk(requestId);
    for (const request of open) ask(request);
  };

  const stop = server.listen({
    event(event) {
      if (closed || event.data.sessionID !== sessionId) return;
      onEvent(event);
    },
    resync() {
      if (closed) return;
      void catchUp().catch((error: unknown) => { reportError(new Error(`opencode catch-up after a stream gap failed: ${errorMessage(error)}`)); });
    },
    lost(error) {
      if (closed) return;
      endTurn({ state: "error", error: error.message });
      reportError(error);
    },
  });

  const prompt = async (delivery: BridgeDelivery, text: string, mode: "queue" | "steer"): Promise<void> => {
    used = true;
    const sent = await server.call("POST", sessionPath(sessionId, "/prompt"), { text, delivery: mode });
    const inboxId = textValue(dataOf(sent, "prompt").id) ?? "";
    pending.push({ deliveryId: delivery.id, inboxId });
    emit([{ role: "user", text }]);
    events.onApplied(delivery.id);
  };

  const link: AgentLink = {
    takes: ["dispatch", "steer", "answer", "model"],
    push(delivery: BridgeDelivery) {
      if (closed) return reportError(closedLinkError("opencode", delivery));
      const { message } = delivery;
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
          void server.call("POST", sessionPath(sessionId, `/permission/${encodeURIComponent(requestId)}/reply`), { decision: message.optionId })
            .then(() => {
              events.onApplied(delivery.id);
              if (asks.size === 0) events.onAsksSettled();
            }, reportError);
          return;
        }
        case "model":
          applyLinkModel(delivery, message.model, async (bare, thinking) => {
            const next = { ...parseModel(bare), ...(thinking === undefined ? {} : { variant: variantName(thinking) }) };
            await server.call("POST", sessionPath(sessionId, "/model"), { model: next });
            current = { ...current, model: bare, thinking };
            return { model: bare, ...(thinking === undefined ? {} : { thinking }) };
          }, events);
          return;
        default: {
          const exhaustive: never = message;
          return exhaustive;
        }
      }
    },
    abort() {
      dropAsks();
      void server.call("POST", sessionPath(sessionId, "/interrupt")).catch((error: unknown) => { reportError(new Error(`opencode interrupt failed: ${errorMessage(error)}`)); });
    },
    async reset() {
      if (running) throw new Error("a turn is running; abort it before starting a new conversation");
      // A session that never took a prompt is already a fresh conversation.
      if (!used) {
        events.onReset(sessionId);
        return;
      }
      const next = await openSessionOn(server, { kind: "new", cwd }, current, context);
      if (follow !== null) await follow(next);
      pending.length = 0;
      dropAsks();
      sessionId = next;
      used = false;
      events.onReset(next);
    },
    close() {
      closed = true;
      pending.length = 0;
      dropAsks();
      stop();
    },
  };
  return {
    link,
    get sessionId() { return sessionId; },
    close: () => {
      link.close();
      return Promise.resolve();
    },
  };
}
