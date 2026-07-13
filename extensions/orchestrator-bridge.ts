// orchestrator-bridge — per-agent control plane for the Claude orchestrator.
//
// Writes $ORCH_DIR/agents/<KEY>/ (default ~/.orch) where <KEY> = HERDR_PANE_ID
// (e.g. "w6:p3") for the interactive TUI that owns the pane, or
// "session-<pid>" for headless runs:
//   status.json  — state / model / thinking / tokens / cost / currentFile / lastText
//   result.json  — final assistant text of the last settled run
//   inbox.jsonl  — APPEND a JSON line {"text":"..."} to steer this agent mid-run
//
// Read by the `orch` CLI. Inert failures: every write is best-effort.
// @ts-nocheck

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection } from "node:net";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { Type } from "typebox";

// Loaded via the ~/.pi/agent/extensions symlink, where a relative ../src import resolves
// against ~/.pi/agent and fails — this file must stay standalone. The digest must stay
// byte-identical to computeCodeHash in src/daemon/lifecycle.ts; doctor compares the two.
function hashExtensionFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 12);
}

const EXTENSION_HASH = hashExtensionFile(fileURLToPath(import.meta.url));

const ORCH_DIR = process.env.ORCH_DIR || path.join(os.homedir(), ".orch");
const PRESENCE_ROOT = path.join(ORCH_DIR, "agents");
const SCHEMA_VERSION = 2;
const AGENT_ID = "pi";

// A pane id key means "this agent OWNS that pane" — only true for the
// interactive TUI. Headless runs (-p etc.) inherit the caller's
// HERDR_PANE_ID and would clobber the owner's row, so they key by pid.
function computeKey(hasUI: boolean): string {
  if (hasUI && process.env.HERDR_PANE_ID) return process.env.HERDR_PANE_ID;
  return `session-${process.pid}`;
}

const LAST_TEXT_MAX = 400;
const TASK_MAX = 200;
const HEARTBEAT_MS = 3000;
const INBOX_POLL_MS = 1000;
const ALLOWED_MODELS_FILE = path.join(os.homedir(), ".pi", "agent", "orch", "allowed-models");
const HERDR_ENV = process.env.HERDR_ENV;
const HERDR_SOCKET_PATH = process.env.HERDR_SOCKET_PATH;
const HERDR_PANE_ID = process.env.HERDR_PANE_ID;
const HERDR_METADATA_SOURCE = "orch:bridge";
const CUSTOM_STATUS_MAX = 32;
let metadataSeq = Date.now() * 1000;

function nextMetadataSeq(): number {
  metadataSeq += 1;
  return metadataSeq;
}

function sendHerdrMetadata(customStatus: string): void {
  if (HERDR_ENV !== "1" || !HERDR_SOCKET_PATH || !HERDR_PANE_ID) return;

  try {
    const request = {
      id: `${HERDR_METADATA_SOURCE}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      method: "pane.report_metadata",
      params: {
        pane_id: HERDR_PANE_ID,
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

function notifyHerdr(title: string, body: string): void {
  try {
    execFile("herdr", ["notification", "show", title, "--body", body, "--sound", "request", "--position", "bottom-left"], () => {});
  } catch {
    // best-effort
  }
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((b: any) => b?.type === "text" && typeof b.text === "string")
    .map((b: any) => b.text)
    .join("\n");
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

export default function (pi) {
  let dir: string | undefined;
  let statusFile = "";
  let resultFile = "";
  let inboxFile = "";
  let controlFile = "";

  let lastCtx: any;
  const state = {
    schema: SCHEMA_VERSION,
    agent: AGENT_ID,
    key: "",
    paneId: process.env.HERDR_PANE_ID || null,
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
      HERDR_ENV === "1" &&
      !!HERDR_SOCKET_PATH &&
      !!HERDR_PANE_ID &&
      !!state.paneId &&
      state.key === state.paneId
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
    const out: any = { ...state, extensionHash: EXTENSION_HASH };
    if (blockedCount > 0) {
      out.state = "blocked";
      out.blockedMessage = blockedMessage;
    }
    atomicWrite(statusFile, out);
    reportHerdrMetadata();
  }

  function runHerdrJson(args: string[]): Promise<any | undefined> {
    return new Promise((resolve) => {
      try {
        execFile("herdr", args, { timeout: 2000 }, (_error, stdout) => {
          try {
            resolve(JSON.parse(String(stdout)));
          } catch {
            resolve(undefined);
          }
        });
      } catch {
        resolve(undefined);
      }
    });
  }

  function herdrCollection(output: any, name: string): any {
    return output?.result?.[name] ?? output?.[name];
  }

  function findHerdrPane(panes: any): any | undefined {
    if (!Array.isArray(panes)) return undefined;
    return panes.find((candidate: any) => candidate?.pane_id === HERDR_PANE_ID);
  }

  function findPaneTab(tabs: any, pane: any): any | undefined {
    if (!Array.isArray(tabs)) return undefined;
    return tabs.find((candidate: any) => candidate?.tab_id === pane?.tab_id);
  }

  async function readHerdrIdentity(): Promise<void> {
    if (!HERDR_PANE_ID) return;
    try {
      const [paneOutput, tabOutput] = await Promise.all([
        runHerdrJson(["pane", "list"]),
        runHerdrJson(["tab", "list"]),
      ]);
      const pane = findHerdrPane(herdrCollection(paneOutput, "panes"));
      const tab = findPaneTab(herdrCollection(tabOutput, "tabs"), pane);
      state.label = pane?.label ?? null;
      state.tabLabel = tab?.label ?? null;
    } catch {
      // best-effort
    }
    writeStatus();
  }

  function updateSessionRef(ctx: any) {
    try {
      const file = ctx?.sessionManager?.getSessionFile?.();
      if (typeof file === "string" && file.startsWith("/")) state.sessionPath = file;
    } catch {}
    try {
      const id = ctx?.sessionManager?.getSessionId?.();
      if (typeof id === "string" && id) state.sessionId = id;
    } catch {}
  }

  function updateModel(ctx: any) {
    try {
      const m = ctx?.model;
      if (m && typeof m === "object" && m.id) {
        state.model = { provider: m.provider, id: m.id };
      }
    } catch {}
    try {
      const level = pi.getThinkingLevel?.();
      if (typeof level === "string") state.thinking = level;
    } catch {}
  }

  function updateContextUsage(ctx: any) {
    try {
      const usage = ctx?.getContextUsage?.();
      if (usage && typeof usage.tokens === "number") {
        state.context = { tokens: usage.tokens, percent: usage.percent };
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
    let raw: string;
    try {
      raw = fs.readFileSync(ALLOWED_MODELS_FILE, "utf8");
    } catch {
      return false;
    }
    for (const line of raw.split("\n")) {
      const pattern = line.trim();
      if (!pattern || pattern.startsWith("#")) continue;
      if (globToRegex(pattern).test(requestedModel)) return true;
    }
    return false;
  }

  async function resolveRequestedModel(requestedModel: unknown): Promise<any> {
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
    let model;
    for (let attempt = 0; attempt < 8 && !model; attempt++) {
      model = lastCtx?.modelRegistry?.find?.(provider, id);
      if (!model) await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!model) throw new Error(`Model not in registry (session still booting?): ${requestedModel}`);
    return model;
  }

  async function applyRequestedThinkingLevel(level: unknown): Promise<void> {
    if (typeof level !== "string") throw new Error("Thinking level must be a string");
    await pi.setThinkingLevel(level);
  }

  async function applyControlCommand(parsed: any): Promise<void> {
    const requested = parsed.cmd === "model"
      ? { model: parsed.model }
      : { thinking: parsed.level };
    const outcome: any = { requested, success: false, ts: new Date().toISOString() };
    try {
      if (parsed.cmd === "model") {
        await pi.setModel(await resolveRequestedModel(parsed.model));
      } else {
        await applyRequestedThinkingLevel(parsed.level);
      }
      outcome.success = true;
    } catch (error) {
      outcome.error = error instanceof Error ? error.message : String(error);
    }
    atomicWrite(controlFile, outcome);
    updateModel(lastCtx);
    writeStatus();
  }

  function parseInboxLine(line: string): any | undefined {
    const trimmed = line.trim();
    if (!trimmed) return undefined;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  async function routeInboxCommand(parsed: any): Promise<boolean> {
    if (!parsed || typeof parsed !== "object") return false;
    if (!parsed.cmd) return false;
    // Control commands: {"cmd":"model","model":"provider/id"} and
    // {"cmd":"thinking","level":"low"} — pi's real APIs, never the TUI
    // composer (a non-matching /model string opens a selector overlay
    // and wedges the pane).
    if (parsed.cmd === "model" || parsed.cmd === "thinking") {
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
      const idle = lastCtx?.isIdle?.() ?? true;
      if (idle) {
        pi.sendUserMessage(text);
      } else {
        pi.sendUserMessage(text, { deliverAs: "steer" });
      }
    } catch {}
  }

  async function routeInboxLine(line: string): Promise<void> {
    const parsed = parseInboxLine(line);
    if (await routeInboxCommand(parsed)) return;
    const text = typeof parsed === "string" ? parsed : parsed?.text;
    if (text) deliverSteerText(text);
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
    const candidate = path.join(PRESENCE_ROOT, key);
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

    try {
      fs.writeFileSync(inboxFile, ""); // ignore steers from a previous life
    } catch {}
    poll = setInterval(() => {
      void drainInbox().catch(() => {});
    }, INBOX_POLL_MS);
    poll.unref?.();
    try {
      watcher = fs.watch(dir, (_ev, filename) => {
        if (filename === "inbox.jsonl") void drainInbox().catch(() => {});
      });
      watcher.unref?.();
    } catch {}
  }

  function readJson(file: string): any | undefined {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
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

  function peerModel(status: any): string | undefined {
    if (!status?.model?.provider || !status?.model?.id) return undefined;
    return `${status.model.provider}/${status.model.id}:${status.thinking ?? ""}`;
  }

  function livePeers(ownKey: string) {
    try {
      return fs.readdirSync(PRESENCE_ROOT, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name !== ownKey)
        .map((entry) => {
          const peerDir = path.join(PRESENCE_ROOT, entry.name);
          const status = readJson(path.join(peerDir, "status.json"));
          return { key: entry.name, dir: peerDir, status };
        })
        .filter((peer) => peer.status && isPidAlive(peer.status.pid));
    } catch {
      return [];
    }
  }

  function resolvePeer(target: string, ownKey: string) {
    const peers = livePeers(ownKey);
    const exact = peers.find((peer) => peer.key === target);
    if (exact) return { peer: exact };
    const matches = peers.filter((peer) => peer.key.endsWith(target));
    if (matches.length === 1) return { peer: matches[0] };
    if (matches.length > 1) {
      return { error: `error: ambiguous target. Candidates: ${matches.map((peer) => peer.key).join(", ")}` };
    }
    return { error: `error: target not found. Candidates: ${peers.map((peer) => peer.key).join(", ")}` };
  }

  function ownPresenceKey(ctx: any): string {
    initPresence(ctx?.hasUI === true);
    return state.key || computeKey(ctx?.hasUI === true);
  }

  function peerSummaries(ownKey: string) {
    return livePeers(ownKey).map((peer) => ({
      key: peer.key,
      state: peer.status.state,
      model: peerModel(peer.status),
      task: peer.status.task,
      lastText: truncate(String(peer.status.lastText ?? ""), 120),
      cost: peer.status.cost,
      updatedAt: peer.status.updatedAt,
    }));
  }

  function sendPeerMessage(target: string, text: string, ownKey: string): string {
    const resolved = resolvePeer(target, ownKey);
    if (resolved.error) return resolved.error;
    fs.appendFileSync(
      path.join(resolved.peer.dir, "inbox.jsonl"),
      `${JSON.stringify({ text: `[from ${ownKey}] ${text}`, ts: new Date().toISOString() })}\n`,
    );
    return `sent to ${resolved.peer.key}`;
  }

  function formatPeerLines(peers: ReturnType<typeof peerSummaries>): string {
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
      if (resolved.error) {
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
        if (typeof answer?.text === "string") {
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

  function toolResult(text: string) {
    return { content: [{ type: "text", text }] };
  }

  function noOrchestratorAnswer() {
    return toolResult("no answer from orchestrator (timeout) — proceed with your best judgment and note the open question in your final reply.");
  }

  async function executeTool(action: () => string | Promise<string>, error: string) {
    try {
      return toolResult(await action());
    } catch {
      return toolResult(error);
    }
  }

  function writeResult(text: string, details: any = {}): void {
    atomicWrite(resultFile, {
      schema: SCHEMA_VERSION,
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
    handler: async (_args, ctx) => {
      try {
        const peers = peerSummaries(ownPresenceKey(ctx));
        ctx.ui.notify(peers.length ? formatPeerLines(peers) : "no live peers", "info");
      } catch {
        ctx.ui.notify("no live peers", "info");
      }
    },
  });

  pi.registerCommand("tell", {
    description: "Send a message to a peer agent: /tell <target> <message>",
    handler: async (args, ctx) => {
      try {
        const [target, ...message] = String(args ?? "").trim().split(/\s+/);
        const text = message.join(" ");
        if (!target || !text) {
          ctx.ui.notify("error: usage /tell <target> <message>", "error");
          return;
        }
        const result = sendPeerMessage(target, text, ownPresenceKey(ctx));
        ctx.ui.notify(result, result.startsWith("sent to ") ? "info" : "error");
      } catch {
        ctx.ui.notify("error: unable to send peer message", "error");
      }
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
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
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
        const notificationTitle = `NEEDS ANSWER: ${state.key}`;
        const notificationBody = truncate(params.question, 60);
        notifyHerdr(notificationTitle, notificationBody);

        const answer = await waitForOrchestratorAnswer(answerFile, signal, () => {
          notifyHerdr(notificationTitle, notificationBody);
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
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      return executeTool(
        () => JSON.stringify(peerSummaries(ownPresenceKey(ctx))),
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
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      return executeTool(
        () => sendPeerMessage(params.target, params.text, ownPresenceKey(ctx)),
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
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      return executeTool(() => {
        initPresence(ctx?.hasUI === true);
        const ownKey = state.key || computeKey(ctx?.hasUI === true);
        const resolved = resolvePeer(params.target, ownKey);
        if (resolved.error) return resolved.error;
        const result = readJson(path.join(resolved.peer.dir, "result.json"));
        return JSON.stringify({
          key: resolved.peer.key,
          state: resolved.peer.status.state,
          model: peerModel(resolved.peer.status),
          text: result?.text ?? resolved.peer.status.lastText ?? "",
        });
      }, "error: unable to read peer agent");
    },
  });

  // ---- lifecycle ----
  pi.on("session_start", (_event, ctx) => {
    lastCtx = ctx;
    initPresence(ctx?.hasUI === true);
    updateSessionRef(ctx);
    updateModel(ctx);
    writeStatus();
    void readHerdrIdentity().catch(() => {});
    let heartbeatTicks = 0;
    heartbeat = setInterval(() => {
      try {
        heartbeatTicks += 1;
        updateSessionRef(lastCtx);
        updateModel(lastCtx);
        updateContextUsage(lastCtx);
        if (heartbeatTicks % 10 === 0) void readHerdrIdentity().catch(() => {});
        writeStatus();
      } catch {}
    }, HEARTBEAT_MS);
    heartbeat.unref?.();
  });

  pi.on("model_select", (event) => {
    if (event?.model?.id) state.model = { provider: event.model.provider, id: event.model.id };
    writeStatus();
  });

  pi.on("thinking_level_select", (event) => {
    if (typeof event?.level === "string") state.thinking = event.level;
    writeStatus();
  });

  pi.on("before_agent_start", (event, ctx) => {
    lastCtx = ctx;
    if (typeof event?.prompt === "string" && event.prompt.trim()) {
      state.task = truncate(event.prompt, TASK_MAX);
    }
  });

  pi.on("agent_start", (_event, ctx) => {
    lastCtx = ctx;
    initPresence(ctx?.hasUI === true);
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

  pi.on("turn_end", (_event, ctx) => {
    lastCtx = ctx;
    state.turns += 1;
    updateContextUsage(ctx);
    writeStatus();
  });

  pi.on("message_end", (event, ctx) => {
    lastCtx = ctx;
    const message = event?.message;
    if (message?.role !== "assistant") return;
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

  function currentFileCandidate(args: any): string | undefined {
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

  function handleToolExecutionStart(event: any): void {
    const name = String(event?.toolName ?? "");
    const previousTool = state.lastTool;
    if (name) state.lastTool = name;
    const file = currentFileCandidate(event?.args ?? {});
    if (file && file !== state.currentFile) {
      state.currentFile = file;
    }
    if (shouldWriteToolStatus(previousTool, state.lastTool, file)) {
      writeStatus();
    }
  }

  pi.on("tool_execution_start", handleToolExecutionStart);

  function finalFailedAssistantMessage(messages: any[]): any | undefined {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message?.role !== "assistant") continue;
      if (message.stopReason !== "error" && message.stopReason !== "aborted") return undefined;
      return message;
    }
    return undefined;
  }

  function failedAssistantError(message: any): string {
    if (typeof message.errorMessage === "string" && message.errorMessage.trim()) {
      return message.errorMessage;
    }
    return message.stopReason === "aborted" ? "aborted" : "error";
  }

  function recordFailedAgentRun(message: any, ctx: any): void {
    const stopReason = message.stopReason;
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
  function handleAgentEnd(event: any, ctx: any): void {
    lastCtx = ctx;
    const messages = event?.messages;
    if (!Array.isArray(messages)) return;
    const message = finalFailedAssistantMessage(messages);
    if (message) recordFailedAgentRun(message, ctx);
  }

  pi.on("agent_end", handleAgentEnd);

  function completeSettledAgentRun(ctx: any): void {
    state.state = lastFullText ? "done" : "idle";
    state.finishedAt = new Date().toISOString();
    updateContextUsage(ctx);
    if (lastFullText && dir) {
      writeResult(lastFullText);
    }
    if (pendingHandoff && runFullText) {
      deliverPendingHandoff(runFullText, state.key || computeKey(ctx?.hasUI === true));
    }
    writeStatus();
  }

  // agent_settled fires only when pi will not auto-continue (no retry/compact
  // continuation pending) — the real "done" signal, unlike agent_end.
  function handleAgentSettled(_event: any, ctx: any): void {
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

  pi.events?.on?.("herdr:blocked", (data) => {
    if (data?.active) {
      if (blockedCount === 0 && !blockedNotified) {
        notifyHerdr(`NEEDS INPUT: ${state.key || computeKey(!!HERDR_PANE_ID)}`, truncate(String(data.label ?? ""), 60));
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
    if (heartbeat) clearInterval(heartbeat);
    if (poll) clearInterval(poll);
    try {
      watcher?.close();
    } catch {}
    state.state = "exited";
    writeStatus();
  });
}
