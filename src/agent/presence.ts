// pi's binding to the orch presence protocol for THIS agent: its live state
// record, its control-command channel, its inbox drain and its ack marker. Every
// file touch goes through the shared presence writer (src/presence/writer.ts and
// src/presence/inbox.ts) — the protocol is orch's, not pi's (CLAUDE.md Rule 10).
// Peer agents are the subject of the companion module peers.ts.
//
// Nothing here is backend-aware: the pane id, the status sink and the daemon ack
// transport are all injected by the composition root.
import * as fs from "node:fs";
import * as path from "node:path";
import type { HarnessApi, HarnessContext } from "./harness.ts";
import { mintAgentId, serializeIdentity, tryParseIdentity } from "../backends/identity.ts";
import { CONTROL_FILE, PRESENCE_SCHEMA } from "../presence/schema.ts";
import {
  ensurePresenceAgentDir,
  writeResult as writePresenceResult,
  writeStatus as writePresenceStatus,
} from "../presence/writer.ts";
import {
  appendAck,
  drainInbox as drainPresenceInbox,
  isInboxFilename,
  resetInbox,
} from "../presence/inbox.ts";
import { isRecord, isUnknownArray, optionalString, projectRoot, type JsonRecord } from "../util.ts";
import { createModelControl, isControlCommand } from "./model-control.ts";
import type { AgentState } from "../adapters/adapter.ts";
import { appendPeerInbox, resolvePeer } from "./peers.ts";
import type { DaemonAck } from "./daemon-ack.ts";
import type { HarnessIdentity } from "./harness.ts";


export const LAST_TEXT_MAX = 400;
/** Maximum stored task length after the worker header is removed. */
export const TASK_MAX = 200;
export const HEARTBEAT_MS = 3000;
const INBOX_POLL_MS = 1000;

interface TextBlockLike {
  type: unknown;
  text: string;
}

export interface UsageLike {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  cost?: { total?: number };
}

export interface AssistantMessageLike {
  role: string;
  content: unknown;
  usage?: UsageLike;
  stopReason?: string;
  errorMessage?: string;
}

/**
 * State-change payload handed to the composition root's notification sink.
 * Declared here, not imported from a backend, so the harness never depends on
 * which plexer (if any) delivers it.
 */
export interface BridgeNotification {
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

export type BridgeNotifier = (event: BridgeNotification) => void;

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

export function isAssistantMessageLike(value: unknown): value is AssistantMessageLike {
  if (!isRecord(value) || value.role !== "assistant" || !("content" in value)) return false;
  if (value.usage !== undefined && !isUsageLike(value.usage)) return false;
  if (value.stopReason !== undefined && typeof value.stopReason !== "string") return false;
  return value.errorMessage === undefined || typeof value.errorMessage === "string";
}

/** The key an interactive session orch did not spawn addresses itself by. A
 *  session is an agent, so it mints an id like any other and holds it for the
 *  life of the process; a pid is where it runs, and a key built from one reads
 *  back as a malformed identity every reader then has to ignore. Placement is
 *  orch's to record, so the key carries the unplaced pair, never a claim. */
let ownSessionKey: string | undefined;

function sessionKey(): string {
  ownSessionKey ??= serializeIdentity({ backend: "headless", workspace: "local", id: mintAgentId() });
  return ownSessionKey;
}

// Orch-spawned agents use the identity their launch handed them; an interactive
// session mints its own; a session with no UI has nobody to address and skips presence.
function computeKey(hasUI: boolean): string | undefined {
  const rawKey = process.env.ORCH_AGENT_KEY;
  if (rawKey) {
    const identity = tryParseIdentity(rawKey);
    return identity ? serializeIdentity(identity) : undefined;
  }
  return hasUI ? sessionKey() : undefined;
}

export function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!isUnknownArray(content)) return "";
  return content.filter(isTextBlock).map((block) => block.text).join("\n");
}

export interface AgentPresenceOptions {
  harness: HarnessApi;
  /** Which harness build this session is, and what it calls its settle signal. */
  identity: HarnessIdentity;
  /** Plexer pane handle for this process, or null when the backend has no panes. */
  paneId: string | null;
  /** Bridge code hash stamped into status.json for the doctor staleness check. */
  extensionHash: string;
  /** Daemon-socket ack transport for consumed inbox messages. */
  ack: DaemonAck;
  /** Sink invoked after every status write so a HUD can mirror the agent state. */
  reportStatus: (snapshot: { state: string; task?: string; cost: number }) => void;
}

/** The live presence binding returned by {@link createAgentPresence}. */
export type AgentPresence = ReturnType<typeof createAgentPresence>;

export function createAgentPresence(options: AgentPresenceOptions) {
  const { harness, ack, extensionHash, reportStatus } = options;

  let dir: string | undefined;
  let controlFile = "";

  let lastCtx: HarnessContext | undefined;
  const state = {
    schema: PRESENCE_SCHEMA,
    agent: options.identity.agentId,
    key: "",
    paneId: options.paneId,
    // The launch stamps the agent's display name and its spawner's identity into
    // env; a plexer HUD may later refine the label, but identity never depends on one.
    label: optionalString(process.env.ORCH_AGENT_NAME) ?? null,
    spawnedBy: optionalString(process.env.ORCH_SPAWNER),
    spawnedByLabel: optionalString(process.env.ORCH_SPAWNER_LABEL),
    tabLabel: null as string | null,
    pid: process.pid,
    cwd: process.cwd(),
    project: projectRoot(),
    // Stamped by the launch when this agent got its own git worktree; absent
    // for an agent sharing the fleet's working tree.
    worktree: optionalString(process.env.ORCH_AGENT_WORKTREE),
    branch: optionalString(process.env.ORCH_AGENT_BRANCH),
    state: "idle" as AgentState,
    lastError: undefined as string | undefined,
    model: undefined as { provider: string; id: string } | undefined,
    thinking: undefined as string | undefined,
    lastTool: undefined as string | undefined,
    task: undefined as string | undefined,
    dispatchId: undefined as string | undefined,
    lastText: undefined as string | undefined,
    currentFile: undefined as string | undefined,
    filesTouched: [] as string[],
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
  // Shared with the tool layer: the cmd-lock interception and the plexer's
  // blocked signal both raise/lower this count, and writeStatus reads it.
  const blocked = { count: 0, message: undefined as string | undefined };
  const text = {
    lastFull: undefined as string | undefined,
    runFull: undefined as string | undefined,
  };
  let pendingHandoff: { target: string; note?: string } | undefined;
  /** The last inbox text delivery, kept so the run it starts can name its dispatch. */
  let delivered: { id: string; text: string } | undefined;

  function writeStatus() {
    if (!dir) return;
    state.updatedAt = new Date().toISOString();
    const out: JsonRecord = {
      ...state,
      extensionHash,
      key: state.key,
    };
    if (blocked.count > 0) {
      out.state = "blocked";
      out.blockedMessage = blocked.message;
    }
    writePresenceStatus(dir, out);
    // A pane HUD is best-effort and must never prevent the durable status from
    // landing (especially on the terminal turn where the daemon needs it).
    try {
      reportStatus({ state: state.state, task: state.task, cost: state.cost });
    } catch {
      // Keep the harness alive when a plexer/status reporter is unavailable.
    }
  }

  function writeResult(text: string, details: JsonRecord = {}): void {
    if (!dir) return;
    writePresenceResult(dir, {
      schema: PRESENCE_SCHEMA,
      text,
      ...details,
      task: state.task,
      dispatchId: state.dispatchId,
      model: state.model,
      thinking: state.thinking,
      tokens: state.tokens,
      cost: state.cost,
      turns: state.turns,
      sessionPath: state.sessionPath,
      finishedAt: state.finishedAt,
    });
  }

  function updateSessionRef(ctx: HarnessContext): void {
    try {
      const file = ctx.sessionManager.getSessionFile();
      if (typeof file === "string" && file.startsWith("/")) state.sessionPath = file;
    } catch {}
    try {
      const id = ctx.sessionManager.getSessionId();
      if (id) state.sessionId = id;
    } catch {}
  }

  function updateModel(ctx: HarnessContext): void {
    try {
      const model = ctx.model;
      if (model) state.model = { provider: model.provider, id: model.id };
    } catch {}
    try {
      state.thinking = harness.getThinkingLevel();
    } catch {}
  }

  function updateContextUsage(ctx: HarnessContext): void {
    try {
      const usage = ctx.getContextUsage();
      if (usage && typeof usage.tokens === "number") {
        state.context = {
          tokens: usage.tokens,
          percent: typeof usage.percent === "number" ? usage.percent : undefined,
        };
      }
    } catch {}

    // Do not rely only on the message and settle events. The harness persists the
    // assistant message before (or independently of) delivering those events,
    // and an event handler can be delayed behind another extension handler while
    // the heartbeat continues to run. The session branch is the durable source
    // of truth, so reconcile it here on every heartbeat/context refresh.
    try {
      const branch = ctx.sessionManager.getBranch();
      let input = 0;
      let output = 0;
      let cacheRead = 0;
      let cacheWrite = 0;
      let cost = 0;
      let hasUsage = false;
      let latestText = "";

      for (const entry of branch) {
        if (!isRecord(entry) || entry.type !== "message" || !isAssistantMessageLike(entry.message)) continue;
        const message = entry.message;
        const messageText = extractText(message.content);
        if (messageText.trim()) latestText = messageText;
        if (!message.usage) continue;
        hasUsage = true;
        input += message.usage.input ?? 0;
        output += message.usage.output ?? 0;
        cacheRead += message.usage.cacheRead ?? 0;
        cacheWrite += message.usage.cacheWrite ?? 0;
        cost += message.usage.cost?.total ?? 0;
      }

      if (hasUsage) {
        // Compaction can hide older messages from the active branch. Presence
        // counters are session totals, so never move them backwards while
        // repairing a delayed event.
        state.tokens = {
          input: Math.max(state.tokens.input, input),
          output: Math.max(state.tokens.output, output),
          cacheRead: Math.max(state.tokens.cacheRead, cacheRead),
          cacheWrite: Math.max(state.tokens.cacheWrite, cacheWrite),
        };
        state.cost = Math.max(state.cost, cost);
      }
      if (latestText.trim()) {
        text.lastFull = latestText;
        text.runFull = latestText;
        state.lastText = latestText.slice(0, LAST_TEXT_MAX);
      }
      // The settle event is the normal transition, but make the status resilient
      // when it is delayed: idle means the visible turn is finished.
      // An idle context is the harness's durable turn boundary even when the
      // final turn only contained tools and has no assistant message.
      if (state.state === "working" && ctx.isIdle()) {
        state.state = latestText.trim() ? "done" : "idle";
        state.finishedAt = new Date().toISOString();
      }
    } catch {}
  }

  // ---- inbox: appended lines become steer messages ----
  let poll: ReturnType<typeof setInterval> | undefined;
  let watcher: fs.FSWatcher | undefined;

  // Model/thinking control commands are applied by the dedicated model-control
  // module (allowlist gate + registry resolution + ladder-suffix parsing); this
  // layer only owns the inbox transport, the control.json path and the presence
  // refresh the applier calls back into.
  const modelControl = createModelControl({
    harness,
    context: () => lastCtx,
    controlFile: () => controlFile,
    refreshPresence: () => {
      if (lastCtx) updateModel(lastCtx);
      writeStatus();
    },
  });

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
      await modelControl.applyControlCommand(parsed);
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
        harness.sendUserMessage(text);
      } else {
        harness.sendUserMessage(text, { deliverAs: "steer" });
      }
    } catch {}
  }

  // The transport-neutral fallback marker, consumed by a socket-less daemon.
  function appendAckMarker(id: string): void {
    if (!dir) return;
    appendAck(dir, id, state.key);
  }

  async function applyInboxMessage(parsed: unknown, messageId: string | undefined): Promise<void> {
    if (await routeInboxCommand(parsed)) return;
    const text = typeof parsed === "string"
      ? parsed
      : isRecord(parsed) && typeof parsed.text === "string" ? parsed.text : undefined;
    if (!text) return;
    if (messageId !== undefined) delivered = { id: messageId, text };
    deliverSteerText(text);
  }

  async function routeInboxLine(line: string): Promise<void> {
    const parsed = parseInboxLine(line);
    const messageId = ack.messageIdOf(parsed);
    if (messageId !== undefined && ack.isAcked(messageId)) return;
    await applyInboxMessage(parsed, messageId);
    if (messageId !== undefined) {
      ack.markAcked(messageId);
      try {
        if (!(await ack.post(messageId))) appendAckMarker(messageId);
      } catch {
        appendAckMarker(messageId);
      }
    }
  }

  // The shared drain atomically claims the inbox (rename), so lines appended
  // mid-drain land in a fresh inbox and are never lost. It returns the raw split
  // of the claimed file, blank lines included, which routeInboxLine expects.
  // An empty array means the claim itself failed — another drain won the race,
  // or there is no inbox yet — so there is nothing to report.
  async function drainInbox(): Promise<void> {
    if (!dir) return;
    const lines = drainPresenceInbox(dir);
    if (lines.length === 0) return;
    for (const line of lines) await routeInboxLine(line);
    writeStatus();
  }

  function initPresence(hasUI: boolean) {
    if (dir) return;
    const key = computeKey(hasUI);
    if (!key) return;
    const candidate = ensurePresenceAgentDir(key);
    if (!candidate) return;
    dir = candidate;
    state.key = key;
    // Subprocesses of this session (the harness's own shell tools running the
    // orch CLI) inherit this, so a spawn made FROM here can hand its workers
    // this session's reply address — whatever harness this happens to be.
    process.env.ORCH_SESSION_KEY = key;
    controlFile = path.join(dir, CONTROL_FILE);

    resetInbox(dir); // ignore steers from a previous life
    poll = setInterval(() => {
      void drainInbox().catch(() => {
        /* noop */
      });
    }, INBOX_POLL_MS);
    poll.unref?.();
    try {
      watcher = fs.watch(dir, (_ev, filename) => {
        if (isInboxFilename(filename)) void drainInbox().catch(() => {
          /* noop */
        });
      });
      watcher.unref?.();
    } catch {}
  }

  function keyOrCompute(hasUI: boolean): string {
    return state.key !== undefined && state.key !== "" ? state.key : computeKey(hasUI) ?? "";
  }

  function ownPresenceKey(ctx: HarnessContext): string {
    initPresence(ctx.hasUI);
    return keyOrCompute(ctx.hasUI);
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
      const sender = state.label ? `${state.label} (${ownKey})` : ownKey;
      appendPeerInbox(resolved.peer.dir, `[result from ${sender}] ${note}${finalText}`);
      state.handoffError = undefined;
      clearPendingHandoff();
    } catch {
      clearPendingHandoff();
    }
  }

  function stopPresence(): void {
    if (poll) clearInterval(poll);
    try {
      watcher?.close();
    } catch {}
  }

  return {
    state,
    blocked,
    text,
    /** Presence directory once initialised, or undefined when presence is skipped. */
    dir: (): string | undefined => dir,
    hasPendingHandoff: (): boolean => pendingHandoff !== undefined,
    lastCtx: (): HarnessContext | undefined => lastCtx,
    setLastCtx: (ctx: HarnessContext): void => {
      lastCtx = ctx;
    },
    initPresence,
    keyOrCompute,
    ownPresenceKey,
    /** Id of the dispatch whose delivered text is this prompt, or undefined for a human-typed run. */
    dispatchIdFor: (prompt: string): string | undefined =>
      delivered && delivered.text.trim() === prompt.trim() ? delivered.id : undefined,
    writeStatus,
    writeResult,
    updateSessionRef,
    updateModel,
    updateContextUsage,
    deliverPendingHandoff,
    stopPresence,
  };
}
