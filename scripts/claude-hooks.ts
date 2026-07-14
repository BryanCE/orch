#!/usr/bin/env bun
/**
 * Claude Code settings.json hook shim for orch presence.
 *
 * Usage: bun scripts/claude-hooks.ts SessionStart|Stop|Notification
 * Claude sends the hook payload as JSON on stdin. This file is intentionally
 * standalone because it may be copied into ~/.claude or run outside this repo.
 */
import { homedir } from "node:os";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ORCH_DIR = process.env.ORCH_DIR ?? join(homedir(), ".orch");
const PRESENCE_ROOT = join(ORCH_DIR, "agents");
const SCHEMA_VERSION = 2;
const AGENT_ID = "claude";
const MAX_TEXT = 400;
const MAX_TASK = 200;
type JsonRecord = Record<string, any>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textValue(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value.trim();
}

function truncate(value: string | undefined, max: number): string | undefined {
  const text = textValue(value);
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function contentText(value: unknown): string | undefined {
  if (typeof value === "string") return textValue(value);
  if (Array.isArray(value)) {
    const parts = value.map(contentText).filter((part): part is string => !!part);
    return parts.length ? parts.join("\n") : undefined;
  }
  if (!isRecord(value)) return undefined;
  for (const key of ["text", "output_text", "output-text", "content"]) {
    const text = contentText(value[key]);
    if (text !== undefined) return text;
  }
  return undefined;
}

function assistantText(record: JsonRecord): string | undefined {
  const message = isRecord(record.message) ? record.message : undefined;
  const role = record.role ?? message?.role;
  if (role === "assistant" || record.type === "assistant" || record.type === "assistant_message") {
    return contentText(record.content ?? message?.content ?? record.text ?? message?.text);
  }
  for (const key of ["data", "payload", "item"]) {
    if (isRecord(record[key])) {
      const text = assistantText(record[key]);
      if (text !== undefined) return text;
    }
  }
  return undefined;
}

function lastAssistant(transcriptPath: string | undefined): string | undefined {
  if (!transcriptPath) return undefined;
  let raw: string;
  try {
    raw = readFileSync(transcriptPath, "utf8");
  } catch {
    return undefined;
  }
  let last: string | undefined;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      const records = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of records) {
        if (!isRecord(item)) continue;
        const text = assistantText(item);
        if (text !== undefined) last = text;
      }
    } catch {
      // Ignore non-JSON transcript/log lines.
    }
  }
  return last;
}

function readStdin(): JsonRecord {
  try {
    const raw = readFileSync(0, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function numericPid(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

function agentPid(input: JsonRecord): number {
  return numericPid(input.pid)
    ?? numericPid(process.env.CLAUDE_PID)
    // A hook is short-lived; its parent is the long-lived Claude process.
    ?? numericPid(process.ppid)
    ?? process.pid;
}

function safeKey(value: string): string {
  const key = value.replace(/[\\/]/g, "_").trim();
  return key && key !== "." && key !== ".." ? key : `session-${process.pid}`;
}

function presenceDirectoryName(key: string): string {
  if (process.platform !== "win32") return key;
  return key.replaceAll("%", "%25").replaceAll(":", "%3A");
}

function eventName(argument: string | undefined, input: JsonRecord): string {
  return String(argument ?? input.hook_event_name ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

function modelValue(input: JsonRecord): { provider?: string; id?: string } | undefined {
  const model = input.model ?? input.model_id ?? input.modelId;
  if (typeof model === "string" && model.trim()) return { provider: "anthropic", id: model.trim() };
  if (isRecord(model) && typeof model.id === "string") {
    return { provider: typeof model.provider === "string" ? model.provider : "anthropic", id: model.id };
  }
  return undefined;
}

function atomicWrite(file: string, value: unknown): void {
  const temporary = `${file}.tmp-${process.pid}`;
  try {
    writeFileSync(temporary, JSON.stringify(value, null, 2));
    renameSync(temporary, file);
  } catch {
    try { writeFileSync(file, JSON.stringify(value, null, 2)); } catch {}
  }
}

function loadStatus(file: string): JsonRecord {
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

const input = readStdin();
const cliEvent = process.argv.slice(2).find((argument) => !argument.startsWith("-"));
const event = eventName(cliEvent, input);
const pid = agentPid(input);
const paneId = textValue(process.env.HERDR_PANE_ID) ?? null;
const key = safeKey(paneId ?? `session-${pid}`);
const directory = join(PRESENCE_ROOT, presenceDirectoryName(key));
try {
  mkdirSync(directory, { recursive: true });
} catch {
  process.exit(0);
}

const statusFile = join(directory, "status.json");
const transcriptPath = textValue(input.transcript_path ?? input.transcriptPath);
const now = new Date().toISOString();
const previous = loadStatus(statusFile);
const model = modelValue(input) ?? previous.model;
const task = truncate(input.task ?? input.prompt ?? input.initial_prompt, MAX_TASK) ?? previous.task;
const sessionId = textValue(input.session_id ?? input.sessionId) ?? previous.sessionId;
const existingText = textValue(previous.lastText);
const transcriptText = lastAssistant(transcriptPath ?? textValue(previous.sessionPath));
const lastText = truncate(transcriptText ?? existingText, MAX_TEXT);

const status: JsonRecord = {
  ...previous,
  schema: SCHEMA_VERSION,
  agent: AGENT_ID,
  key,
  paneId,
  pid,
  cwd: textValue(input.cwd) ?? previous.cwd ?? process.cwd(),
  model,
  task,
  sessionPath: transcriptPath ?? previous.sessionPath,
  sessionId,
  cost: typeof previous.cost === "number" ? previous.cost : 0,
  tokens: previous.tokens ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  turns: typeof previous.turns === "number" ? previous.turns : 0,
  lastText,
  updatedAt: now,
};

if (event === "sessionstart" || event === "sessionstarted") {
  status.state = "working";
  status.startedAt = previous.startedAt ?? now;
  delete status.finishedAt;
  delete status.asking;
  delete status.blockedMessage;
} else if (event === "notification") {
  const message = textValue(input.message ?? input.notification ?? input.question) ?? "Claude is waiting for input";
  const askingId = textValue(input.id ?? input.request_id ?? input.requestId) ?? `claude-${pid}-${Date.now()}`;
  status.state = "blocked";
  status.blockedMessage = message;
  status.asking = { question: truncate(message, MAX_TASK) ?? message, id: askingId, ts: now };
} else if (event === "stop" || event === "stopped") {
  status.state = transcriptText || existingText ? "done" : "idle";
  status.finishedAt = now;
  delete status.asking;
  delete status.blockedMessage;
  if (transcriptText) {
    atomicWrite(join(directory, "result.json"), {
      schema: SCHEMA_VERSION,
      agent: AGENT_ID,
      key,
      text: transcriptText,
      sessionPath: status.sessionPath,
      model: status.model,
      cost: status.cost,
      finishedAt: now,
    });
  }
} else {
  // Unknown hook names should not corrupt a previously useful status row.
  process.exit(0);
}

atomicWrite(statusFile, status);
