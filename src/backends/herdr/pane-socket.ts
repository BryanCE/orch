// herdr pane-state socket sender: one-shot JSON dials to the herdr daemon over
// its unix socket, with a two-timeout retry, an in-order state-send queue, and a
// retryable-provider-error classifier. The herdr method vocabulary
// (`pane.report_agent` etc.) lives here; the transport is the shared one-shot
// dialer in `src/presence/socket-client.ts` (node built-ins only).
import { requestJsonLine } from "../../presence/socket-client.ts";
import type { PaneHudContext } from "../hud.ts";

/** Working/blocked/idle — the single state herdr shows for this pane's agent. */
export type AgentState = "working" | "blocked" | "idle";

const RETRYABLE_ERROR_PATTERN =
  /overloaded|provider.?returned.?error|rate.?limit|too many requests|429|500|502|503|504|service.?unavailable|server.?error|internal.?error|network.?error|connection.?error|connection.?refused|connection.?lost|websocket.?closed|websocket.?error|other side closed|fetch failed|upstream.?connect|reset before headers|socket hang up|ended without|http2 request did not get a response|timed? out|timeout|terminated|retry delay/i;

interface MessageRecord {
  role?: unknown;
  stopReason?: unknown;
  errorMessage?: unknown;
}

function lastAssistantMessage(messages: unknown[]): MessageRecord | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (typeof message === "object" && message !== null && "role" in message) {
      const record = message as MessageRecord;
      if (record.role === "assistant") return record;
    }
  }
  return undefined;
}

/**
 * The provider error message an agent-end event should be held in `working` for,
 * or undefined when the last assistant turn did not stop on a retryable error.
 */
export function retryableErrorMessage(event: { messages?: unknown[] }): string | undefined {
  const messages = Array.isArray(event?.messages) ? event.messages : [];
  const assistant = lastAssistantMessage(messages);
  if (assistant?.stopReason !== "error") return undefined;
  const message = typeof assistant.errorMessage === "string"
    ? assistant.errorMessage
    : JSON.stringify(assistant.errorMessage ?? "") ?? "";
  if (!RETRYABLE_ERROR_PATTERN.test(message)) return undefined;
  return message || "retryable provider error";
}

export interface PaneSocketConfig {
  socketPath: string;
  paneId: string;
  source: string;
  agentId: string;
  extensionHash: string;
}

export interface PaneStateSocket {
  /** Latch the current session path/id off the harness context for later refs. */
  updateSessionRef(ctx: PaneHudContext): void;
  /** Tell herdr which agent session backs this pane (no-op without a ref). */
  reportSession(): Promise<void>;
  /** Hand herdr's full-lifecycle authority for this pane back on a real quit. */
  releaseAgent(): Promise<void>;
  /** Queue a state report; drains in seq order, one dial in flight at a time. */
  enqueueState: (state: AgentState, message?: string) => void;
}

export function createPaneStateSocket(config: PaneSocketConfig): PaneStateSocket {
  const { socketPath, paneId, source, agentId, extensionHash } = config;

  let reportSeq = Date.now() * 1000;
  let sessionId: string | undefined;
  let sessionPath: string | undefined;
  let sendInFlight = false;
  let queuedState: { state: AgentState; message?: string; seq: number } | undefined;

  function nextReportSeq(): number {
    reportSeq += 1;
    return reportSeq;
  }

  async function sendRequestAttempt(request: unknown, timeoutMs: number): Promise<boolean> {
    return (await requestJsonLine(socketPath, request, timeoutMs)) !== undefined;
  }

  async function sendRequest(request: unknown): Promise<void> {
    if (await sendRequestAttempt(request, 500)) return;
    await sendRequestAttempt(request, 1500);
  }

  function updateSessionRef(ctx: PaneHudContext): void {
    try {
      const file = ctx?.sessionManager?.getSessionFile?.();
      sessionPath = typeof file === "string" && file.startsWith("/") ? file : undefined;
    } catch {
      sessionPath = undefined;
    }
    try {
      const id = ctx?.sessionManager?.getSessionId?.();
      sessionId = typeof id === "string" && id.length > 0 ? id : undefined;
    } catch {
      sessionId = undefined;
    }
  }

  function sessionRef(): Record<string, unknown> | undefined {
    if (sessionPath) return { agent_session_path: sessionPath };
    if (sessionId) return { agent_session_id: sessionId };
    return undefined;
  }

  function reportSession(): Promise<void> {
    const ref = sessionRef();
    if (!ref) return Promise.resolve();
    return sendRequest({
      id: `${source}:session:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      method: "pane.report_agent_session",
      params: { pane_id: paneId, source, agent: agentId, seq: nextReportSeq(), ...ref },
    });
  }

  function sendState(state: AgentState, message: string | undefined, seq: number): Promise<void> {
    return sendRequest({
      id: `${source}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      method: "pane.report_agent",
      params: {
        pane_id: paneId,
        source,
        agent: agentId,
        state,
        message,
        extensionHash,
        seq,
        ...(sessionRef() ?? {}),
      },
    });
  }

  function releaseAgent(): Promise<void> {
    return sendRequest({
      id: `${source}:release:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      method: "pane.release_agent",
      params: { pane_id: paneId, source, agent: agentId, seq: nextReportSeq() },
    });
  }

  async function drainStateQueue(): Promise<void> {
    if (sendInFlight) return;
    sendInFlight = true;
    try {
      while (queuedState) {
        const next = queuedState;
        queuedState = undefined;
        await sendState(next.state, next.message, next.seq);
      }
    } finally {
      sendInFlight = false;
      if (queuedState) void drainStateQueue();
    }
  }

  function enqueueState(state: AgentState, message?: string): void {
    queuedState = { state, message, seq: nextReportSeq() };
    if (!sendInFlight) void drainStateQueue();
  }

  return { updateSessionRef, reportSession, releaseAgent, enqueueState };
}
