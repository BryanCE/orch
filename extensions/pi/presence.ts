// pi's binding to the orch presence protocol for THIS agent: its live state
// record, its control-command channel, its inbox drain and its ack marker. Every
// file touch goes through the shared presence writer (src/presence/writer.ts and
// src/presence/inbox.ts) — the protocol is orch's, not pi's (CLAUDE.md Rule 10).
// Peer agents are the subject of the companion module peers.ts.
//
// Nothing here is backend-aware: the pane id, the status sink and the daemon ack
// transport are all injected by the composition root.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { allowedModelPatterns } from "../../src/config.ts";
import { serializeIdentity, tryParseIdentity } from "../../src/backends/identity.ts";
import { PRESENCE_SCHEMA } from "../../src/presence/schema.ts";
import {
  atomicWrite,
  ensurePresenceAgentDir,
  writeResult as writePresenceResult,
  writeStatus as writePresenceStatus,
} from "../../src/presence/writer.ts";
import {
  appendAck,
  drainInbox as drainPresenceInbox,
  isInboxFilename,
  resetInbox,
} from "../../src/presence/inbox.ts";
import { isRecord, isUnknownArray, type JsonRecord } from "../../src/util.ts";
import { appendPeerInbox, resolvePeer } from "./peers.ts";
import type { DaemonAck } from "./daemon-ack.ts";

export const ORCH_DIR = process.env.ORCH_DIR ?? path.join(os.homedir(), ".orch");
export const AGENT_ID = "pi";

export const LAST_TEXT_MAX = 400;
export const TASK_MAX = 200;
export const HEARTBEAT_MS = 3000;
export const INBOX_POLL_MS = 1000;

export type ResolvedModel = NonNullable<ExtensionContext["model"]>;
export type ThinkingLevel = Parameters<ExtensionAPI["setThinkingLevel"]>[0];

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

interface ControlCommand {
  cmd: string;
  model?: unknown;
  level?: unknown;
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

function isControlCommand(value: unknown): value is ControlCommand {
  return isRecord(value) && typeof value.cmd === "string";
}

function isThinkingLevel(value: unknown): value is ThinkingLevel {
  return value === "off" || value === "minimal" || value === "low" || value === "medium"
    || value === "high" || value === "xhigh" || value === "max";
}

// Orch-spawned agents use their opaque identity key. The owner's interactive
// pane has a local pid key when no orch key is present; otherwise skip presence.
export function computeKey(hasUI: boolean): string | undefined {
  const rawKey = process.env.ORCH_AGENT_KEY;
  if (rawKey) {
    const identity = tryParseIdentity(rawKey);
    return identity ? serializeIdentity(identity) : undefined;
  }
  if (hasUI && process.pid > 0) return `session-${process.pid}`;
  return undefined;
}

export function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!isUnknownArray(content)) return "";
  return content.filter(isTextBlock).map((block) => block.text).join("\n");
}

export interface PiPresenceOptions {
  pi: ExtensionAPI;
  /** Plexer pane handle for this process, or null when the backend has no panes. */
  paneId: string | null;
  /** Bridge code hash stamped into status.json for the doctor staleness check. */
  extensionHash: string;
  /** Daemon-socket ack transport for consumed inbox messages. */
  ack: DaemonAck;
  /** Sink invoked after every status write so a HUD can mirror the agent state. */
  reportStatus: (snapshot: { state: string; task?: string; cost: number }) => void;
}

/** The live presence binding returned by {@link createPiPresence}. */
export type PiPresence = ReturnType<typeof createPiPresence>;

export function createPiPresence(options: PiPresenceOptions) {
  const { pi, ack, extensionHash, reportStatus } = options;

  let dir: string | undefined;
  // control.json is pi's own outcome record for a control command, not part of
  // the shared presence protocol, so its name lives here rather than in schema.ts.
  let controlFile = "";

  let lastCtx: ExtensionContext | undefined;
  const state = {
    schema: PRESENCE_SCHEMA,
    agent: AGENT_ID,
    key: "",
    paneId: options.paneId,
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
  // Shared with the tool layer: the cmd-lock interception and the plexer's
  // blocked signal both raise/lower this count, and writeStatus reads it.
  const blocked = { count: 0, message: undefined as string | undefined };
  const text = {
    lastFull: undefined as string | undefined,
    runFull: undefined as string | undefined,
  };
  let pendingHandoff: { target: string; note?: string } | undefined;

  function writeStatus() {
    if (!dir) return;
    state.updatedAt = new Date().toISOString();
    const identity = tryParseIdentity(state.key);
    const out: JsonRecord = {
      ...state,
      extensionHash,
      key: state.key,
      ...(identity ? {
        backend: identity.backend,
        workspace: identity.workspace,
        handle: identity.handle,
      } : {}),
    };
    if (blocked.count > 0) {
      out.state = "blocked";
      out.blockedMessage = blocked.message;
    }
    writePresenceStatus(dir, out);
    reportStatus({ state: state.state, task: state.task, cost: state.cost });
  }

  function writeResult(text: string, details: JsonRecord = {}): void {
    if (!dir) return;
    writePresenceResult(dir, {
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

  // The transport-neutral fallback marker, consumed by a socket-less daemon.
  function appendAckMarker(id: string): void {
    if (!dir) return;
    appendAck(dir, id, state.key);
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
    const messageId = ack.messageIdOf(parsed);
    if (messageId !== undefined && ack.isAcked(messageId)) return;
    await applyInboxMessage(parsed);
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
    controlFile = path.join(dir, "control.json");

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

  function ownPresenceKey(ctx: ExtensionContext): string {
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
      appendPeerInbox(resolved.peer.dir, `[result from ${ownKey}] ${note}${finalText}`);
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
    lastCtx: (): ExtensionContext | undefined => lastCtx,
    setLastCtx: (ctx: ExtensionContext): void => {
      lastCtx = ctx;
    },
    initPresence,
    keyOrCompute,
    ownPresenceKey,
    writeStatus,
    writeResult,
    updateSessionRef,
    updateModel,
    updateContextUsage,
    deliverPendingHandoff,
    stopPresence,
  };
}
