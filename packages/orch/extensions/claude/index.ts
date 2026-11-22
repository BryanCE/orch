/**
 * Claude Code settings.json hook shim for orch presence.
 *
 * Bundled by `bun run build:hooks` into dist/scripts/claude-hooks.js as plain
 * node-compatible ESM. The installed hook runs it with WHATEVER runtime the
 * user has — node, deno, or bun (`installClaudeHooks` probes their PATH);
 * never assume one. Usage: `<runtime> <shim> <HookEvent>`; Claude sends the hook
 * payload as JSON on stdin. Identity parsing stays in its one boundary module
 * (src/shared/agent-id.ts) and every report goes over the daemon socket — this
 * shim holds only Claude's hook vocabulary. The bundle inlines both.
 *
 * Presence fidelity is coarse by design: hooks report over the daemon socket;
 * orchd is down -> the report is dropped and history has a gap; the agent keeps
 * running.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { presenceSession } from "orch/core/daemon/client/report-session.ts";
import { reportOnce, reportUntilAccepted } from "orch/core/daemon/client/socket.ts";
import { isRecord, projectRoot, textValue, truncate, truncateOptional } from "orch/core/util.ts";
import { lastAssistantFromJsonl, trailingQuestion } from "orch/core/shared/transcript.ts";
import { readOnlyGate } from "orch/core/policy/read-only.ts";
import { preToolUse } from "./tool-gate.ts";
import { transcriptUsage, type TranscriptUsage } from "./transcript-usage.ts";
import { CLAUDE_TOOLS } from "./vocabulary.ts";
import type { JsonRecord } from "orch/core/types/core.ts";
import type { StatusPatch } from "orch/core/types/presence.ts";

const MAX_TEXT = 400;

/** Read a claude transcript file to raw JSONL, or undefined when absent/unreadable. */
function readTranscript(transcriptPath: string | undefined): string | undefined {
  if (!transcriptPath) return undefined;
  try {
    return readFileSync(transcriptPath, "utf8");
  } catch {
    return undefined;
  }
}

/** Claude sends the hook payload as JSON on stdin. */
function readJsonStdin(): JsonRecord {
  try {
    const parsed: unknown = JSON.parse(readFileSync(0, "utf8"));
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function eventName(argument: string | undefined, input: JsonRecord): string {
  const hookEventName = textValue(input.hook_event_name) ?? "";
  return (argument ?? hookEventName).toLowerCase().replace(/[^a-z]/g, "");
}

function modelValue(input: JsonRecord): { provider: string; id: string } | undefined {
  const model = input.model ?? input.model_id ?? input.modelId;
  if (typeof model === "string" && model.trim()) return { provider: "anthropic", id: model.trim() };
  if (isRecord(model) && typeof model.id === "string") {
    return { provider: typeof model.provider === "string" ? model.provider : "anthropic", id: model.id };
  }
  return undefined;
}

const input = readJsonStdin();
const session = presenceSession();
if (session.kind === "not-orch") process.exit(0);
const { key, orchDir, settings } = session;
const cliEvent = process.argv.slice(2).find((argument) => !argument.startsWith("-"));
const event = eventName(cliEvent, input);
const transcriptPath = textValue(input.transcript_path ?? input.transcriptPath);
const sessionRefs: StatusPatch = {
  sessionPath: transcriptPath ?? undefined,
  sessionId: textValue(input.session_id ?? input.sessionId) ?? undefined,
  project: projectRoot(),
};

function report(method: "report-status" | "report-result" | "report-prompt" | "question", params: unknown): Promise<boolean> {
  return reportOnce(orchDir, method, params, settings.daemon.report_timeout_ms);
}

function reportStatus(status: StatusPatch): Promise<boolean> {
  return report("report-status", { key, status: { ...sessionRefs, ...status } });
}

/** PreToolUse prints what the tool gate decides. Printing nothing lets the call run as it is. */
function gateToolCall(): void {
  const output = preToolUse(input, settings, readOnlyGate(process.env, textValue(input.cwd) ?? process.cwd(), CLAUDE_TOOLS));
  if (output !== undefined) process.stdout.write(JSON.stringify(output));
}

/** A new, resumed or cleared session waits for its first prompt. A compaction happens
 *  mid-run and keeps the state. The session can start before its spawn registers it. */
async function reportStart(): Promise<void> {
  const waiting: StatusPatch = input.source === "compact" ? {} : { state: "idle", finishedAt: null, blockedMessage: null };
  const status = { ...sessionRefs, ...waiting, model: modelValue(input) };
  await reportUntilAccepted(orchDir, "report-status", { key, status }, {
    timeoutMs: settings.daemon.report_timeout_ms,
    waitMs: settings.timeouts.spawn_attach_ms,
    pollMs: settings.timeouts.spawn_attach_poll_ms,
  });
}

/** The session's token totals and model calls, as a status patch and a result carry them. */
function usageFields(usage: TranscriptUsage | undefined): Pick<StatusPatch, "tokens" | "turns"> {
  return usage === undefined ? {} : { tokens: usage.tokens, turns: usage.turns };
}

/** A turn that ends on a question waits for its answer as the next prompt. */
async function reportQuestion(question: string, text: string, usage: TranscriptUsage | undefined): Promise<void> {
  const notice = { notice: "question", agentId: key, questionId: randomUUID(), question: truncate(question, MAX_TEXT), askedAt: Date.now() };
  await report("question", notice);
  await reportStatus({ state: "asking", blockedMessage: notice.question, lastText: truncateOptional(text, MAX_TEXT), ...usageFields(usage) });
}

/** Every other turn end settles the run, with its final text as the result. */
async function reportDone(text: string | undefined, usage: TranscriptUsage | undefined): Promise<void> {
  const finishedAt = Date.now();
  await reportStatus({ state: "done", finishedAt, blockedMessage: null, lastText: truncateOptional(text, MAX_TEXT) ?? null, ...usageFields(usage) });
  if (text === undefined) return;
  await report("report-result", { key, result: { text, sessionPath: transcriptPath ?? null, finishedAt, ...usageFields(usage) } });
}

/** Claude names the final reply in the Stop payload; the transcript can lag behind it.
 *  The transcript holds the session's token counts; Claude reports no cost. */
async function reportStop(): Promise<void> {
  const transcript = readTranscript(transcriptPath);
  const usage = transcriptUsage(transcript);
  const text = textValue(input.last_assistant_message) ?? lastAssistantFromJsonl(transcript);
  const question = text === undefined ? undefined : trailingQuestion(text);
  if (text !== undefined && question !== undefined) await reportQuestion(question, text, usage);
  else await reportDone(text, usage);
}

async function reportStopFailure(): Promise<void> {
  const reason = [textValue(input.error), textValue(input.error_details)].filter((part) => part !== undefined).join(": ");
  await reportStatus({
    state: "error",
    lastError: reason || "Claude ended the turn on an API error",
    lastText: truncateOptional(textValue(input.last_assistant_message), MAX_TEXT) ?? null,
    finishedAt: Date.now(),
  });
}

/** The hook's matcher passes only the notification types that wait on the human. */
async function reportNotification(): Promise<void> {
  await reportStatus({ state: "asking", blockedMessage: textValue(input.message) ?? "Claude is waiting for input" });
}

async function reportPrompt(): Promise<void> {
  const prompt = textValue(input.prompt);
  if (prompt !== undefined) await report("report-prompt", { key, prompt });
}

const handlers: Record<string, () => void | Promise<void>> = {
  pretooluse: gateToolCall,
  sessionstart: reportStart,
  userpromptsubmit: reportPrompt,
  notification: reportNotification,
  stop: reportStop,
  stopfailure: reportStopFailure,
};
await handlers[event]?.();
