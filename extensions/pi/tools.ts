// The pi-facing surface of the bridge for this agent's own run: `orch_ask`, the
// command-lock interception, every pi lifecycle event handler that keeps
// presence in sync, and the pi-event payload guards those handlers consume. The
// peer-facing commands and tools are registered by peers.ts.
//
// All presence I/O goes through the injected PiPresence binding and all
// notification delivery through the injected notifier, so this module is
// backend-agnostic.
import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { workspaceOf } from "../../src/policy/workspace.ts";
import { loadConfig } from "../../src/config.ts";
import { acquireCommandLock, matchesLockedCommand, releaseCommandLock, type CommandLock } from "../../src/control/cmd-lock.ts";
import { ANSWER_FILE } from "../../src/presence/schema.ts";
import { atomicWrite, presenceFile } from "../../src/presence/writer.ts";
import { registerPeerTools, toolResult, type BridgeToolResult } from "./peers.ts";
import {
  extractText,
  isAssistantMessageLike,
  HEARTBEAT_MS,
  LAST_TEXT_MAX,
  ORCH_DIR,
  TASK_MAX,
  type AssistantMessageLike,
  type BridgeNotification,
  type BridgeNotifier,
  type PiPresence,
} from "./presence.ts";
import { isRecord, isUnknownArray, optionalString, readJsonFile, truncate } from "../../src/util.ts";

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

interface OrchAskParams {
  question: string;
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

function noOrchestratorAnswer(): BridgeToolResult {
  return toolResult("no answer from orchestrator (timeout) — proceed with your best judgment and note the open question in your final reply.");
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
      const answer = readJsonFile(answerFile);
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

export interface PiToolsOptions {
  presence: PiPresence;
  /** Delivers a state-change notification (wired to the plexer HUD, if any). */
  notify: BridgeNotifier;
  /** Refreshes this agent's pane/tab labels and writes status when they apply. */
  refreshLabels: () => Promise<void>;
}

/**
 * Registers this agent's own tools and lifecycle handlers, and delegates the
 * peer-facing surface to peers.ts.
 *
 * Returns the blocked-signal handler the composition root relays the plexer's
 * out-of-band blocked events into — the event channel itself is backend
 * vocabulary and never named here.
 */
export function registerPiTools(pi: ExtensionAPI, options: PiToolsOptions): {
  onBlockedChange: (active: boolean, label: string | undefined) => void;
} {
  const { presence, notify, refreshLabels } = options;
  const { state, blocked, text: runText } = presence;

  let askingPreviousState: typeof state.state | undefined;
  let blockedNotified = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  registerPeerTools(pi, presence);

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
        presence.ownPresenceKey(ctx);
        const dir = presence.dir();
        if (!dir) return noOrchestratorAnswer();
        const id = Math.random().toString(36).slice(2, 10);
        const ts = new Date().toISOString();
        const questionFile = path.join(dir, "question.json");
        const answerFile = presenceFile(dir, ANSWER_FILE);
        try {
          fs.unlinkSync(answerFile);
        } catch {}
        atomicWrite(questionFile, { question: params.question, ts, id });
        askingPreviousState = state.state;
        state.asking = { question: truncate(params.question, 200), id, ts };
        state.state = "blocked";
        presence.writeStatus();
        const notificationEvent: BridgeNotification = {
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
        notify(notificationEvent);

        const answer = await waitForOrchestratorAnswer(answerFile, signal, () => {
          notify(notificationEvent);
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
        presence.writeStatus();
      }
    },
  });

  // ---- lifecycle ----
  pi.on("session_start", (_event, ctx: ExtensionContext) => {
    presence.setLastCtx(ctx);
    presence.initPresence(ctx.hasUI);
    presence.updateSessionRef(ctx);
    presence.updateModel(ctx);
    presence.writeStatus();
    void refreshLabels().catch(() => {
      /* noop */
    });
    let heartbeatTicks = 0;
    heartbeat = setInterval(() => {
      try {
        heartbeatTicks += 1;
        const lastCtx = presence.lastCtx();
        if (lastCtx) {
          presence.updateSessionRef(lastCtx);
          presence.updateModel(lastCtx);
          presence.updateContextUsage(lastCtx);
        }
        if (heartbeatTicks % 10 === 0) void refreshLabels().catch(() => {
          /* noop */
        });
        presence.writeStatus();
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
    presence.writeStatus();
  });

  pi.on("thinking_level_select", (event: unknown) => {
    if (isThinkingLevelSelectEvent(event) && typeof event.level === "string") state.thinking = event.level;
    presence.writeStatus();
  });

  pi.on("before_agent_start", (event: unknown, ctx: ExtensionContext) => {
    presence.setLastCtx(ctx);
    if (isBeforeAgentStartEvent(event) && typeof event.prompt === "string" && event.prompt.trim()) {
      state.task = truncate(event.prompt, TASK_MAX);
    }
  });

  pi.on("agent_start", (_event, ctx: ExtensionContext) => {
    presence.setLastCtx(ctx);
    presence.initPresence(ctx.hasUI);
    state.state = "working";
    state.startedAt = new Date().toISOString();
    state.finishedAt = undefined;
    state.currentFile = undefined;
    state.lastError = undefined;
    runText.runFull = undefined;
    presence.updateSessionRef(ctx);
    presence.updateModel(ctx);
    presence.writeStatus();
  });

  pi.on("turn_end", (_event, ctx: ExtensionContext) => {
    presence.setLastCtx(ctx);
    state.turns += 1;
    presence.updateContextUsage(ctx);
    presence.writeStatus();
  });

  pi.on("message_end", (event: unknown, ctx: ExtensionContext) => {
    presence.setLastCtx(ctx);
    if (!isMessageEndEvent(event) || !isAssistantMessageLike(event.message)) return;
    const message = event.message;
    const text = extractText(message.content);
    if (text.trim()) {
      runText.lastFull = text;
      runText.runFull = text;
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
    presence.writeStatus();
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

  function recordToolStart(event: unknown): void {
    if (!isToolExecutionStartEvent(event)) return;
    const name = typeof event.toolName === "string" ? event.toolName : "";
    const previousTool = state.lastTool;
    if (name) state.lastTool = name;
    const file = currentFileCandidate(event.args);
    if (file && file !== state.currentFile) {
      state.currentFile = file;
    }
    if (shouldWriteToolStatus(previousTool, state.lastTool, file)) {
      presence.writeStatus();
    }
  }

  pi.on("tool_execution_start", recordToolStart);

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
    const previousBlockedMessage = blocked.message;
    state.state = "blocked";
    blocked.message = "waiting on cmd-lock";
    presence.writeStatus();
    try {
      const holder = presence.ownPresenceKey(ctx) || `session-${process.pid}`;
      const lock = await acquireCommandLock(ORCH_DIR, {
        holder,
        note: command,
        timeoutMs: 15 * 60 * 1000,
        pollMs: 500,
      });
      commandLocks.set(toolCallId, { lock, previousState, previousBlockedMessage });
      if (state.state === "blocked" && blocked.message === "waiting on cmd-lock") {
        state.state = previousState;
        blocked.message = previousBlockedMessage;
        presence.writeStatus();
      }
    } catch (error) {
      if (state.state === "blocked" && blocked.message === "waiting on cmd-lock") {
        state.state = previousState;
        blocked.message = previousBlockedMessage;
        presence.writeStatus();
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
    presence.updateContextUsage(ctx);
    if (presence.dir()) {
      const text = partial.trim()
        ? `${partial.trim()}\n\n[${stopReason}] ${errorText}`
        : `[${stopReason}] ${errorText}`;
      runText.lastFull = text;
      runText.runFull = text;
      state.lastText = truncate(text, LAST_TEXT_MAX);
      presence.writeResult(text, { error: errorText, stopReason });
    }
    presence.writeStatus();
  }

  // agent_end carries every message from the run. Failures/aborts land as the
  // last assistant message with stopReason "error" | "aborted" + errorMessage
  // (see AssistantMessage in @earendil-works/pi-ai). No turn_error event exists.
  function recordAgentEnd(event: unknown, ctx: ExtensionContext): void {
    presence.setLastCtx(ctx);
    if (!isAgentEndEvent(event) || !isUnknownArray(event.messages)) return;
    const message = finalFailedAssistantMessage(event.messages);
    if (message) recordFailedAgentRun(message, ctx);
  }

  pi.on("agent_end", recordAgentEnd);

  function completeSettledAgentRun(ctx: ExtensionContext): void {
    state.state = runText.lastFull ? "done" : "idle";
    state.finishedAt = new Date().toISOString();
    presence.updateContextUsage(ctx);
    if (runText.lastFull && presence.dir()) {
      presence.writeResult(runText.lastFull);
    }
    if (presence.hasPendingHandoff() && runText.runFull) {
      presence.deliverPendingHandoff(runText.runFull, presence.keyOrCompute(ctx.hasUI));
    }
    presence.writeStatus();
  }

  // agent_settled fires only when pi will not auto-continue (no retry/compact
  // continuation pending) — the real "done" signal, unlike agent_end.
  function settleAgentRun(_event: unknown, ctx: ExtensionContext): void {
    presence.setLastCtx(ctx);
    // agent_end already recorded an error/abort for this run — do not clobber it
    // with a synthetic done/idle from a previous successful lastFull text.
    if (state.state === "error" || state.state === "aborted") {
      presence.updateContextUsage(ctx);
      presence.writeStatus();
      return;
    }
    completeSettledAgentRun(ctx);
  }

  pi.on("agent_settled", settleAgentRun);

  function onBlockedChange(active: boolean, label: string | undefined): void {
    if (active) {
      if (blocked.count === 0 && !blockedNotified) {
        const notificationSummary = label ?? "";
        notify({
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
      blocked.count += 1;
      blocked.message = label;
    } else {
      blocked.count = Math.max(0, blocked.count - 1);
      if (blocked.count === 0) {
        blocked.message = undefined;
        blockedNotified = false;
      }
    }
    presence.writeStatus();
  }

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
    presence.stopPresence();
    state.state = "exited";
    presence.writeStatus();
  });

  return { onBlockedChange };
}
