// pi's binding to orch's live presence record and daemon link for THIS agent.
// Orchd pushes dispatch, steer, model, and answer deliveries down that link;
// this module applies them, acknowledges applied work, and writes status.
// Peer agents are the subject of the companion module peers.ts.
//
// Nothing here is backend-aware: the status sink and daemon link are injected by
// the composition root.
import { mintAgentId } from "../backends/identity.ts";
import { launchCredential } from "../identity/launch.ts";
import { PRESENCE_SCHEMA } from "../presence/schema.ts";
import {
  appendOutcome,
  ensurePresenceAgentDir,
  launchStamp,
  writeResult as writePresenceResult,
  writeStatus as writePresenceStatus,
} from "../presence/writer.ts";
import { isRecord, isUnknownArray, optionalString, projectRoot, sessionFilePath } from "../util.ts";
import { createModelControl } from "./model-control.ts";
import type { AgentState } from "../adapters/adapter.ts";
import type { AgentPresenceOptions, AssistantMessageLike, HarnessContext, UsageLike } from "../types/agent.ts";
import type { JsonRecord } from "../types/core.ts";
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
function computeKey(hasUI: boolean, orchDir: string): string | undefined {
  const credential = launchCredential(orchDir);
  if (credential !== null) return credential;
  return hasUI ? sessionKey() : undefined;
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
  schema: typeof PRESENCE_SCHEMA;
  agent: string;
  key: string;
  /** The launch stamps the agent's display name and its spawner's identity into
   *  env; a plexer HUD may later refine the label, but identity never depends on one. */
  label: string | null;
  spawnedBy: string | null;
  spawnedByLabel: string | null;
  tabLabel: string | null;
  pid: number;
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
  startedAt: string | undefined;
  finishedAt: string | undefined;
  updatedAt: string;
  steersReceived: number;
  asking: { question: string; id: string; ts: string } | undefined;
}

export function createAgentPresence(orchDir: string, options: AgentPresenceOptions) {
  const { harness, daemon, extensionHash } = options;

  let dir: string | undefined;

  let lastCtx: HarnessContext | undefined;
  const state: AgentPresenceState = {
    schema: PRESENCE_SCHEMA,
    agent: options.identity.agentId,
    key: "",
    // The launch stamps the agent's display name and its spawner's identity into
    // env; a plexer HUD may later refine the label, but identity never depends on one.
    label: null,
    spawnedBy: null,
    spawnedByLabel: null,
    tabLabel: null,
    pid: process.pid,
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
    updatedAt: new Date().toISOString(),
    steersReceived: 0,
    asking: undefined,
  };
  Object.assign(state, launchStamp(state, options.identity.agentId, ""));
  // Shared with the tool layer: the cmd-lock interception and the plexer's
  // blocked signal both raise/lower this count, and writeStatus reads it.
  const blocked: { count: number; message: string | undefined } = { count: 0, message: undefined };
  const text: { lastFull: string | undefined; runFull: string | undefined } = {
    lastFull: undefined,
    runFull: undefined,
  };
  /** The last pushed text delivery, kept so the run it starts can name its dispatch. */
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

  // Model control is applied by the dedicated module (registry resolution +
  // ladder-suffix parsing); this layer owns delivery and presence refresh.
  const modelControl = createModelControl({
    harness,
    context: () => lastCtx,
    recordOutcome: (outcome) => {
      if (dir) appendOutcome(dir, outcome);
    },
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

  function initPresence(hasUI: boolean) {
    if (dir) return;
    const key = computeKey(hasUI, orchDir);
    if (!key) return;
    const candidate = ensurePresenceAgentDir(key, orchDir);
    if (!candidate) return;
    dir = candidate;
    Object.assign(state, launchStamp(state, options.identity.agentId, key));
    // Subprocesses of this session (the harness's own shell tools running the
    // orch CLI) inherit this, so a spawn made FROM here can hand its workers
    // this session's reply address — whatever harness this happens to be.
    process.env.ORCH_SESSION_KEY = key;
    daemon.attach(key, (delivery) => {
      void routeDelivery(delivery).catch(() => {
        /* A failed apply remains unacked for daemon redelivery. */
      });
    });
  }

  function keyOrCompute(hasUI: boolean): string {
    return state.key !== undefined && state.key !== "" ? state.key : computeKey(hasUI, orchDir) ?? "";
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
    /** Presence directory once initialised, or undefined when presence is skipped. */
    dir: (): string | undefined => dir,
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
