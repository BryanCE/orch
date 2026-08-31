// The pi-facing surface of the bridge for this agent's own run: `orch_ask`, the
// command-lock interception, every pi lifecycle event handler that keeps
// presence in sync, and the pi-event payload guards those handlers consume. The
// peer-facing commands and tools are registered by peers.ts.
//
// All presence I/O goes through the injected AgentPresence binding and all
// notification delivery through the injected notifier, so this module is
// backend-agnostic.
import * as fs from "node:fs";
import * as path from "node:path";
import { Type } from "typebox";
import { spaceOf } from "../policy/space.ts";
import { term } from "../policy/vocabulary.ts";
import { errorMessage } from "../util.ts";
import { loadSettingsOrNull } from "../settings/read.ts";
import { orchDir } from "../presence/writer.ts";
import { acquireCommandLock, matchesLockedCommand, releaseCommandLock } from "../control/cmd-lock.ts";
import { ANSWER_FILE, QUESTION_FILE } from "../presence/schema.ts";
import { atomicWrite, presenceFile } from "../presence/writer.ts";
import { registerPeerTools, toolResult } from "./peers.ts";
import { extractText, isAssistantMessageLike, HEARTBEAT_MS, LAST_TEXT_MAX, TASK_MAX } from "./presence.ts";
import { isRecord, isUnknownArray, optionalString, readJsonFile, truncate } from "../util.ts";
import { prepareWorkerTask } from "../worker-prompt.ts";
import type { AgentToolsOptions, AssistantMessageLike, BridgeNotification, BridgeToolResult, HarnessApi, HarnessContext } from "../types/agent.ts";
import type { CommandLock } from "../types/control.ts";

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
  return toolResult(`no answer from ${term("orch")} (timeout) - proceed with your best judgment and note the open question in your final reply.`);
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

/**
 * Registers this agent's own tools and lifecycle handlers, and delegates the
 * peer-facing surface to peers.ts.
 *
 * Returns the blocked-signal handler the composition root relays the plexer's
 * out-of-band blocked events into — the event channel itself is backend
 * vocabulary and never named here.
 */
export function registerAgentTools(harness: HarnessApi, options: AgentToolsOptions): {
  onBlockedChange: (active: boolean, label: string | undefined) => void;
} {
  const { presence, notify, refreshLabels } = options;
  const { state, blocked, text: runText } = presence;

  let askingPreviousState: typeof state.state | undefined;
  let blockedNotified = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  registerPeerTools(harness, presence);

  harness.registerTool({
    name: "orch_ask",
    label: `Ask ${term("orch")}`,
    description: `Ask the ${term("orch")} a blocking question and wait for its answer.`,
    promptSnippet: `Ask the ${term("orch")} a blocking decision question and wait for its answer`,
    promptGuidelines: [`Use orch_ask when blocked on a decision the ${term("orch")} must make (ambiguous spec, missing file, risky choice) - it blocks until the ${term("orch")} answers; do not use it for things you can verify yourself.`],
    parameters: Type.Object({
      question: Type.String({ description: `Decision question for the ${term("orch")}` }),
    }),
    async execute(_toolCallId, params: OrchAskParams, signal, _onUpdate, ctx: HarnessContext) {
      try {
        presence.ownPresenceKey(ctx);
        const dir = presence.dir();
        if (!dir) return noOrchestratorAnswer();
        const id = Math.random().toString(36).slice(2, 10);
        const ts = new Date().toISOString();
        const questionFile = path.join(dir, QUESTION_FILE);
        const answerFile = presenceFile(dir, ANSWER_FILE);
        try {
          fs.unlinkSync(answerFile);
        } catch {}
        atomicWrite(questionFile, { question: params.question, ts, id });
        askingPreviousState = state.state;
        state.asking = { question: truncate(params.question, 200), id, ts };
        state.state = "asking";
        presence.writeStatus();
        const notificationEvent: BridgeNotification = {
          key: state.key,
          space: spaceOf(orchDir(), state.key) ?? undefined,
          agent: state.label ?? state.agent,
          tab: state.tabLabel,
          model: state.model ? `${state.model.id}:${state.thinking ?? ""}`.replace(/:$/, "") : null,
          oldState: askingPreviousState ?? "working",
          newState: "asking",
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
  harness.on("session_start", (_event, ctx: HarnessContext) => {
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

  harness.on("model_select", (event: unknown) => {
    if (isModelSelectEvent(event) && isRecord(event.model)) {
      const provider = optionalString(event.model.provider);
      const id = optionalString(event.model.id);
      if (provider && id) state.model = { provider, id };
    }
    presence.writeStatus();
  });

  harness.on("thinking_level_select", (event: unknown) => {
    if (isThinkingLevelSelectEvent(event) && typeof event.level === "string") state.thinking = event.level;
    presence.writeStatus();
  });

  harness.on("before_agent_start", (event: unknown, ctx: HarnessContext) => {
    presence.setLastCtx(ctx);
    if (isBeforeAgentStartEvent(event) && typeof event.prompt === "string" && event.prompt.trim()) {
      state.task = prepareWorkerTask(event.prompt, TASK_MAX);
      state.dispatchId = presence.dispatchIdFor(event.prompt);
    }
  });

  harness.on("agent_start", (_event, ctx: HarnessContext) => {
    presence.setLastCtx(ctx);
    presence.initPresence(ctx.hasUI);
    state.state = "working";
    state.startedAt = new Date().toISOString();
    state.finishedAt = undefined;
    state.currentFile = undefined;
    state.filesTouched = [];
    state.lastError = undefined;
    runText.runFull = undefined;
    presence.updateSessionRef(ctx);
    presence.updateModel(ctx);
    presence.writeStatus();
  });

  harness.on("turn_end", (_event, ctx: HarnessContext) => {
    presence.setLastCtx(ctx);
    state.turns += 1;
    presence.updateContextUsage(ctx);
    presence.writeStatus();
  });

  harness.on("message_end", (event: unknown, ctx: HarnessContext) => {
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

  const WRITING_TOOLS = new Set(["edit", "write", "multi_edit", "apply_patch"]);

  function recordFileTouched(toolName: string, file: string | undefined): void {
    if (!file || !WRITING_TOOLS.has(toolName)) return;
    if (!state.filesTouched.includes(file)) state.filesTouched.push(file);
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
    recordFileTouched(name, file);
    if (shouldWriteToolStatus(previousTool, state.lastTool, file)) {
      presence.writeStatus();
    }
  }

  harness.on("tool_execution_start", recordToolStart);

  // Pi awaits tool_execution_start before invoking the tool. This is the
  // execution-side interception point: acquiring here avoids deadlocking the
  // sequential tool_call preflight when a turn contains multiple bash calls.
  const commandLocks = new Map<string, {
    lock: CommandLock;
    previousState: typeof state.state;
    previousBlockedMessage: string | undefined;
  }>();

  function lockedCommandPatterns(): string[] {
    return loadSettingsOrNull(orchDir())?.locked_commands ?? [];
  }

  function bashCommand(args: unknown): string | undefined {
    if (!isRecord(args) || typeof args.command !== "string") return undefined;
    return args.command;
  }

  harness.on("tool_execution_start", async (event: unknown, ctx: HarnessContext) => {
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
      const lock = await acquireCommandLock(orchDir(), {
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

  harness.on("tool_execution_end", (event: unknown) => {
    if (!isToolExecutionEndEvent(event)) return;
    const toolCallId = typeof event.toolCallId === "string" ? event.toolCallId : undefined;
    if (!toolCallId) return;
    const held = commandLocks.get(toolCallId);
    if (!held) return;
    commandLocks.delete(toolCallId);
    try {
      releaseCommandLock(orchDir(), held.lock.pid, held.lock.start_token);
    } catch {
      // best-effort; the lock implementation also reaps dead holders
    }
  });

  // An aborted or errored turn never fires tool_execution_end for the call that
  // was in flight, and the process lives on - exactly the leak that stalls a
  // fleet behind a live-pid lock. Turn end releases anything still held.
  function releaseAllCommandLocks(): void {
    for (const [toolCallId, held] of commandLocks) {
      commandLocks.delete(toolCallId);
      try {
        releaseCommandLock(orchDir(), held.lock.pid, held.lock.start_token);
      } catch {
        // best-effort; dead-holder eviction is the backstop
      }
    }
  }
  harness.on("turn_end", releaseAllCommandLocks);
  harness.on("session_shutdown", releaseAllCommandLocks);

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

  function recordFailedAgentRun(message: AssistantMessageLike, ctx: HarnessContext): void {
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
  // (see the harness's AssistantMessage type). No turn_error event exists.
  function recordAgentEnd(event: unknown, ctx: HarnessContext): void {
    presence.setLastCtx(ctx);
    if (!isAgentEndEvent(event) || !isUnknownArray(event.messages)) return;
    const message = finalFailedAssistantMessage(event.messages);
    if (message) recordFailedAgentRun(message, ctx);
  }

  harness.on("agent_end", recordAgentEnd);

  function completeSettledAgentRun(ctx: HarnessContext | undefined): void {
    // A settled turn is terminal even when its assistant content is empty (for
    // example a tool-only turn). Keep the existing done/idle vocabulary while
    // ensuring neither shape can remain working; result extraction separately
    // falls back to the last assistant text in the native session file.
    const finalText = runText.runFull;
    state.state = finalText ? "done" : "idle";
    state.finishedAt = new Date().toISOString();
    try {
      if (ctx) presence.updateContextUsage(ctx);
      if (finalText && presence.dir()) presence.writeResult(finalText);
      if (presence.hasPendingHandoff() && finalText) {
        presence.deliverPendingHandoff(finalText, presence.keyOrCompute(ctx?.hasUI ?? false));
      }
    } catch (error: unknown) {
      // A failing end-hook operation must not strand the agent as working. Keep
      // the terminal state and retain a useful error for the daemon/event row.
      state.lastError = errorMessage(error);
      state.state = "error";
    } finally {
      // writeStatus is itself best-effort, but always gets one terminal attempt
      // in the same callback tick, including empty/error-shaped settle events.
      presence.writeStatus();
    }
  }

  // The settle signal fires only when the run will not auto-continue (no retry
  // or compaction continuation pending) — the real "done", unlike agent_end.
  function settleAgentRun(_event: unknown, ctx?: HarnessContext): void {
    if (ctx) presence.setLastCtx(ctx);
    // agent_end already recorded an error/abort for this run — do not clobber it
    // with a synthetic done from a previous successful run. Refresh
    // context when available, but still publish the existing terminal status.
    if (state.state === "error" || state.state === "aborted") {
      try { if (ctx) presence.updateContextUsage(ctx); } finally { presence.writeStatus(); }
      return;
    }
    completeSettledAgentRun(ctx);
  }

  harness.on(options.identity.settleEvent, settleAgentRun);

  function onBlockedChange(active: boolean, label: string | undefined): void {
    if (active) {
      if (blocked.count === 0 && !blockedNotified) {
        const notificationSummary = label ?? "";
        notify({
          key: state.key,
          space: spaceOf(orchDir(), state.key) ?? undefined,
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

  harness.on("session_shutdown", () => {
    for (const held of commandLocks.values()) {
      try {
        releaseCommandLock(orchDir(), held.lock.pid, held.lock.start_token);
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
