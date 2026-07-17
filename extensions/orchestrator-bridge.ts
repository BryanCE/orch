// orchestrator-bridge — per-agent control plane for the Claude orchestrator.
//
// Writes $ORCH_DIR/agents/<KEY>/ (default ~/.orch) where <KEY> = ORCH_AGENT_KEY
// (e.g. "herdr~wD~p2") for orch agents, or "session-<pid>" for the
// owner's interactive TUI pane:
//   status.json  — state / model / thinking / tokens / cost / currentFile / lastText
//   result.json  — final assistant text of the last settled run
//   inbox.jsonl  — APPEND a JSON line {"text":"..."} to steer this agent mid-run
//   ack.jsonl    — APPEND {"id":...,"ts":...} per consumed inbox line that carries
//                  a message id, so the daemon marks that outbox row delivered once
//
// Read by the `orch` CLI. Inert failures: every write is best-effort.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection } from "node:net";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { checkWall, scopeToWorkspace, workspaceOf } from "../src/policy/workspace.ts";
import { allowedModelPatterns, loadConfig } from "../src/config.ts";
import { acquireCommandLock, matchesLockedCommand, releaseCommandLock, type CommandLock } from "../src/cmd-lock.ts";
import { serializeIdentity, tryParseIdentity } from "../src/backends/identity.ts";
import { PRESENCE_SCHEMA } from "../src/presence-schema.ts";

// The digest must stay byte-identical to computeCodeHash in src/daemon/lifecycle.ts; doctor compares the two.
function hashExtensionFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 12);
}

const EXTENSION_HASH = hashExtensionFile(fileURLToPath(import.meta.url));

const ORCH_DIR = process.env.ORCH_DIR ?? path.join(os.homedir(), ".orch");
const PRESENCE_ROOT = path.join(ORCH_DIR, "agents");
const AGENT_ID = "pi";

type JsonRecord = Record<string, unknown>;
type ResolvedModel = NonNullable<ExtensionContext["model"]>;
type ThinkingLevel = Parameters<ExtensionAPI["setThinkingLevel"]>[0];

interface TextBlockLike {
  type: unknown;
  text: string;
}

interface HerdrEntityLike {
  pane_id?: unknown;
  tab_id?: unknown;
  label?: unknown;
}

interface UsageLike {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  cost?: { total?: number };
}

interface AssistantMessageLike {
  role: string;
  content: unknown;
  usage?: UsageLike;
  stopReason?: string;
  errorMessage?: string;
}

interface ModelSelectEventLike {
  model: unknown;
}

interface ThinkingLevelSelectEventLike {
  level: unknown;
}

interface BeforeAgentStartEventLike {
  prompt: unknown;
}

interface MessageEndEventLike {
  message: unknown;
}

interface AgentEndEventLike {
  messages: unknown;
}

interface ToolExecutionStartEventLike {
  toolCallId?: unknown;
  toolName: unknown;
  args: unknown;
}

interface ToolExecutionEndEventLike {
  toolCallId?: unknown;
  toolName: unknown;
}

interface HerdrBlockedEventLike {
  active: boolean;
  label?: string;
}

interface ControlCommand {
  cmd: string;
  model?: unknown;
  level?: unknown;
}

interface OrchAskParams {
  question: string;
}

interface OrchSendParams {
  target: string;
  text: string;
  cross_workspace?: boolean;
  allWorkspaces?: boolean;
}

interface OrchReadParams {
  target: string;
  cross_workspace?: boolean;
  allWorkspaces?: boolean;
}

interface OrchAgentsParams {
  all_workspaces?: boolean;
  allWorkspaces?: boolean;
}

interface Peer {
  key: string;
  dir: string;
  status: JsonRecord;
}

interface PeerSummary {
  key: string;
  workspace: string | null;
  state: string;
  model?: string;
  task?: string;
  lastText: string;
  cost?: number;
  updatedAt?: string;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isTextBlock(value: unknown): value is TextBlockLike {
  return isRecord(value) && value.type === "text" && typeof value.text === "string";
}

function isUsageLike(value: unknown): value is UsageLike {
  if (!isRecord(value)) return false;
  if (value.input !== undefined && typeof value.input !== "number") return false;
  if (value.output !== undefined && typeof value.output !== "number") return false;
  if (value.cacheRead !== undefined && typeof value.cacheRead !== "number") return false;
  if (value.cacheWrite !== undefined && typeof value.cacheWrite !== "number") return false;
  if (value.cost === undefined) return true;
  return isRecord(value.cost)
    && (value.cost.total === undefined || typeof value.cost.total === "number");
}

function isAssistantMessageLike(value: unknown): value is AssistantMessageLike {
  if (!isRecord(value) || value.role !== "assistant" || !("content" in value)) return false;
  if (value.usage !== undefined && !isUsageLike(value.usage)) return false;
  if (value.stopReason !== undefined && typeof value.stopReason !== "string") return false;
  return value.errorMessage === undefined || typeof value.errorMessage === "string";
}

function isControlCommand(value: unknown): value is ControlCommand {
  return isRecord(value) && typeof value.cmd === "string";
}

function isThinkingLevel(value: unknown): value is ThinkingLevel {
  return value === "off" || value === "minimal" || value === "low" || value === "medium"
    || value === "high" || value === "xhigh" || value === "max";
}

function isModelSelectEvent(value: unknown): value is ModelSelectEventLike {
  return isRecord(value) && "model" in value;
}

function isThinkingLevelSelectEvent(value: unknown): value is ThinkingLevelSelectEventLike {
  return isRecord(value) && "level" in value;
}

function isBeforeAgentStartEvent(value: unknown): value is BeforeAgentStartEventLike {
  return isRecord(value) && "prompt" in value;
}

function isMessageEndEvent(value: unknown): value is MessageEndEventLike {
  return isRecord(value) && "message" in value;
}

function isAgentEndEvent(value: unknown): value is AgentEndEventLike {
  return isRecord(value) && "messages" in value;
}

function isToolExecutionStartEvent(value: unknown): value is ToolExecutionStartEventLike {
  return isRecord(value) && "toolName" in value && "args" in value;
}

function isToolExecutionEndEvent(value: unknown): value is ToolExecutionEndEventLike {
  return isRecord(value) && "toolName" in value;
}

function isHerdrBlockedEvent(value: unknown): value is HerdrBlockedEventLike {
  return isRecord(value)
    && typeof value.active === "boolean"
    && (value.label === undefined || typeof value.label === "string");
}

// Orch-spawned agents use their opaque identity key. The owner's interactive
// pane has a local pid key when no orch key is present; otherwise skip presence.
function computeKey(hasUI: boolean): string | undefined {
  const rawKey = process.env.ORCH_AGENT_KEY;
  if (rawKey) {
    const identity = tryParseIdentity(rawKey);
    return identity ? serializeIdentity(identity) : undefined;
  }
  if (hasUI && process.pid > 0) return `session-${process.pid}`;
  return undefined;
}

// src/backends/identity.ts is the single escaping authority: every serialized
// identity key segment is already percent-escaped on all platforms, so the
// presence directory name IS the key — no remapping (see src/store.ts).
function presenceDirectoryName(key: string): string {
  return key;
}

function presenceKeyFromDirectoryName(name: string): string {
  return name;
}

function presenceAgentDir(key: string): string {
  return path.join(PRESENCE_ROOT, presenceDirectoryName(key));
}

const LAST_TEXT_MAX = 400;
const TASK_MAX = 200;
const HEARTBEAT_MS = 3000;
const INBOX_POLL_MS = 1000;
const HERDR_ENV = process.env.HERDR_ENV;
const HERDR_SOCKET_PATH = process.env.HERDR_SOCKET_PATH;
const AGENT_IDENTITY = tryParseIdentity(process.env.ORCH_AGENT_KEY);
const HERDR_INTEGRATION_ACTIVE =
  HERDR_ENV === "1" && !!HERDR_SOCKET_PATH && AGENT_IDENTITY?.backend === "herdr";
const HERDR_METADATA_SOURCE = "orch:bridge";
const CUSTOM_STATUS_MAX = 32;
let metadataSeq = Date.now() * 1000;

function nextMetadataSeq(): number {
  metadataSeq += 1;
  return metadataSeq;
}

function sendHerdrMetadata(customStatus: string): void {
  if (HERDR_ENV !== "1" || !HERDR_SOCKET_PATH || AGENT_IDENTITY?.backend !== "herdr") return;

  try {
    const request = {
      id: `${HERDR_METADATA_SOURCE}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      method: "pane.report_metadata",
      params: {
        pane_id: AGENT_IDENTITY.handle,
        source: HERDR_METADATA_SOURCE,
        custom_status: customStatus,
        seq: nextMetadataSeq(),
      },
    };
    let done = false;
    const socket = createConnection(HERDR_SOCKET_PATH);
    const finish = () => {
      if (done) return;
      done = true;
      socket.destroy();
    };

    socket.on("error", finish);
    socket.on("connect", () => socket.write(`${JSON.stringify(request)}\n`));
    socket.on("data", finish);
    socket.on("end", finish);
    const timeout = setTimeout(finish, 500);
    timeout.unref?.();
  } catch {
    // best-effort
  }
}

interface BridgeNotifyEvent {
  key: string;
  workspace?: string;
  agent: string | null;
  tab: string | null;
  model: string | null;
  oldState: string;
  newState: string;
  task?: string;
  cost?: number;
  ts: string;
  lastError?: string;
}

const BRIDGE_WORKSPACE_COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#9333ea", "#0891b2", "#db2777", "#4f46e5"] as const;
const BRIDGE_WORKSPACE_ANSI = [34, 32, 33, 31, 35, 36, 35, 34] as const;

function bridgeWorkspace(event: BridgeNotifyEvent): string {
  return event.workspace ?? workspaceOf(event.key) ?? event.key.split(":", 1)[0]!;
}

function bridgeWorkspaceColor(workspace: string): string {
  let hash = 2166136261;
  for (let index = 0; index < workspace.length; index++) {
    hash ^= workspace.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return BRIDGE_WORKSPACE_COLORS[(hash >>> 0) % BRIDGE_WORKSPACE_COLORS.length]!;
}

function bridgeOneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Standalone copy of src/notify.ts's canonical outcome-first formatter. */
function bridgeNotificationText(event: BridgeNotifyEvent): { title: string; body: string } {
  const workspace = bridgeWorkspace(event);
  const agent = event.agent ?? event.key;
  const state = bridgeOneLine(event.newState || "unknown").toUpperCase();
  let summary = event.task ?? "state changed";
  if (event.newState === "error") summary = event.lastError ?? event.task ?? "agent error";
  else if (event.newState === "blocked") summary = event.task ?? "agent needs input";
  summary = bridgeOneLine(summary).replace(/^Q:\s*/i, "").slice(0, 60);
  const workspaceLabel = `[${workspace}]`;
  const colorIndex = (() => {
    let hash = 2166136261;
    for (let index = 0; index < workspace.length; index++) {
      hash ^= workspace.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % BRIDGE_WORKSPACE_ANSI.length;
  })();
  const coloredWorkspace = `\u001b[${BRIDGE_WORKSPACE_ANSI[colorIndex]!}m${workspaceLabel}\u001b[0m`;
  const title = `${state} ${coloredWorkspace} ${agent}: ${summary}`;
  const details: string[] = [title, `Workspace: ${workspace} (${bridgeWorkspaceColor(workspace)})`];
  if (event.tab) details.push(`Tab: ${event.tab}`);
  if (event.model) details.push(`Model: ${event.model}`);
  if (event.task && event.newState !== "blocked") details.push(`Task: ${bridgeOneLine(event.task)}`);
  if (event.lastError && event.newState !== "error") details.push(`Error: ${bridgeOneLine(event.lastError)}`);
  if (typeof event.cost === "number") details.push(`Cost: $${event.cost.toFixed(2)}`);
  return { title, body: details.join("\n") };
}

function notifyHerdr(event: BridgeNotifyEvent): void {
  const { title, body } = bridgeNotificationText(event);
  try {
    execFile("herdr", ["notification", "show", title, "--body", body, "--sound", "request", "--position", "bottom-left"], () => {
      /* noop */
    });
  } catch {
    // best-effort
  }
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!isUnknownArray(content)) return "";
  return content.filter(isTextBlock).map((block) => block.text).join("\n");
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function atomicWrite(file: string, data: unknown): void {
  try {
    const tmp = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
  } catch {
    // best-effort
  }
}

// ---- herdr pane-state reporting (absorbed from the retired herdr-agent-state extension) ----
// Reports working/blocked/idle to herdr's pane HUD over the herdr socket, with
// idle debounce and a retry-grace hold for retryable provider errors.
function registerHerdrPaneState(pi: ExtensionAPI): void {
  if (HERDR_ENV !== "1" || !HERDR_SOCKET_PATH || AGENT_IDENTITY?.backend !== "herdr") return;

  const source = "herdr:pi";
  type AgentState = "working" | "blocked" | "idle";

  function parseDurationEnv(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  const idleDebounceMs = parseDurationEnv("HERDR_PI_IDLE_DEBOUNCE_MS", 250);
  const retryGraceMs = parseDurationEnv("HERDR_PI_RETRY_GRACE_MS", 2500);
  const retryableErrorPattern =
    /overloaded|provider.?returned.?error|rate.?limit|too many requests|429|500|502|503|504|service.?unavailable|server.?error|internal.?error|network.?error|connection.?error|connection.?refused|connection.?lost|websocket.?closed|websocket.?error|other side closed|fetch failed|upstream.?connect|reset before headers|socket hang up|ended without|http2 request did not get a response|timed? out|timeout|terminated|retry delay/i;

  let reportSeq = Date.now() * 1000;
  let sessionId: string | undefined;
  let sessionPath: string | undefined;
  let sendInFlight = false;
  let queuedState: { state: AgentState; message?: string; seq: number } | undefined;

  function nextReportSeq(): number {
    reportSeq += 1;
    return reportSeq;
  }

  function sendRequestAttempt(request: unknown, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      let done = false;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const finish = (delivered: boolean) => {
        if (done) return;
        done = true;
        if (timeout) clearTimeout(timeout);
        socket.destroy();
        resolve(delivered);
      };
      const socket = createConnection(HERDR_SOCKET_PATH!);
      socket.on("error", () => finish(false));
      socket.on("connect", () => socket.write(`${JSON.stringify(request)}\n`));
      socket.on("data", () => finish(true));
      socket.on("end", () => finish(true));
      timeout = setTimeout(() => finish(false), timeoutMs);
      timeout.unref?.();
    });
  }

  async function sendRequest(request: unknown): Promise<void> {
    if (await sendRequestAttempt(request, 500)) return;
    await sendRequestAttempt(request, 1500);
  }

  function updateSessionRef(ctx: ExtensionContext): void {
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
      params: { pane_id: AGENT_IDENTITY?.handle, source, agent: AGENT_ID, seq: nextReportSeq(), ...ref },
    });
  }

  function sendState(state: AgentState, message: string | undefined, seq: number): Promise<void> {
    return sendRequest({
      id: `${source}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      method: "pane.report_agent",
      params: {
        pane_id: AGENT_IDENTITY?.handle,
        source,
        agent: AGENT_ID,
        state,
        message,
        extensionHash: EXTENSION_HASH,
        seq,
        ...(sessionRef() ?? {}),
      },
    });
  }

  function releaseAgent(): Promise<void> {
    return sendRequest({
      id: `${source}:release:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      method: "pane.release_agent",
      params: { pane_id: AGENT_IDENTITY?.handle, source, agent: AGENT_ID, seq: nextReportSeq() },
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

  function queueState(state: AgentState, message?: string): void {
    queuedState = { state, message, seq: nextReportSeq() };
    if (!sendInFlight) void drainStateQueue();
  }

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

  function retryableErrorMessage(event: { messages?: unknown[] }): string | undefined {
    const messages = Array.isArray(event?.messages) ? event.messages : [];
    const assistant = lastAssistantMessage(messages);
    if (assistant?.stopReason !== "error") return undefined;
    const message = typeof assistant.errorMessage === "string"
      ? assistant.errorMessage
      : JSON.stringify(assistant.errorMessage ?? "") ?? "";
    if (!retryableErrorPattern.test(message)) return undefined;
    return message || "retryable provider error";
  }

  let agentActive = false;
  let retryHoldActive = false;
  let failureBlocked = false;
  let failureMessage: string | undefined;
  let blockedCount = 0;
  let blockedMessage: string | undefined;
  let lastState: AgentState | undefined;
  let lastMessage: string | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let rootSession = false;

  function clearPendingTimers() {
    if (idleTimer) clearTimeout(idleTimer);
    if (retryTimer) clearTimeout(retryTimer);
    idleTimer = undefined;
    retryTimer = undefined;
  }

  function clearFailureState() {
    retryHoldActive = false;
    failureBlocked = false;
    failureMessage = undefined;
  }

  function desiredState(): { state: AgentState; message?: string } {
    if (blockedCount > 0) return { state: "blocked", message: blockedMessage };
    if (failureBlocked) return { state: "blocked", message: failureMessage };
    if (agentActive || retryHoldActive) return { state: "working" };
    return { state: "idle" };
  }

  function publishState(force = false) {
    const next = desiredState();
    if (!force && next.state === lastState && next.message === lastMessage) return;
    lastState = next.state;
    lastMessage = next.message;
    queueState(next.state, next.message);
  }

  function scheduleIdle() {
    clearPendingTimers();
    clearFailureState();
    idleTimer = setTimeout(() => {
      idleTimer = undefined;
      publishState();
    }, idleDebounceMs);
    idleTimer.unref?.();
  }

  function holdForRetry(message: string) {
    clearPendingTimers();
    retryHoldActive = true;
    failureBlocked = false;
    failureMessage = message;
    publishState();
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      retryHoldActive = false;
      failureBlocked = true;
      publishState();
    }, retryGraceMs);
    retryTimer.unref?.();
  }

  pi.events.on("herdr:blocked", (data: unknown) => {
    if (!rootSession || !isHerdrBlockedEvent(data)) return;
    if (!data.active) {
      blockedCount = Math.max(0, blockedCount - 1);
      if (blockedCount === 0) blockedMessage = undefined;
      publishState();
      return;
    }
    clearPendingTimers();
    blockedCount += 1;
    blockedMessage = typeof data.label === "string" ? data.label : undefined;
    publishState();
  });

  pi.on("session_start", (_event, ctx: ExtensionContext) => {
    if (ctx?.hasUI !== true) return;
    rootSession = true;
    updateSessionRef(ctx);
    void reportSession();
    // A reload can replace this extension mid-run without emitting another agent_start.
    try {
      agentActive = ctx?.isIdle?.() === false;
    } catch {
      agentActive = false;
    }
    publishState(true);
  });

  pi.on("agent_start", (_event, ctx) => {
    if (!rootSession) return;
    updateSessionRef(ctx);
    void reportSession();
    clearPendingTimers();
    clearFailureState();
    agentActive = true;
    publishState();
  });

  pi.on("agent_end", (event) => {
    if (!rootSession) return;
    // Pi can emit duplicate/late end events while auto-retry is already holding
    // the pane in Working; an unqualified duplicate end must not publish a false Idle.
    if (!agentActive) return;
    agentActive = false;
    const retryableMessage = retryableErrorMessage(event);
    if (retryableMessage) {
      holdForRetry(retryableMessage);
      return;
    }
    scheduleIdle();
  });

  pi.on("session_shutdown", async (event: { reason?: string }) => {
    if (!rootSession) return;
    clearPendingTimers();
    // Pi tears down extension runtimes for /reload, /new, /resume, /fork; only a
    // real quit should release herdr's full-lifecycle authority for this pane.
    if (event?.reason === "quit") await releaseAgent();
  });
}

function orchestratorBridgeExtension(pi: ExtensionAPI): void {
  registerHerdrPaneState(pi);
  let dir: string | undefined;
  let statusFile = "";
  let resultFile = "";
  let inboxFile = "";
  let controlFile = "";
  let ackFile = "";

  let lastCtx: ExtensionContext | undefined;
  const state = {
    schema: PRESENCE_SCHEMA,
    agent: AGENT_ID,
    key: "",
    paneId: AGENT_IDENTITY?.backend === "herdr" ? AGENT_IDENTITY.handle : null,
    label: null as string | null,
    tabLabel: null as string | null,
    pid: process.pid,
    cwd: process.cwd(),
    state: "idle" as "idle" | "working" | "blocked" | "done" | "exited" | "error" | "aborted",
    lastError: undefined as string | undefined,
    model: undefined as { provider: string; id: string } | undefined,
    thinking: undefined as string | undefined,
    lastTool: undefined as string | undefined,
    task: undefined as string | undefined,
    lastText: undefined as string | undefined,
    currentFile: undefined as string | undefined,
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    cost: 0,
    context: undefined as { tokens: number; percent?: number } | undefined,
    turns: 0,
    sessionPath: undefined as string | undefined,
    sessionId: undefined as string | undefined,
    startedAt: undefined as string | undefined,
    finishedAt: undefined as string | undefined,
    updatedAt: new Date().toISOString(),
    steersReceived: 0,
    pendingHandoff: undefined as string | undefined,
    handoffError: undefined as string | undefined,
    asking: undefined as { question: string; id: string; ts: string } | undefined,
  };
  let lastFullText: string | undefined;
  let runFullText: string | undefined;
  let pendingHandoff: { target: string; note?: string } | undefined;
  let askingPreviousState: typeof state.state | undefined;
  let blockedCount = 0;
  let blockedMessage: string | undefined;
  let blockedNotified = false;
  let lastCustomStatus: string | undefined;

  function metadataEnabledForState(): boolean {
    return (
      HERDR_INTEGRATION_ACTIVE &&
      state.paneId === AGENT_IDENTITY?.handle
    );
  }

  function currentCustomStatus(): string | undefined {
    if (state.state === "working" && state.task) {
      return truncate(state.task, CUSTOM_STATUS_MAX).slice(0, CUSTOM_STATUS_MAX);
    }
    if ((state.state === "done" || state.state === "idle") && state.cost > 0) {
      return `$${state.cost.toFixed(2)}`;
    }
    return undefined;
  }

  function reportHerdrMetadata() {
    if (!metadataEnabledForState()) return;
    const customStatus = currentCustomStatus();
    if (!customStatus || customStatus === lastCustomStatus) return;
    lastCustomStatus = customStatus;
    sendHerdrMetadata(customStatus);
  }

  function writeStatus() {
    if (!dir) return;
    state.updatedAt = new Date().toISOString();
    const identity = tryParseIdentity(state.key);
    const out: JsonRecord = {
      ...state,
      extensionHash: EXTENSION_HASH,
      key: state.key,
      ...(identity ? {
        backend: identity.backend,
        workspace: identity.workspace,
        handle: identity.handle,
      } : {}),
    };
    if (blockedCount > 0) {
      out.state = "blocked";
      out.blockedMessage = blockedMessage;
    }
    atomicWrite(statusFile, out);
    reportHerdrMetadata();
  }

  function runHerdrJson(args: string[]): Promise<unknown> {
    return new Promise((resolve) => {
      try {
        execFile("herdr", args, { timeout: 2000 }, (_error, stdout) => {
          try {
            resolve(JSON.parse(String(stdout)) as unknown);
          } catch {
            resolve(undefined);
          }
        });
      } catch {
        resolve(undefined);
      }
    });
  }

  function herdrCollection(output: unknown, name: string): unknown {
    if (!isRecord(output)) return undefined;
    const result = output.result;
    return isRecord(result) && result[name] !== undefined ? result[name] : output[name];
  }

  function isHerdrEntity(value: unknown): value is HerdrEntityLike {
    return isRecord(value)
      && (value.pane_id === undefined || typeof value.pane_id === "string")
      && (value.tab_id === undefined || typeof value.tab_id === "string")
      && (value.label === undefined || typeof value.label === "string");
  }

  function findHerdrPane(panes: unknown): HerdrEntityLike | undefined {
    if (!isUnknownArray(panes)) return undefined;
    return panes.find((candidate: unknown): candidate is HerdrEntityLike =>
      isHerdrEntity(candidate) && candidate.pane_id === AGENT_IDENTITY?.handle);
  }

  function findPaneTab(tabs: unknown, pane: HerdrEntityLike | undefined): HerdrEntityLike | undefined {
    if (!isUnknownArray(tabs) || typeof pane?.tab_id !== "string") return undefined;
    return tabs.find((candidate: unknown): candidate is HerdrEntityLike =>
      isHerdrEntity(candidate) && candidate.tab_id === pane.tab_id);
  }

  async function readHerdrIdentity(): Promise<void> {
    if (AGENT_IDENTITY?.backend !== "herdr") return;
    try {
      const [paneOutput, tabOutput] = await Promise.all([
        runHerdrJson(["pane", "list"]),
        runHerdrJson(["tab", "list"]),
      ]);
      const pane = findHerdrPane(herdrCollection(paneOutput, "panes"));
      const tab = findPaneTab(herdrCollection(tabOutput, "tabs"), pane);
      state.label = optionalString(pane?.label) ?? null;
      state.tabLabel = optionalString(tab?.label) ?? null;
    } catch {
      // best-effort
    }
    writeStatus();
  }

  function updateSessionRef(ctx: ExtensionContext): void {
    try {
      const file = ctx.sessionManager.getSessionFile();
      if (typeof file === "string" && file.startsWith("/")) state.sessionPath = file;
    } catch {}
    try {
      const id = ctx.sessionManager.getSessionId();
      if (id) state.sessionId = id;
    } catch {}
  }

  function updateModel(ctx: ExtensionContext): void {
    try {
      const model = ctx.model;
      if (model) state.model = { provider: model.provider, id: model.id };
    } catch {}
    try {
      state.thinking = pi.getThinkingLevel();
    } catch {}
  }

  function updateContextUsage(ctx: ExtensionContext): void {
    try {
      const usage = ctx.getContextUsage();
      if (usage && typeof usage.tokens === "number") {
        state.context = {
          tokens: usage.tokens,
          percent: typeof usage.percent === "number" ? usage.percent : undefined,
        };
      }
    } catch {}
  }

  // ---- inbox: appended lines become steer messages ----
  let poll: ReturnType<typeof setInterval> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let watcher: fs.FSWatcher | undefined;

  function globToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, (char) => `\\${char}`);
    return new RegExp(`^${escaped.replace(/\*/g, ".*")}$`);
  }

  function isAllowedModel(requestedModel: string): boolean {
    if (requestedModel.startsWith("openai-codex/")) return true;
    for (const pattern of allowedModelPatterns(ORCH_DIR)) {
      if (globToRegex(pattern).test(requestedModel)) return true;
    }
    return false;
  }

  async function resolveRequestedModel(requestedModel: unknown): Promise<ResolvedModel> {
    if (typeof requestedModel !== "string") throw new Error("Model must be a provider/id string");
    const slash = requestedModel.indexOf("/");
    if (slash <= 0 || slash === requestedModel.length - 1) {
      throw new Error("Model must be a provider/id string");
    }
    if (!isAllowedModel(requestedModel)) {
      throw new Error(`Model not allowed: ${requestedModel}`);
    }
    const provider = requestedModel.slice(0, slash);
    const id = requestedModel.slice(slash + 1);
    // Registry-find ONLY: a plain candidate object from getAvailable()
    // passes setModel but poisons the next turn ("Model not found <id>"
    // run errors). Retry briefly instead — the registry is unavailable
    // for a moment while a fresh session boots.
    let model: ResolvedModel | undefined;
    for (let attempt = 0; attempt < 8 && !model; attempt++) {
      model = lastCtx?.modelRegistry.find(provider, id);
      if (!model) await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!model) throw new Error(`Model not in registry (session still booting?): ${requestedModel}`);
    return model;
  }

  function applyRequestedThinkingLevel(level: unknown): void {
    if (!isThinkingLevel(level)) throw new Error("Thinking level must be valid");
    pi.setThinkingLevel(level);
  }

  async function applyControlCommand(parsed: ControlCommand): Promise<void> {
    const requested: JsonRecord = parsed.cmd === "model"
      ? { model: parsed.model }
      : { thinking: parsed.level };
    const outcome: JsonRecord = { requested, success: false, ts: new Date().toISOString() };
    try {
      if (parsed.cmd === "model") {
        await pi.setModel(await resolveRequestedModel(parsed.model));
      } else {
        applyRequestedThinkingLevel(parsed.level);
      }
      outcome.success = true;
    } catch (error: unknown) {
      outcome.error = error instanceof Error ? error.message : String(error);
    }
    atomicWrite(controlFile, outcome);
    if (lastCtx) updateModel(lastCtx);
    writeStatus();
  }

  function parseInboxLine(line: string): unknown {
    const trimmed = line.trim();
    if (!trimmed) return undefined;
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return trimmed;
    }
  }

  async function routeInboxCommand(parsed: unknown): Promise<boolean> {
    if (!isRecord(parsed) || typeof parsed.cmd !== "string") return false;
    // Control commands: {"cmd":"model","model":"provider/id"} and
    // {"cmd":"thinking","level":"low"} — pi's real APIs, never the TUI
    // composer (a non-matching /model string opens a selector overlay
    // and wedges the pane).
    if ((parsed.cmd === "model" || parsed.cmd === "thinking") && isControlCommand(parsed)) {
      await applyControlCommand(parsed);
    } else if (parsed.cmd === "on_done" && typeof parsed.target === "string" && parsed.target.trim()) {
      const target = parsed.target.trim();
      pendingHandoff = {
        target,
        note: typeof parsed.note === "string" ? parsed.note : undefined,
      };
      state.pendingHandoff = target;
      state.handoffError = undefined;
    }
    return true;
  }

  function deliverSteerText(text: string): void {
    state.steersReceived += 1;
    try {
      const idle = lastCtx?.isIdle() ?? true;
      if (idle) {
        pi.sendUserMessage(text);
      } else {
        pi.sendUserMessage(text, { deliverAs: "steer" });
      }
    } catch {}
  }

  // At-least-once delivery: the daemon retries an unacked outbox row by
  // re-appending the SAME message id, so track acked ids to apply each message
  // once and ack once (never re-deliver, never double-append the marker).
  const ackedMessageIds = new Set<string>();

  function messageIdOf(parsed: unknown): string | undefined {
    if (!isRecord(parsed) || typeof parsed.id !== "string" || !parsed.id) return undefined;
    return parsed.id;
  }

  // The daemon socket is the primary ack transport. The presence marker remains
  // the transport-neutral fallback consumed by a socket-less daemon.
  let nextAckRequestId = 1;

  function daemonAckEndpoint(): string | number | undefined {
    const portFile = path.join(ORCH_DIR, "orchd.port");
    try {
      const text = fs.readFileSync(portFile, "utf8").trim();
      try {
        const parsed: unknown = JSON.parse(text);
        const port = typeof parsed === "number" ? parsed
          : isRecord(parsed) ? parsed.port : undefined;
        if (typeof port === "number" && Number.isInteger(port) && port > 0 && port < 65536) return port;
      } catch {
        const port = Number(text);
        if (Number.isInteger(port) && port > 0 && port < 65536) return port;
      }
    } catch {
      // The unix socket is the normal endpoint.
    }
    return undefined;
  }

  function postDaemonAckTo(endpoint: string | number, id: string): Promise<boolean> {
    return new Promise((resolve) => {
      const requestId = `bridge-ack-${process.pid}-${nextAckRequestId++}`;
      const socket = typeof endpoint === "string"
        ? createConnection(endpoint)
        : createConnection({ host: "127.0.0.1", port: endpoint });
      let settled = false;
      let buffer = "";
      const finish = (success: boolean): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        socket.destroy();
        resolve(success);
      };
      const timeout = setTimeout(() => finish(false), 500);
      timeout.unref?.();
      socket.setEncoding("utf8");
      socket.on("error", () => finish(false));
      socket.on("connect", () => {
        socket.write(`${JSON.stringify({ id: requestId, method: "ack", params: { id } })}\n`);
      });
      socket.on("data", (chunk: string) => {
        buffer += chunk;
        const newline = buffer.indexOf("\n");
        if (newline < 0) return;
        try {
          const response: unknown = JSON.parse(buffer.slice(0, newline));
          if (isRecord(response) && response.id === requestId) {
            finish(!("error" in response));
          }
        } catch {
          finish(false);
        }
      });
    });
  }

  async function postDaemonAck(id: string): Promise<boolean> {
    try {
      const socketPath = path.join(ORCH_DIR, "orchd.sock");
      if (fs.existsSync(socketPath) && await postDaemonAckTo(socketPath, id)) return true;
      const port = daemonAckEndpoint();
      return port === undefined ? false : await postDaemonAckTo(port, id);
    } catch {
      return false;
    }
  }

  // ack.jsonl is bridge-append / daemon-consume: the daemon reads it to mark the
  // matching outbox row delivered exactly once, then truncates it. Never cleared here.
  function appendAckMarker(id: string): void {
    if (!ackFile) return;
    try {
      fs.appendFileSync(ackFile, `${JSON.stringify({ id, key: state.key, ts: new Date().toISOString() })}\n`);
    } catch {
      // best-effort
    }
  }

  async function applyInboxMessage(parsed: unknown): Promise<void> {
    if (await routeInboxCommand(parsed)) return;
    const text = typeof parsed === "string"
      ? parsed
      : isRecord(parsed) && typeof parsed.text === "string" ? parsed.text : undefined;
    if (text) deliverSteerText(text);
  }

  async function routeInboxLine(line: string): Promise<void> {
    const parsed = parseInboxLine(line);
    const messageId = messageIdOf(parsed);
    if (messageId !== undefined && ackedMessageIds.has(messageId)) return;
    await applyInboxMessage(parsed);
    if (messageId !== undefined) {
      ackedMessageIds.add(messageId);
      try {
        if (!(await postDaemonAck(messageId))) appendAckMarker(messageId);
      } catch {
        appendAckMarker(messageId);
      }
    }
  }

  // We atomically claim the file (rename), so lines appended mid-drain land in
  // a fresh inbox and are never lost, then inject each via the steer channel.
  async function drainInbox(): Promise<void> {
    if (!dir) return;
    const claim = `${inboxFile}.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.draining`;
    try {
      fs.renameSync(inboxFile, claim);
    } catch {
      return; // another drain won the race, or file vanished
    }
    let chunk = "";
    try {
      chunk = fs.readFileSync(claim, "utf8");
    } catch {
    } finally {
      try {
        fs.unlinkSync(claim);
      } catch {}
    }

    for (const line of chunk.split("\n")) await routeInboxLine(line);
    writeStatus();
  }

  function initPresence(hasUI: boolean) {
    if (dir) return;
    const key = computeKey(hasUI);
    if (!key) return;
    const candidate = presenceAgentDir(key);
    try {
      fs.mkdirSync(candidate, { recursive: true });
    } catch {
      return;
    }
    dir = candidate;
    state.key = key;
    statusFile = path.join(dir, "status.json");
    resultFile = path.join(dir, "result.json");
    inboxFile = path.join(dir, "inbox.jsonl");
    controlFile = path.join(dir, "control.json");
    ackFile = path.join(dir, "ack.jsonl");

    try {
      fs.writeFileSync(inboxFile, ""); // ignore steers from a previous life
    } catch {}
    poll = setInterval(() => {
      void drainInbox().catch(() => {
        /* noop */
      });
    }, INBOX_POLL_MS);
    poll.unref?.();
    try {
      watcher = fs.watch(dir, (_ev, filename) => {
        if (filename === "inbox.jsonl") void drainInbox().catch(() => {
          /* noop */
        });
      });
      watcher.unref?.();
    } catch {}
  }

  function readJson(file: string): unknown {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
    } catch {
      return undefined;
    }
  }

  function isPidAlive(pid: unknown): boolean {
    if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  function peerModel(status: unknown): string | undefined {
    if (!isRecord(status) || !isRecord(status.model)) return undefined;
    const provider = optionalString(status.model.provider);
    const id = optionalString(status.model.id);
    if (!provider || !id) return undefined;
    const thinking = optionalString(status.thinking) ?? "";
    return `${provider}/${id}:${thinking}`;
  }

  function livePeers(ownKey: string, allWorkspaces = false): Peer[] {
    try {
      const peers = fs.readdirSync(PRESENCE_ROOT, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && presenceKeyFromDirectoryName(entry.name) !== ownKey)
        .map((entry) => {
          const key = presenceKeyFromDirectoryName(entry.name);
          const peerDir = presenceAgentDir(key);
          const status = readJson(path.join(peerDir, "status.json"));
          return { key, dir: peerDir, status };
        })
        .filter((peer): peer is Peer => isRecord(peer.status) && isPidAlive(peer.status.pid));
      return scopeToWorkspace(peers, (peer) => peer.key, workspaceOf(ownKey), { all: allWorkspaces });
    } catch {
      return [];
    }
  }

  interface PeerResolutionError {
    error: string;
  }

  interface PeerResolutionPeer {
    peer: Peer;
  }

  type PeerResolution = PeerResolutionError | PeerResolutionPeer;

  function resolvePeer(target: string, ownKey: string, allWorkspaces = false): PeerResolution {
    const peers = livePeers(ownKey, true);
    const exact = peers.find((peer) => peer.key === target);
    const matches = exact ? [exact] : peers.filter((peer) => peer.key.endsWith(target));
    const firstMatch = matches[0];
    if (matches.length === 1 && firstMatch) {
      const wall = checkWall(ownKey, firstMatch.key, { crossWorkspace: allWorkspaces });
      if (!wall.allowed) return { error: `error: ${wall.reason}` };
    }
    const scopedMatches = scopeToWorkspace(matches, (peer) => peer.key, workspaceOf(ownKey), { all: allWorkspaces });
    const firstScopedMatch = scopedMatches[0];
    if (scopedMatches.length === 1 && firstScopedMatch) return { peer: firstScopedMatch };
    if (scopedMatches.length > 1) {
      return { error: `error: ambiguous target. Candidates: ${scopedMatches.map((peer) => peer.key).join(", ")}` };
    }
    if (matches.length > 1) {
      return { error: `error: ambiguous target. Candidates: ${matches.map((peer) => peer.key).join(", ")}` };
    }
    const candidates = livePeers(ownKey, allWorkspaces);
    return { error: `error: target not found. Candidates: ${candidates.map((peer) => peer.key).join(", ")}` };
  }

  function ownPresenceKey(ctx: ExtensionContext): string {
    initPresence(ctx.hasUI);
    return state.key !== undefined && state.key !== "" ? state.key : computeKey(ctx.hasUI) ?? "";
  }

  function peerSummaries(ownKey: string, allWorkspaces = false): PeerSummary[] {
    return livePeers(ownKey, allWorkspaces).map((peer) => ({
      key: peer.key,
      workspace: workspaceOf(peer.key),
      state: optionalString(peer.status.state) ?? "unknown",
      model: peerModel(peer.status),
      task: optionalString(peer.status.task),
      lastText: truncate(typeof peer.status.lastText === "string" ? peer.status.lastText : "", 120),
      cost: typeof peer.status.cost === "number" ? peer.status.cost : undefined,
      updatedAt: optionalString(peer.status.updatedAt),
    }));
  }

  function sendPeerMessage(target: string, text: string, ownKey: string, allWorkspaces = false): string {
    const resolved = resolvePeer(target, ownKey, allWorkspaces);
    if ("error" in resolved) return resolved.error;
    fs.appendFileSync(
      path.join(resolved.peer.dir, "inbox.jsonl"),
      `${JSON.stringify({ text: `[from ${ownKey}] ${text}`, ts: new Date().toISOString() })}\n`,
    );
    return `sent to ${resolved.peer.key}`;
  }

  function formatPeerLines(peers: PeerSummary[]): string {
    return peers
      .map((peer) => `${peer.key} ${peer.state} ${peer.model ?? "-"} ${truncate(String(peer.task ?? ""), 40)}`)
      .join("\n");
  }

  function clearPendingHandoff(): void {
    pendingHandoff = undefined;
    state.pendingHandoff = undefined;
  }

  function deliverPendingHandoff(finalText: string, ownKey: string): void {
    const handoff = pendingHandoff;
    if (!handoff) return;
    try {
      const resolved = resolvePeer(handoff.target, ownKey);
      if ("error" in resolved) {
        state.handoffError = resolved.error;
        clearPendingHandoff();
        return;
      }
      const note = handoff.note ? `${handoff.note}\n` : "";
      fs.appendFileSync(
        path.join(resolved.peer.dir, "inbox.jsonl"),
        `${JSON.stringify({ text: `[result from ${ownKey}] ${note}${finalText}`, ts: new Date().toISOString() })}\n`,
      );
      state.handoffError = undefined;
      clearPendingHandoff();
    } catch {
      clearPendingHandoff();
    }
  }

  function waitForOrchestratorAnswer(
    answerFile: string,
    signal: AbortSignal | undefined,
    reNotify: () => void,
  ): Promise<string | undefined> {
    return new Promise((resolve) => {
      let settled = false;
      let lastNotificationAt = Date.now();
      const finish = (text?: string) => {
        if (settled) return;
        settled = true;
        clearInterval(poll);
        clearTimeout(timeout);
        try {
          signal?.removeEventListener("abort", onAbort);
        } catch {}
        resolve(text);
      };
      const check = () => {
        const answer = readJson(answerFile);
        if (isRecord(answer) && typeof answer.text === "string") {
          finish(answer.text);
          return;
        }
        if (Date.now() - lastNotificationAt >= 60 * 1000) {
          reNotify();
          lastNotificationAt = Date.now();
        }
      };
      const onAbort = () => finish();
      const poll = setInterval(check, 500);
      const timeout = setTimeout(() => finish(), 10 * 60 * 1000);
      try {
        signal?.addEventListener("abort", onAbort, { once: true });
      } catch {}
      if (signal?.aborted) onAbort();
    });
  }

  interface BridgeToolResult {
    content: [{ type: "text"; text: string }];
    details: undefined;
  }

  function toolResult(text: string): BridgeToolResult {
    return { content: [{ type: "text", text }], details: undefined };
  }

  function noOrchestratorAnswer(): BridgeToolResult {
    return toolResult("no answer from orchestrator (timeout) — proceed with your best judgment and note the open question in your final reply.");
  }

  async function executeTool(action: () => string | Promise<string>, error: string): Promise<BridgeToolResult> {
    try {
      return toolResult(await action());
    } catch {
      return toolResult(error);
    }
  }

  function writeResult(text: string, details: JsonRecord = {}): void {
    atomicWrite(resultFile, {
      schema: PRESENCE_SCHEMA,
      text,
      ...details,
      task: state.task,
      model: state.model,
      thinking: state.thinking,
      tokens: state.tokens,
      cost: state.cost,
      turns: state.turns,
      sessionPath: state.sessionPath,
      finishedAt: state.finishedAt,
    });
  }

  pi.registerCommand("peers", {
    description: "List live orch peer agents",
    handler: (_args, ctx) => {
      try {
        const peers = peerSummaries(ownPresenceKey(ctx));
        ctx.ui.notify(peers.length ? formatPeerLines(peers) : "no live peers", "info");
      } catch {
        ctx.ui.notify("no live peers", "info");
      }
      return Promise.resolve();
    },
  });

  pi.registerCommand("tell", {
    description: "Send a message to a peer agent: /tell <target> <message>",
    handler: (args, ctx) => {
      try {
        const [target, ...message] = String(args ?? "").trim().split(/\s+/);
        const text = message.join(" ");
        if (!target || !text) {
          ctx.ui.notify("error: usage /tell <target> <message>", "error");
          return Promise.resolve();
        }
        const result = sendPeerMessage(target, text, ownPresenceKey(ctx));
        ctx.ui.notify(result, result.startsWith("sent to ") ? "info" : "error");
      } catch {
        ctx.ui.notify("error: unable to send peer message", "error");
      }
      return Promise.resolve();
    },
  });

  pi.registerTool({
    name: "orch_ask",
    label: "Ask Orchestrator",
    description: "Ask the orchestrator a blocking question and wait for its answer.",
    promptSnippet: "Ask the orchestrator a blocking decision question and wait for its answer",
    promptGuidelines: ["Use orch_ask when blocked on a decision the orchestrator must make (ambiguous spec, missing file, risky choice) — it blocks until the orchestrator answers; do not use it for things you can verify yourself."],
    parameters: Type.Object({
      question: Type.String({ description: "Decision question for the orchestrator" }),
    }),
    async execute(_toolCallId, params: OrchAskParams, signal, _onUpdate, ctx: ExtensionContext) {
      try {
        ownPresenceKey(ctx);
        if (!dir) return noOrchestratorAnswer();
        const id = Math.random().toString(36).slice(2, 10);
        const ts = new Date().toISOString();
        const questionFile = path.join(dir, "question.json");
        const answerFile = path.join(dir, "answer.json");
        try {
          fs.unlinkSync(answerFile);
        } catch {}
        atomicWrite(questionFile, { question: params.question, ts, id });
        askingPreviousState = state.state;
        state.asking = { question: truncate(params.question, 200), id, ts };
        state.state = "blocked";
        writeStatus();
        const notificationEvent: BridgeNotifyEvent = {
          key: state.key,
          workspace: workspaceOf(state.key) ?? undefined,
          agent: state.label ?? state.agent,
          tab: state.tabLabel,
          model: state.model ? `${state.model.id}:${state.thinking ?? ""}`.replace(/:$/, "") : null,
          oldState: askingPreviousState ?? "working",
          newState: "blocked",
          task: `Q: ${params.question}`,
          ts,
        };
        notifyHerdr(notificationEvent);

        const answer = await waitForOrchestratorAnswer(answerFile, signal, () => {
          notifyHerdr(notificationEvent);
        });
        if (typeof answer === "string") {
          try {
            fs.unlinkSync(answerFile);
          } catch {}
          try {
            fs.unlinkSync(questionFile);
          } catch {}
          return toolResult(answer);
        }
        return noOrchestratorAnswer();
      } catch {
        return noOrchestratorAnswer();
      } finally {
        state.asking = undefined;
        if (askingPreviousState) state.state = askingPreviousState;
        askingPreviousState = undefined;
        writeStatus();
      }
    },
  });

  pi.registerTool({
    name: "orch_agents",
    label: "Orchestrator Agents",
    description: "List live peer agents managed by the orchestrator.",
    promptSnippet: "Discover live orchestrator peer agents and their compact status",
    promptGuidelines: ["Use orch_agents to discover live peer agents before sending or reading peer messages."],
    parameters: Type.Object({
      all_workspaces: Type.Optional(Type.Boolean({ description: "Include agents in every workspace" })),
      // Keep the original camelCase spelling for existing callers.
      allWorkspaces: Type.Optional(Type.Boolean({ description: "Include agents in every workspace" })),
    }),
    async execute(_toolCallId, params: OrchAgentsParams, _signal, _onUpdate, ctx: ExtensionContext) {
      return executeTool(
        () => JSON.stringify(peerSummaries(
          ownPresenceKey(ctx),
          params.all_workspaces === true || params.allWorkspaces === true,
        )),
        "error: unable to list peer agents",
      );
    },
  });

  pi.registerTool({
    name: "orch_send",
    label: "Send to Orchestrator Agent",
    description: "Send a coordination message to a live peer agent.",
    promptSnippet: "Send a finding or request to a live orchestrator peer agent",
    promptGuidelines: ["Use orch_send to hand findings, requests, or coordination notes to another agent."],
    parameters: Type.Object({
      target: Type.String({ description: "Peer key or unique key suffix" }),
      text: Type.String({ description: "Message to send" }),
      cross_workspace: Type.Optional(Type.Boolean({ description: "Allow sending across workspaces" })),
      // Keep the original spelling for existing callers.
      allWorkspaces: Type.Optional(Type.Boolean({ description: "Allow sending across workspaces" })),
    }),
    async execute(_toolCallId, params: OrchSendParams, _signal, _onUpdate, ctx: ExtensionContext) {
      const crossWorkspace = params.cross_workspace === true || params.allWorkspaces === true;
      return executeTool(
        () => sendPeerMessage(params.target, params.text, ownPresenceKey(ctx), crossWorkspace),
        "error: unable to send peer message",
      );
    },
  });

  pi.registerTool({
    name: "orch_read",
    label: "Read Orchestrator Agent",
    description: "Read a live peer agent's latest result or status text.",
    promptSnippet: "Read a live orchestrator peer agent's latest result or status",
    promptGuidelines: ["Use orch_read to inspect a peer agent's latest result or status text."],
    parameters: Type.Object({
      target: Type.String({ description: "Peer key or unique key suffix" }),
      cross_workspace: Type.Optional(Type.Boolean({ description: "Allow reading across workspaces" })),
      // Keep the original spelling for existing callers.
      allWorkspaces: Type.Optional(Type.Boolean({ description: "Allow reading across workspaces" })),
    }),
    async execute(_toolCallId, params: OrchReadParams, _signal, _onUpdate, ctx: ExtensionContext) {
      const crossWorkspace = params.cross_workspace === true || params.allWorkspaces === true;
      return executeTool(() => {
        initPresence(ctx.hasUI);
        const ownKey = state.key !== undefined && state.key !== "" ? state.key : computeKey(ctx.hasUI) ?? "";
        const resolved = resolvePeer(params.target, ownKey, crossWorkspace);
        if ("error" in resolved) return resolved.error;
        const result = readJson(path.join(resolved.peer.dir, "result.json"));
        const resultRecord = isRecord(result) ? result : {};
        const text = typeof resultRecord.text === "string"
          ? resultRecord.text
          : typeof resolved.peer.status.lastText === "string" ? resolved.peer.status.lastText : "";
        return JSON.stringify({
          key: resolved.peer.key,
          workspace: workspaceOf(resolved.peer.key),
          state: optionalString(resolved.peer.status.state) ?? "unknown",
          model: peerModel(resolved.peer.status),
          text,
        });
      }, "error: unable to read peer agent");
    },
  });

  // ---- lifecycle ----
  pi.on("session_start", (_event, ctx: ExtensionContext) => {
    lastCtx = ctx;
    initPresence(ctx.hasUI);
    updateSessionRef(ctx);
    updateModel(ctx);
    writeStatus();
    void readHerdrIdentity().catch(() => {
      /* noop */
    });
    let heartbeatTicks = 0;
    heartbeat = setInterval(() => {
      try {
        heartbeatTicks += 1;
        if (lastCtx) {
          updateSessionRef(lastCtx);
          updateModel(lastCtx);
          updateContextUsage(lastCtx);
        }
        if (heartbeatTicks % 10 === 0) void readHerdrIdentity().catch(() => {
          /* noop */
        });
        writeStatus();
      } catch {}
    }, HEARTBEAT_MS);
    heartbeat.unref?.();
  });

  pi.on("model_select", (event: unknown) => {
    if (isModelSelectEvent(event) && isRecord(event.model)) {
      const provider = optionalString(event.model.provider);
      const id = optionalString(event.model.id);
      if (provider && id) state.model = { provider, id };
    }
    writeStatus();
  });

  pi.on("thinking_level_select", (event: unknown) => {
    if (isThinkingLevelSelectEvent(event) && typeof event.level === "string") state.thinking = event.level;
    writeStatus();
  });

  pi.on("before_agent_start", (event: unknown, ctx: ExtensionContext) => {
    lastCtx = ctx;
    if (isBeforeAgentStartEvent(event) && typeof event.prompt === "string" && event.prompt.trim()) {
      state.task = truncate(event.prompt, TASK_MAX);
    }
  });

  pi.on("agent_start", (_event, ctx: ExtensionContext) => {
    lastCtx = ctx;
    initPresence(ctx.hasUI);
    state.state = "working";
    state.startedAt = new Date().toISOString();
    state.finishedAt = undefined;
    state.currentFile = undefined;
    state.lastError = undefined;
    runFullText = undefined;
    updateSessionRef(ctx);
    updateModel(ctx);
    writeStatus();
  });

  pi.on("turn_end", (_event, ctx: ExtensionContext) => {
    lastCtx = ctx;
    state.turns += 1;
    updateContextUsage(ctx);
    writeStatus();
  });

  pi.on("message_end", (event: unknown, ctx: ExtensionContext) => {
    lastCtx = ctx;
    if (!isMessageEndEvent(event) || !isAssistantMessageLike(event.message)) return;
    const message = event.message;
    const text = extractText(message.content);
    if (text.trim()) {
      lastFullText = text;
      runFullText = text;
      state.lastText = truncate(text, LAST_TEXT_MAX);
    }
    const usage = message.usage;
    if (usage) {
      state.tokens.input += usage.input ?? 0;
      state.tokens.output += usage.output ?? 0;
      state.tokens.cacheRead += usage.cacheRead ?? 0;
      state.tokens.cacheWrite += usage.cacheWrite ?? 0;
      state.cost += usage.cost?.total ?? 0;
    }
    writeStatus();
  });

  function currentFileCandidate(args: unknown): string | undefined {
    if (!isRecord(args)) return undefined;
    const candidate = args.path ?? args.file_path ?? args.filePath;
    return typeof candidate === "string" ? candidate : undefined;
  }

  function shouldWriteToolStatus(
    previousTool: string | undefined,
    currentTool: string | undefined,
    file: string | undefined,
  ): boolean {
    return currentTool !== previousTool || !!file;
  }

  function handleToolExecutionStart(event: unknown): void {
    if (!isToolExecutionStartEvent(event)) return;
    const name = typeof event.toolName === "string" ? event.toolName : "";
    const previousTool = state.lastTool;
    if (name) state.lastTool = name;
    const file = currentFileCandidate(event.args);
    if (file && file !== state.currentFile) {
      state.currentFile = file;
    }
    if (shouldWriteToolStatus(previousTool, state.lastTool, file)) {
      writeStatus();
    }
  }

  pi.on("tool_execution_start", handleToolExecutionStart);

  // Pi awaits tool_execution_start before invoking the tool. This is the
  // execution-side interception point: acquiring here avoids deadlocking the
  // sequential tool_call preflight when a turn contains multiple bash calls.
  const commandLocks = new Map<string, {
    lock: CommandLock;
    previousState: typeof state.state;
    previousBlockedMessage: string | undefined;
  }>();

  function lockedCommandPatterns(): string[] {
    try {
      return loadConfig(ORCH_DIR).locked_commands;
    } catch {
      return [];
    }
  }

  function bashCommand(args: unknown): string | undefined {
    if (!isRecord(args) || typeof args.command !== "string") return undefined;
    return args.command;
  }

  pi.on("tool_execution_start", async (event: unknown, ctx: ExtensionContext) => {
    if (!isToolExecutionStartEvent(event) || event.toolName !== "bash") return;
    const command = bashCommand(event.args);
    const toolCallId = typeof event.toolCallId === "string" ? event.toolCallId : undefined;
    if (!command || !toolCallId || !matchesLockedCommand(command.trim().split(/\s+/), lockedCommandPatterns())) return;

    const previousState = state.state;
    const previousBlockedMessage = blockedMessage;
    state.state = "blocked";
    blockedMessage = "waiting on cmd-lock";
    writeStatus();
    try {
      const holder = ownPresenceKey(ctx) || `session-${process.pid}`;
      const lock = await acquireCommandLock(ORCH_DIR, {
        holder,
        note: command,
        timeoutMs: 15 * 60 * 1000,
        pollMs: 500,
      });
      commandLocks.set(toolCallId, { lock, previousState, previousBlockedMessage });
      if (state.state === "blocked" && blockedMessage === "waiting on cmd-lock") {
        state.state = previousState;
        blockedMessage = previousBlockedMessage;
        writeStatus();
      }
    } catch (error) {
      if (state.state === "blocked" && blockedMessage === "waiting on cmd-lock") {
        state.state = previousState;
        blockedMessage = previousBlockedMessage;
        writeStatus();
      }
      throw error;
    }
  });

  pi.on("tool_execution_end", (event: unknown) => {
    if (!isToolExecutionEndEvent(event)) return;
    const toolCallId = typeof event.toolCallId === "string" ? event.toolCallId : undefined;
    if (!toolCallId) return;
    const held = commandLocks.get(toolCallId);
    if (!held) return;
    commandLocks.delete(toolCallId);
    try {
      releaseCommandLock(ORCH_DIR, held.lock.pid);
    } catch {
      // best-effort; the lock implementation also reaps dead holders
    }
  });

  function finalFailedAssistantMessage(messages: readonly unknown[]): AssistantMessageLike | undefined {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (!isAssistantMessageLike(message)) continue;
      if (message.stopReason !== "error" && message.stopReason !== "aborted") return undefined;
      return message;
    }
    return undefined;
  }

  function failedAssistantError(message: AssistantMessageLike): string {
    if (typeof message.errorMessage === "string" && message.errorMessage.trim()) {
      return message.errorMessage;
    }
    return message.stopReason === "aborted" ? "aborted" : "error";
  }

  function recordFailedAgentRun(message: AssistantMessageLike, ctx: ExtensionContext): void {
    const stopReason = message.stopReason === "aborted" ? "aborted" : "error";
    const errorText = failedAssistantError(message);
    const partial = extractText(message.content);
    state.state = stopReason === "aborted" ? "aborted" : "error";
    state.lastError = errorText;
    state.finishedAt = new Date().toISOString();
    updateContextUsage(ctx);
    if (dir) {
      const text = partial.trim()
        ? `${partial.trim()}\n\n[${stopReason}] ${errorText}`
        : `[${stopReason}] ${errorText}`;
      lastFullText = text;
      runFullText = text;
      state.lastText = truncate(text, LAST_TEXT_MAX);
      writeResult(text, { error: errorText, stopReason });
    }
    writeStatus();
  }

  // agent_end carries every message from the run. Failures/aborts land as the
  // last assistant message with stopReason "error" | "aborted" + errorMessage
  // (see AssistantMessage in @earendil-works/pi-ai). No turn_error event exists.
  function handleAgentEnd(event: unknown, ctx: ExtensionContext): void {
    lastCtx = ctx;
    if (!isAgentEndEvent(event) || !isUnknownArray(event.messages)) return;
    const message = finalFailedAssistantMessage(event.messages);
    if (message) recordFailedAgentRun(message, ctx);
  }

  pi.on("agent_end", handleAgentEnd);

  function completeSettledAgentRun(ctx: ExtensionContext): void {
    state.state = lastFullText ? "done" : "idle";
    state.finishedAt = new Date().toISOString();
    updateContextUsage(ctx);
    if (lastFullText && dir) {
      writeResult(lastFullText);
    }
    if (pendingHandoff && runFullText) {
      deliverPendingHandoff(runFullText, state.key !== undefined && state.key !== "" ? state.key : computeKey(ctx.hasUI) ?? "");
    }
    writeStatus();
  }

  // agent_settled fires only when pi will not auto-continue (no retry/compact
  // continuation pending) — the real "done" signal, unlike agent_end.
  function handleAgentSettled(_event: unknown, ctx: ExtensionContext): void {
    lastCtx = ctx;
    // agent_end already recorded an error/abort for this run — do not clobber it
    // with a synthetic done/idle from a previous successful lastFullText.
    if (state.state === "error" || state.state === "aborted") {
      updateContextUsage(ctx);
      writeStatus();
      return;
    }
    completeSettledAgentRun(ctx);
  }

  pi.on("agent_settled", handleAgentSettled);

  pi.events.on("herdr:blocked", (data: unknown) => {
    if (!isHerdrBlockedEvent(data)) return;
    if (data.active) {
      if (blockedCount === 0 && !blockedNotified) {
        const notificationSummary = data.label ?? "";
        notifyHerdr({
          key: state.key,
          workspace: workspaceOf(state.key) ?? undefined,
          agent: state.label ?? state.agent,
          tab: state.tabLabel,
          model: state.model ? `${state.model.id}:${state.thinking ?? ""}`.replace(/:$/, "") : null,
          oldState: state.state,
          newState: "blocked",
          task: notificationSummary,
          ts: new Date().toISOString(),
        });
        blockedNotified = true;
      }
      blockedCount += 1;
      blockedMessage = data.label;
    } else {
      blockedCount = Math.max(0, blockedCount - 1);
      if (blockedCount === 0) {
        blockedMessage = undefined;
        blockedNotified = false;
      }
    }
    writeStatus();
  });

  pi.on("session_shutdown", () => {
    for (const held of commandLocks.values()) {
      try {
        releaseCommandLock(ORCH_DIR, held.lock.pid);
      } catch {
        // best-effort
      }
    }
    commandLocks.clear();
    if (heartbeat) clearInterval(heartbeat);
    if (poll) clearInterval(poll);
    try {
      watcher?.close();
    } catch {}
    state.state = "exited";
    writeStatus();
  });
}

export default orchestratorBridgeExtension;
