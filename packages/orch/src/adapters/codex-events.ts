// Codex's wire format — its `--json` JSONL stream, its notify payload, and its
// native transcript — parsed in exactly one place. A leaf on purpose: the codex
// notify shim runs in-process under whatever runtime is on PATH and must reach
// these parsers without dragging the adapter's setup-time config and PATH probing
// (and, through those, zod) into its bundle.
import { readFileSync } from "node:fs";
import { isRecord, textValue } from "../util.ts";
import { contentText } from "./transcript.ts";
import type { AgentState } from "./adapter.ts";
import type { CodexResultExtractionInput, SessionView, StateDetectionInput } from "../types/adapter.ts";
import type { JsonRecord } from "../types/core.ts";

/** Codex's notify hook event emitted after an agent turn has settled. */
export const CODEX_TURN_COMPLETE = "agent-turn-complete";

/**
 * Codex does not expose an orch presence writer of its own.  States inferred
 * from process output/session files are therefore marked as fallback data.
 * A notify completion (or permission hook) is the only authoritative signal.
 */
export const CODEX_STATE_FALLBACK_MARKER = "stateFallback" as const;

const COMPLETION_EVENTS = new Set([
  CODEX_TURN_COMPLETE,
  "agent_turn_complete",
  "turn.completed",
  "turn-complete",
  "turn_complete",
]);
const PERMISSION_EVENTS = new Set(["PermissionRequest", "permission-request", "permission_request"]);

function parseRecords(output?: string): JsonRecord[] {
  if (!output?.trim()) return [];
  const records: JsonRecord[] = [];
  const whole = output.trim();
  try {
    const parsed: unknown = JSON.parse(whole);
    if (isRecord(parsed)) records.push(parsed);
    else if (Array.isArray(parsed)) {
      for (const item of parsed) if (isRecord(item)) records.push(item);
    }
  } catch {
    // Codex --json is JSONL; a non-JSON log line is expected and ignored.
  }
  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (isRecord(parsed)) records.push(parsed);
    } catch {
      // Keep scanning JSONL after human-readable CLI output.
    }
  }
  return records;
}

function eventName(record: JsonRecord): string | undefined {
  for (const key of ["type", "event", "event_type", "hook_event_name", "name"]) {
    const value = record[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

function nestedRecords(record: JsonRecord): JsonRecord[] {
  const result: JsonRecord[] = [];
  for (const key of ["payload", "event", "notify", "data", "item", "message"]) {
    const value = record[key];
    if (isRecord(value)) result.push(value);
  }
  return result;
}

function hasEvent(record: JsonRecord, events: ReadonlySet<string>): boolean {
  const name = eventName(record);
  if (name && events.has(name)) return true;
  return nestedRecords(record).some((nested) => hasEvent(nested, events));
}

/** Find the notify payload's direct final assistant field, including nested payloads. */
function notifyText(record: JsonRecord): string | undefined {
  for (const key of ["last-assistant-message", "lastAssistantMessage", "last_assistant_message"]) {
    const value = textValue(record[key]);
    if (value !== undefined) return value;
  }
  for (const nested of nestedRecords(record)) {
    const value = notifyText(nested);
    if (value !== undefined) return value;
  }
  return undefined;
}

/** Extract assistant text from Codex's public JSONL stream or native transcript. */
function assistantText(record: JsonRecord): string | undefined {
  const role = record.role;
  const message = isRecord(record.message) ? record.message : undefined;
  const item = isRecord(record.item) ? record.item : undefined;
  const payload = isRecord(record.payload) ? record.payload : undefined;
  const itemType = typeof item?.type === "string" ? item.type : typeof record.item_type === "string" ? record.item_type : "";
  if (role === "assistant" || message?.role === "assistant" || payload?.role === "assistant") {
    return contentText(record.content ?? message?.content ?? payload?.content ?? record.text);
  }
  if (["agent_message", "assistant_message", "output_text", "message"].includes(itemType)) {
    return contentText(item?.content ?? item?.text ?? record.content ?? record.text);
  }
  for (const nested of nestedRecords(record)) {
    const text = assistantText(nested);
    if (text !== undefined) return text;
  }
  return undefined;
}

function readTextFile(file: string | undefined): string | undefined {
  if (!file) return undefined;
  try {
    return textValue(readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
}

function transcriptResult(file: string | undefined): string | undefined {
  const raw = readTextFile(file);
  if (!raw) return undefined;
  let last: string | undefined;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (isRecord(parsed)) {
        const notify = notifyText(parsed);
        if (notify !== undefined) last = notify;
        const assistant = assistantText(parsed);
        if (assistant !== undefined) last = assistant;
      }
    } catch {
      // Native transcripts are JSONL; malformed lines do not invalidate the tail.
    }
  }
  return last;
}

/** Whether a state relies on a process/session heuristic rather than notify. */
export function codexStateFallback(input: StateDetectionInput): boolean {
  const records = parseRecords(input.output);
  return !records.some((record) => hasEvent(record, COMPLETION_EVENTS) || hasEvent(record, PERMISSION_EVENTS));
}

/**
 * Notify is authoritative for turn completion/permission events.  Without
 * it, process and JSONL signals intentionally expose only coarse fallback
 * states; silence is never interpreted as blocked.
 */
export function detectCodexState(input: StateDetectionInput): AgentState {
  const records = parseRecords(input.output);
  if (records.some((record) => hasEvent(record, PERMISSION_EVENTS))) return "blocked";

  if (input.signal || (input.exitCode !== undefined && input.exitCode !== 0)) return "error";
  const completed = records.some((record) => hasEvent(record, COMPLETION_EVENTS));
  if (completed) return input.exitCode === 0 ? "done" : "idle";
  if (input.exitCode === 0) return "done";
  // A running process is the only available fallback when no notify arrived.
  return "working";
}

/** Notify text → output-last-message file → native JSONL transcript. */
export function extractCodexResult(input: CodexResultExtractionInput): string | undefined {
  const records = parseRecords(input.output);
  for (let index = records.length - 1; index >= 0; index--) {
    const value = notifyText(records[index]!);
    if (value !== undefined) return value;
  }
  const lastMessage = readTextFile(input.lastMessagePath ?? input.outputLastMessagePath);
  if (lastMessage !== undefined) return lastMessage;
  for (let index = records.length - 1; index >= 0; index--) {
    const value = assistantText(records[index]!);
    if (value !== undefined) return value;
  }
  return transcriptResult(input.sessionPath);
}

/**
 * Read the headless `--json` log at the recorded session path (D3a) through
 * the same state/result parsers notify and headless output use. Returns
 * undefined when no log path was recorded — it never scans a directory for
 * one, since headless logs are flat under `$ORCH_DIR/logs/`, not per-agent.
 */
export function readCodexSessionView(sessionPath: string | undefined): SessionView | undefined {
  const output = readTextFile(sessionPath);
  if (output === undefined) return undefined;
  return { state: detectCodexState({ output }), lastText: extractCodexResult({ output }) };
}
