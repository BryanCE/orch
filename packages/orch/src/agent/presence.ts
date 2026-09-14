// pi's binding to orch's live presence record and daemon link for THIS agent.
// Orchd pushes dispatch, steer, model, and answer deliveries down that link;
// this module applies them, acknowledges applied work, and writes status.
// Peer agents are the subject of the companion module peers.ts.
//
// Nothing here is backend-aware: the status sink and daemon link are injected by
// the composition root.
import { mintAgentId } from "../backends/identity.ts";
import { launchCredential } from "../identity/launch.ts";
import { launchEnvFacts } from "../presence/history.ts";
import { isRecord, isUnknownArray, optionalString, projectRoot, sessionFilePath } from "../util.ts";
import { createModelControl } from "./model-control.ts";
import { isSessionUsage, sessionUsageCost } from "../session.ts";
import type { AgentState } from "../adapters/adapter.ts";
import type { AgentPresenceOptions, AssistantMessageLike, HarnessContext } from "../types/agent.ts";
import type { JsonRecord } from "../types/core.ts";
import type { ResultReport, StatusPatch } from "../types/presence.ts";
import type { BridgeDelivery, BridgeMessage } from "../control/bridge-message.ts";

export const LAST_TEXT_MAX = 400;
/** Maximum stored task length after the worker header is removed. */
export const TASK_MAX = 200;
export const HEARTBEAT_MS = 3000;

interface TextBlockLike {
  type: unknown;
  text: string;
}

function isTextBlock(value: unknown): value is TextBlockLike {
  return isRecord(value) && value.type === "text" && typeof value.text === "string";
}

export function isAssistantMessageLike(value: unknown): value is AssistantMessageLike {
  if (!isRecord(value) || value.role !== "assistant" || !("content" in value)) return false;
  if (value.usage !== undefined && !isSessionUsage(value.usage)) return false;
  if (value.stopReason !== undefined && typeof value.stopReason !== "string") return false;
  return value.errorMessage === undefined || typeof value.errorMessage === "string";
}

export function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!isUnknownArray(content)) return "";
  return content.filter(isTextBlock).map((block) => block.text).join("\n");
}

/**
 * The live presence state one agent keeps about itself. Declared as a TYPE rather
 * than inferred from the initializer: an inferred `null` narrows to `null`, so
 * every optional field used to need a widening `as` on its initializer. Rule 13 —
 * the fix for a type error is the type, never a cast, and a widening cast on an
 * initializer is the compiler asking for a declaration.
 */
interface AgentPresenceState {
  agent: string;
  key: string;
  /** The launch stamps the agent's display name and its spawner's identity into
   *  env; a plexer HUD may later refine the label, but identity never depends on one. */
  label: string | null;
  spawnedBy: string | null;
  spawnedByLabel: string | null;
  tabLabel: string | null;
  cwd: string;
  project: string | undefined;
  /** Stamped by the launch when this agent got its own git worktree; absent for
   *  an agent sharing the fleet's working tree. */
  worktree: string | undefined;
  branch: string | undefined;
  state: AgentState;
  lastError: string | undefined;
  model: { provider: string; id: string } | undefined;
  thinking: string | undefined;
  lastTool: string | undefined;
  task: string | undefined;
  dispatchId: string | undefined;
  lastText: string | undefined;
  currentFile: string | undefined;
  filesTouched: string[];
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
  cost: number;
  context: { tokens: number; percent?: number } | undefined;
  turns: number;
  sessionPath: string | undefined;
  sessionId: string | undefined;
  startedAt: number | undefined;
  finishedAt: number | undefined;
  updatedAt: number;
  steersReceived: number;
  asking: { question: string; id: string; ts: string } | undefined;
}

export function createAgentPresence(options: AgentPresenceOptions) {
  const { harness, daemon, extensionHash } = options;

  let lastCtx: HarnessContext | undefined;
  const state: AgentPresenceState = {
    agent: options.identity.agentId,
    key: "",
    // The launch stamps the agent's display name and its spawner's identity into
    // env; a plexer HUD may later refine the label, but identity never depends on one.
    label: null,
    spawnedBy: null,
    spawnedByLabel: null,
    tabLabel: null,
    cwd: process.cwd(),
    project: projectRoot(),
    // Stamped by the launch when this agent got its own git worktree; absent
    // for an agent sharing the fleet's working tree.
    worktree: optionalString(process.env.ORCH_AGENT_WORKTREE),
    branch: optionalString(process.env.ORCH_AGENT_BRANCH),
    state: "idle",
    lastError: undefined,
    model: undefined,
    thinking: undefined,
    lastTool: undefined,
    task: undefined,
    dispatchId: undefined,
    lastText: undefined,
    currentFile: undefined,
    filesTouched: [],
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    cost: 0,
    context: undefined,
    turns: 0,
    sessionPath: undefined,
    sessionId: undefined,
    startedAt: undefined,
    finishedAt: undefined,
    updatedAt: Date.now(),
    steersReceived: 0,
    asking: undefined,
  };

  function applyLaunchFacts(key: string): void {
    const facts = launchEnvFacts();
    state.label = facts.label;
    state.spawnedBy = facts.spawnedBy;
    state.spawnedByLabel = facts.spawnedByLabel;
    state.worktree = facts.worktree ?? undefined;
    state.branch = facts.branch ?? undefined;
    state.key = key;
  }

  applyLaunchFacts("");

  /** The key an interactive session orch did not spawn addresses itself by. A
   *  session is an agent, so it mints an id like any other and holds it for the
   *  life of the process; a pid is where it runs, and a key built from one reads
   *  back as a malformed identity every reader then has to ignore.
   *
   *  The id is the WHOLE key. This session is inside no
   *  plexer and in no space, and that is a missing value, not a place called
   *  `headless~local~`: stamping those two sentinels into the key is what made the
   *  web bucket every session into a fake space named "local". Where a session
   *  runs is orch's to record as environment, never the agent's to claim here. */
  let ownSessionKey: string | undefined;

  function sessionKey(): string {
    ownSessionKey ??= mintAgentId();
    return ownSessionKey;
  }

  // Orch-spawned agents use the launch credential; an interactive session mints its
  // own; a session with no UI has nobody to address and skips presence.
  function computeKey(hasUI: boolean): string | undefined {
    const credential = launchCredential();
    if (credential !== null) return credential;
    return hasUI ? sessionKey() : undefined;
  }

  // Shared with the tool layer: the cmd-lock interception and the plexer's
  // blocked signal both raise/lower this count, and writeStatus reads it.
  const blocked: { count: number; message: string | undefined } = { count: 0, message: undefined };
  const text: { lastFull: string | undefined; runFull: string | undefined } = {
    lastFull: undefined,
    runFull: undefined,
  };
  /** The last pushed text delivery, kept so the run it starts can name its dispatch. */
  let delivered: { id: string; text: string } | undefined;

  function writeStatus(): void {
    if (state.key === "") return;
    state.updatedAt = Date.now();
    const patch: StatusPatch = {
      state: blocked.count > 0 ? "blocked" : state.state,
      lastError: state.lastError ?? null,
      model: state.model ?? null,
      thinking: state.thinking,
      task: state.task,
      dispatchId: state.dispatchId,
      lastText: state.lastText,
      currentFile: state.currentFile,
      filesTouched: state.filesTouched,
      tokens: state.tokens,
      cost: state.cost,
      context: state.context ?? null,
      turns: state.turns,
      sessionPath: state.sessionPath,
      sessionId: state.sessionId,
      project: state.project ?? null,
      extensionHash,
      startedAt: state.startedAt ?? null,
      finishedAt: state.finishedAt ?? null,
      blockedMessage: blocked.count > 0 ? blocked.message ?? null : null,
    };
    void daemon.reportStatus(state.key, patch);
  }

  function writeResult(text: string, _details: JsonRecord = {}): void {
    if (state.key === "") return;
    const result: ResultReport = {
      text,
      dispatchId: state.dispatchId,
      task: state.task,
      model: state.model,
      thinking: state.thinking,
      tokens: state.tokens,
      cost: state.cost,
      turns: state.turns,
      sessionPath: state.sessionPath,
      finishedAt: state.finishedAt ?? Date.now(),
    };
    void daemon.reportResult(state.key, result);
  }

  function updateSessionRef(ctx: HarnessContext): void {
    try {
      const file = sessionFilePath(ctx.sessionManager.getSessionFile());
      if (file !== undefined) state.sessionPath = file;
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
        cost += sessionUsageCost(message.usage);
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
        state.finishedAt = Date.now();
      }
    } catch {}
  }

  // Model control is applied by the dedicated module (registry resolution +
  // ladder-suffix parsing); this layer owns delivery and presence refresh.
  const modelControl = createModelControl({
    harness,
    context: () => lastCtx,
    reportOutcome: (outcome) => daemon.postControlOutcome({ ...outcome, key: state.key }),
    refreshPresence: () => {
      if (lastCtx) updateModel(lastCtx);
      writeStatus();
    },
  });

  function deliverSteerText(text: string): void {
    state.steersReceived += 1;
    const idle = lastCtx?.isIdle() ?? true;
    if (idle) {
      harness.sendUserMessage(text);
    } else {
      harness.sendUserMessage(text, { deliverAs: "steer" });
    }
  }

  let pendingAnswer: {
    questionId: string;
    resolve: (answer: { deliveryId: string; text: string }) => void;
    reject: (error: Error) => void;
    cleanup: () => void;
  } | undefined;

  const answers = {
    await(questionId: string, signal: AbortSignal | undefined): Promise<{ deliveryId: string; text: string }> {
      return new Promise((resolve, reject) => {
        const previous = pendingAnswer;
        previous?.cleanup();
        previous?.reject(new Error("answer waiter replaced"));
        const waiter = {
          questionId,
          resolve,
          reject,
          cleanup: () => {
            signal?.removeEventListener("abort", onAbort);
            if (pendingAnswer === waiter) pendingAnswer = undefined;
          },
        };
        const onAbort = () => {
          waiter.cleanup();
          reject(new Error("answer wait aborted"));
        };
        pendingAnswer = waiter;
        signal?.addEventListener("abort", onAbort, { once: true });
        if (signal?.aborted) onAbort();
      });
    },
    settle(deliveryId: string, message: Extract<BridgeMessage, { action: "answer" }>): boolean {
      const waiter = pendingAnswer;
      if (!waiter || waiter.questionId !== message.questionId) return false;
      waiter.cleanup();
      waiter.resolve({ deliveryId, text: message.text });
      return true;
    },
  };

  async function routeDelivery(delivery: BridgeDelivery): Promise<void> {
    if (daemon.isAcked(delivery.id)) {
      void daemon.postAck(delivery.id);
      return;
    }
    switch (delivery.message.action) {
      case "dispatch":
      case "steer":
        delivered = { id: delivery.id, text: delivery.message.text };
        deliverSteerText(delivery.message.text);
        break;
      case "model":
        await modelControl.applyControlCommand(delivery.message, delivery.id);
        break;
      case "answer":
        if (!answers.settle(delivery.id, delivery.message)) return;
        break;
      default: {
        const exhaustive: never = delivery.message;
        return exhaustive;
      }
    }
    daemon.markAcked(delivery.id);
    void daemon.postAck(delivery.id);
    writeStatus();
  }

  function initPresence(hasUI: boolean): void {
    if (state.key !== "") return;
    const key = computeKey(hasUI);
    if (!key) return;
    applyLaunchFacts(key);
    daemon.attach(key, (delivery) => {
      void routeDelivery(delivery).catch(() => {
        /* A failed apply remains unacked for daemon redelivery. */
      });
    });
  }

  function keyOrCompute(hasUI: boolean): string {
    return state.key !== undefined && state.key !== "" ? state.key : computeKey(hasUI) ?? "";
  }

  function ownPresenceKey(ctx: HarnessContext): string {
    initPresence(ctx.hasUI);
    return keyOrCompute(ctx.hasUI);
  }

  function stopPresence(): void {
    daemon.detach();
  }

  return {
    state,
    blocked,
    text,
    answers,
    modelControl,
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
    stopPresence,
  };
}
