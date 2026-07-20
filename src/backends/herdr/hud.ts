// herdr pane HUD — the plexer-side half of an in-agent bridge.
//
// Everything in this file is gated on the herdr PLEXER (backend), not on any
// agent harness: pane custom-status metadata, pane/tab label lookup, the pane
// agent-state machine (working / blocked / idle), the `herdr:blocked` signal,
// and desktop notifications. CLAUDE.md Rule 10 forbids backend-gated code from
// living under `extensions/<harness>/`, so a harness bridge imports this module
// from its composition root and drives it through the narrow, harness-neutral
// registrar callbacks below — no herdr socket, event name, or shell-out ever
// appears inside a harness directory.
import { createConnection } from "node:net";
import { execFile } from "node:child_process";
import { tryParseIdentity } from "../identity.ts";
import { workspaceOf } from "../../policy/workspace.ts";
import { isRecord } from "../../util.ts";
import { isUnknownArray, optionalString, truncate } from "../../util.ts";

const HERDR_ENV = process.env.HERDR_ENV;
const HERDR_SOCKET_PATH = process.env.HERDR_SOCKET_PATH;
const AGENT_IDENTITY = tryParseIdentity(process.env.ORCH_AGENT_KEY);
const HERDR_INTEGRATION_ACTIVE =
  HERDR_ENV === "1" && !!HERDR_SOCKET_PATH && AGENT_IDENTITY?.backend === "herdr";
const HERDR_METADATA_SOURCE = "orch:bridge";
const CUSTOM_STATUS_MAX = 32;

/**
 * Session/UI surface a HUD handler reads off the harness context. Structural on
 * purpose: the HUD never imports a harness SDK type.
 */
export interface PaneHudContext {
  hasUI?: boolean;
  isIdle?: () => boolean;
  sessionManager?: {
    getSessionFile?: () => unknown;
    getSessionId?: () => unknown;
  };
}

/**
 * Harness-neutral lifecycle registrar. The harness composition root adapts its
 * own typed event names onto these four calls.
 */
export interface PaneHudRegistrar {
  onSessionStart(handler: (ctx: PaneHudContext) => void): void;
  onAgentStart(handler: (ctx: PaneHudContext) => void): void;
  onAgentEnd(handler: (event: { messages?: unknown[] }) => void): void;
  onSessionShutdown(handler: (event: { reason?: string }) => Promise<void> | void): void;
}

/** The harness's shared event bus, used for the plexer's own out-of-band signals. */
export interface PaneHudEventBus {
  on(channel: string, handler: (data: unknown) => void): unknown;
}

export interface PaneHudOptions {
  /** Agent/harness id reported to herdr (e.g. the harness's own adapter id). */
  agentId: string;
  /** Bridge code hash, forwarded so herdr can detect a stale in-pane bridge. */
  extensionHash: string;
}

/** Herdr pane handle for this process, or null when this is not a herdr pane. */
export function herdrPaneHandle(): string | null {
  return AGENT_IDENTITY?.backend === "herdr" ? AGENT_IDENTITY.handle : null;
}

/**
 * Capability probe for the pane-HUD port (`src/backends/hud.ts`): true when this
 * process is a herdr pane.
 *
 * Deliberately the BROADEST gate any HUD entry point applies — identity alone.
 * The socket- and env-dependent entry points keep their own stricter checks
 * internally, so selecting this provider never grants more than each function
 * already allowed itself.
 */
export function herdrHudActive(): boolean {
  return AGENT_IDENTITY?.backend === "herdr";
}

// ---- pane custom-status metadata ----

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

/** Agent snapshot the custom-status line is derived from. */
export interface PaneStatusSnapshot {
  state: string;
  task?: string;
  cost: number;
}

/**
 * Builds the pane custom-status reporter. Returns a no-op-ish sink that only
 * emits when this process owns the herdr pane it would report against and the
 * derived status line actually changed.
 */
export function createPaneStatusReporter(paneId: string | null): (snapshot: PaneStatusSnapshot) => void {
  let lastCustomStatus: string | undefined;

  function metadataEnabledForState(): boolean {
    return (
      HERDR_INTEGRATION_ACTIVE &&
      paneId === AGENT_IDENTITY?.handle
    );
  }

  function currentCustomStatus(snapshot: PaneStatusSnapshot): string | undefined {
    if (snapshot.state === "working" && snapshot.task) {
      return truncate(snapshot.task, CUSTOM_STATUS_MAX).slice(0, CUSTOM_STATUS_MAX);
    }
    if ((snapshot.state === "done" || snapshot.state === "idle") && snapshot.cost > 0) {
      return `$${snapshot.cost.toFixed(2)}`;
    }
    return undefined;
  }

  return (snapshot: PaneStatusSnapshot): void => {
    if (!metadataEnabledForState()) return;
    const customStatus = currentCustomStatus(snapshot);
    if (!customStatus || customStatus === lastCustomStatus) return;
    lastCustomStatus = customStatus;
    sendHerdrMetadata(customStatus);
  };
}

// ---- pane / tab label lookup (`herdr pane list`, `herdr tab list`) ----

interface HerdrEntityLike {
  pane_id?: unknown;
  tab_id?: unknown;
  label?: unknown;
}

/** Pane and tab display labels as herdr reports them. */
export interface PaneLabels {
  label: string | null;
  tabLabel: string | null;
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

/**
 * Reads this pane's (and its tab's) labels and hands them to `apply`. Returns
 * false when this process is not a herdr pane, so the caller can skip the
 * status write entirely; a lookup that fails leaves the previous labels in
 * place but still reports true.
 */
export async function readPaneLabels(apply: (labels: PaneLabels) => void): Promise<boolean> {
  if (AGENT_IDENTITY?.backend !== "herdr") return false;
  try {
    const [paneOutput, tabOutput] = await Promise.all([
      runHerdrJson(["pane", "list"]),
      runHerdrJson(["tab", "list"]),
    ]);
    const pane = findHerdrPane(herdrCollection(paneOutput, "panes"));
    const tab = findPaneTab(herdrCollection(tabOutput, "tabs"), pane);
    apply({
      label: optionalString(pane?.label) ?? null,
      tabLabel: optionalString(tab?.label) ?? null,
    });
  } catch {
    // best-effort
  }
  return true;
}

// ---- desktop notifications ----

/** Canonical state-change payload a bridge hands to the notifier. */
export interface BridgeNotifyEvent {
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

export function notifyHerdr(event: BridgeNotifyEvent): void {
  const { title, body } = bridgeNotificationText(event);
  try {
    execFile("herdr", ["notification", "show", title, "--body", body, "--sound", "request", "--position", "bottom-left"], () => {
      /* noop */
    });
  } catch {
    // best-effort
  }
}

// ---- the plexer's out-of-band blocked signal ----

interface HerdrBlockedEventLike {
  active: boolean;
  label?: string;
}

function isHerdrBlockedEvent(value: unknown): value is HerdrBlockedEventLike {
  return isRecord(value)
    && typeof value.active === "boolean"
    && (value.label === undefined || typeof value.label === "string");
}

/**
 * Relays herdr's pane-blocked signal to a bridge. The channel name and its
 * payload guard are plexer vocabulary and stay here; the bridge only receives
 * the decoded (active, label) pair.
 */
export function registerBlockedSignalRelay(
  events: PaneHudEventBus,
  onBlockedChange: (active: boolean, label: string | undefined) => void,
): void {
  events.on("herdr:blocked", (data: unknown) => {
    if (!isHerdrBlockedEvent(data)) return;
    onBlockedChange(data.active, data.label);
  });
}

// ---- herdr pane-state reporting (absorbed from the retired herdr-agent-state extension) ----
// Reports working/blocked/idle to herdr's pane HUD over the herdr socket, with
// idle debounce and a retry-grace hold for retryable provider errors.
export function registerPaneStateHud(
  registrar: PaneHudRegistrar,
  events: PaneHudEventBus,
  options: PaneHudOptions,
): void {
  if (HERDR_ENV !== "1" || !HERDR_SOCKET_PATH || AGENT_IDENTITY?.backend !== "herdr") return;

  const agentId = options.agentId;
  const extensionHash = options.extensionHash;
  const source = `herdr:${agentId}`;
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
      params: { pane_id: AGENT_IDENTITY?.handle, source, agent: agentId, seq: nextReportSeq(), ...ref },
    });
  }

  function sendState(state: AgentState, message: string | undefined, seq: number): Promise<void> {
    return sendRequest({
      id: `${source}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      method: "pane.report_agent",
      params: {
        pane_id: AGENT_IDENTITY?.handle,
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
      params: { pane_id: AGENT_IDENTITY?.handle, source, agent: agentId, seq: nextReportSeq() },
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

  registerBlockedSignalRelay(events, (active, label) => {
    if (!rootSession) return;
    if (!active) {
      blockedCount = Math.max(0, blockedCount - 1);
      if (blockedCount === 0) blockedMessage = undefined;
      publishState();
      return;
    }
    clearPendingTimers();
    blockedCount += 1;
    blockedMessage = label;
    publishState();
  });

  registrar.onSessionStart((ctx: PaneHudContext) => {
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

  registrar.onAgentStart((ctx: PaneHudContext) => {
    if (!rootSession) return;
    updateSessionRef(ctx);
    void reportSession();
    clearPendingTimers();
    clearFailureState();
    agentActive = true;
    publishState();
  });

  registrar.onAgentEnd((event) => {
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

  registrar.onSessionShutdown(async (event: { reason?: string }) => {
    if (!rootSession) return;
    clearPendingTimers();
    // Pi tears down extension runtimes for /reload, /new, /resume, /fork; only a
    // real quit should release herdr's full-lifecycle authority for this pane.
    if (event?.reason === "quit") await releaseAgent();
  });
}
