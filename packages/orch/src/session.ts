import { readFileSync } from "node:fs";
import { isRecord } from "./util.ts";
import type { ContentBlock, SessionContent, SessionEntry, SessionMessage, SessionUsage, TextContentBlock, ToolCallContentBlock } from "./types/core.ts";

interface SessionData {
  exists: boolean;
  path: string;
  model: string | null;
  provider: string | null;
  thinking: string | null;
  task: string | null;
  lastAssistant: string | null;
  cost: number;
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
  turns: number;
  entries: SessionEntry[];
}

function isContentBlock(value: unknown): value is ContentBlock {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "text") return value.text === undefined || typeof value.text === "string";
  if (value.type === "toolCall") {
    return (value.name === undefined || typeof value.name === "string")
      && (value.arguments === undefined || isRecord(value.arguments));
  }
  return true;
}

function isTextContentBlock(value: unknown): value is TextContentBlock {
  return isContentBlock(value) && value.type === "text";
}

export function isToolCallContentBlock(value: unknown): value is ToolCallContentBlock {
  return isContentBlock(value) && value.type === "toolCall";
}

function isSessionContent(value: unknown): value is SessionContent {
  return typeof value === "string" || (Array.isArray(value) && value.every(isContentBlock));
}

function isSessionUsage(value: unknown): value is SessionUsage {
  if (!isRecord(value)) return false;
  const numeric = ["input", "output", "cacheRead", "cacheWrite"];
  if (numeric.some((key) => value[key] !== undefined && typeof value[key] !== "number")) return false;
  if (value.cost !== undefined && typeof value.cost !== "number") {
    if (!isRecord(value.cost) || (value.cost.total !== undefined && typeof value.cost.total !== "number")) return false;
  }
  return true;
}

function isOptionalStringField(value: Record<string, unknown>, key: string): boolean {
  return value[key] === undefined || typeof value[key] === "string";
}

function isOptionalBooleanField(value: Record<string, unknown>, key: string): boolean {
  return value[key] === undefined || typeof value[key] === "boolean";
}

function isSessionMessage(value: unknown): value is SessionMessage {
  if (!isRecord(value) || typeof value.role !== "string") return false;
  const strings = ["timestamp", "model", "provider", "toolName"];
  if (!strings.every((key) => isOptionalStringField(value, key))) return false;
  if (value.content !== undefined && !isSessionContent(value.content)) return false;
  if (value.usage !== undefined && !isSessionUsage(value.usage)) return false;
  return isOptionalBooleanField(value, "isError");
}

function isSessionEntry(value: unknown): value is SessionEntry {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.timestamp !== undefined && typeof value.timestamp !== "string") return false;
  if (value.modelId !== undefined && typeof value.modelId !== "string") return false;
  if (value.provider !== undefined && typeof value.provider !== "string") return false;
  if (value.thinkingLevel !== undefined && typeof value.thinkingLevel !== "string") return false;
  return value.message === undefined || isSessionMessage(value.message);
}

export function blockText(content: SessionContent | undefined): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.filter(isTextContentBlock).map((block) => block.text ?? "").join("\n");
  return "";
}

function emptySession(path: string | null): SessionData {
  return {
    exists: false, path: path ?? "", model: null, provider: null, thinking: null,
    task: null, lastAssistant: null, cost: 0,
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, turns: 0, entries: [],
  };
}

function readSessionFile(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function parseSessionLine(line: string): SessionEntry | null {
  if (!line.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(line);
    return isSessionEntry(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

interface SessionState {
  lastModelChange: string | null;
  lastThinkChange: string | null;
  lastAsstModel: string | null;
  lastAsstProvider: string | null;
}

function applyModelChange(entry: SessionEntry, state: SessionState): void {
  if (entry.modelId) state.lastModelChange = entry.modelId;
  if (entry.provider) state.lastAsstProvider = entry.provider;
}

function applyThinkingChange(entry: SessionEntry, state: SessionState): void {
  if (entry.thinkingLevel) state.lastThinkChange = entry.thinkingLevel;
}

function applyAssistantUsage(data: SessionData, usage: SessionUsage): void {
  data.tokens.input += usage.input ?? 0;
  data.tokens.output += usage.output ?? 0;
  data.tokens.cacheRead += usage.cacheRead ?? 0;
  data.tokens.cacheWrite += usage.cacheWrite ?? 0;
  const cost = usage.cost && typeof usage.cost === "object" ? usage.cost.total : usage.cost;
  if (typeof cost === "number") data.cost += cost;
}

function applyAssistantMessage(data: SessionData, message: SessionMessage, state: SessionState): void {
  data.turns++;
  if (message.model) state.lastAsstModel = message.model;
  if (message.provider) state.lastAsstProvider = message.provider;
  const text = blockText(message.content);
  if (text.trim()) data.lastAssistant = text;
  if (message.usage) applyAssistantUsage(data, message.usage);
}

function applyMessage(data: SessionData, message: SessionMessage, state: SessionState): void {
  if (message.role === "user") {
    const text = blockText(message.content);
    if (text.trim()) data.task = text;
    return;
  }
  if (message.role === "assistant") applyAssistantMessage(data, message, state);
}

function applySessionEntry(data: SessionData, entry: SessionEntry, state: SessionState): void {
  data.entries.push(entry);
  if (entry.type === "model_change") {
    applyModelChange(entry, state);
    return;
  }
  if (entry.type === "thinking_level_change") {
    applyThinkingChange(entry, state);
    return;
  }
  if (entry.type === "message" && entry.message) applyMessage(data, entry.message, state);
}

export function parseSession(sessionPath: string | null): SessionData {
  const empty = emptySession(sessionPath);
  if (!sessionPath) return empty;
  const raw = readSessionFile(sessionPath);
  if (raw === null) return empty;
  const data: SessionData = { ...empty, exists: true, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, entries: [] };
  const state: SessionState = { lastModelChange: null, lastThinkChange: null, lastAsstModel: null, lastAsstProvider: null };
  for (const line of raw.split("\n")) {
    const entry = parseSessionLine(line);
    if (entry) applySessionEntry(data, entry, state);
  }
  data.model = state.lastModelChange ?? state.lastAsstModel;
  data.provider = state.lastAsstProvider;
  data.thinking = state.lastThinkChange;
  return data;
}
