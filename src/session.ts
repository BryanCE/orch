import { readFileSync } from "node:fs";
import { isRecord } from "./util.ts";

interface TextContentBlock {
  type: "text";
  text?: string;
}

export interface ToolCallContentBlock {
  type: "toolCall";
  name?: string;
  arguments?: Record<string, unknown>;
}

interface OtherContentBlock {
  type: string;
  [key: string]: unknown;
}

type ContentBlock = TextContentBlock | ToolCallContentBlock | OtherContentBlock;
type SessionContent = string | ContentBlock[];

interface SessionUsage {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  cost?: number | { total?: number };
}

interface SessionMessage {
  role: string;
  timestamp?: string;
  content?: SessionContent;
  model?: string;
  provider?: string;
  usage?: SessionUsage;
  toolName?: string;
  isError?: boolean;
}

export interface SessionEntry {
  type: string;
  timestamp?: string;
  modelId?: string;
  provider?: string;
  thinkingLevel?: string;
  message?: SessionMessage;
}

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

function isSessionMessage(value: unknown): value is SessionMessage {
  if (!isRecord(value) || typeof value.role !== "string") return false;
  if (value.timestamp !== undefined && typeof value.timestamp !== "string") return false;
  if (value.content !== undefined && !isSessionContent(value.content)) return false;
  if (value.model !== undefined && typeof value.model !== "string") return false;
  if (value.provider !== undefined && typeof value.provider !== "string") return false;
  if (value.usage !== undefined && !isSessionUsage(value.usage)) return false;
  if (value.toolName !== undefined && typeof value.toolName !== "string") return false;
  return value.isError === undefined || typeof value.isError === "boolean";
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

export function parseSession(sessionPath: string | null): SessionData {
  const empty: SessionData = {
    exists: false, path: sessionPath ?? "", model: null, provider: null, thinking: null,
    task: null, lastAssistant: null, cost: 0,
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, turns: 0, entries: [],
  };
  if (!sessionPath) return empty;
  let raw: string;
  try {
    raw = readFileSync(sessionPath, "utf8");
  } catch {
    return empty;
  }
  const data: SessionData = { ...empty, exists: true, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, entries: [] };
  let lastModelChange: string | null = null;
  let lastThinkChange: string | null = null;
  let lastAsstModel: string | null = null;
  let lastAsstProvider: string | null = null;
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch {
      continue;
    }
    if (!isSessionEntry(parsed)) continue;
    const entry = parsed;
    data.entries.push(entry);
    if (entry.type === "model_change") {
      if (entry.modelId) lastModelChange = entry.modelId;
      if (entry.provider) lastAsstProvider = entry.provider;
      continue;
    }
    if (entry.type === "thinking_level_change") {
      if (entry.thinkingLevel) lastThinkChange = entry.thinkingLevel;
      continue;
    }
    if (entry.type !== "message" || !entry.message) continue;
    const message = entry.message;
    if (message.role === "user") {
      const text = blockText(message.content);
      if (text.trim()) data.task = text;
    } else if (message.role === "assistant") {
      data.turns++;
      if (message.model) lastAsstModel = message.model;
      if (message.provider) lastAsstProvider = message.provider;
      const text = blockText(message.content);
      if (text.trim()) data.lastAssistant = text;
      const usage = message.usage;
      if (usage) {
        data.tokens.input += usage.input ?? 0;
        data.tokens.output += usage.output ?? 0;
        data.tokens.cacheRead += usage.cacheRead ?? 0;
        data.tokens.cacheWrite += usage.cacheWrite ?? 0;
        const cost = usage.cost && typeof usage.cost === "object" ? usage.cost.total : usage.cost;
        if (typeof cost === "number") data.cost += cost;
      }
    }
  }
  data.model = lastModelChange ?? lastAsstModel;
  data.provider = lastAsstProvider;
  data.thinking = lastThinkChange;
  return data;
}
