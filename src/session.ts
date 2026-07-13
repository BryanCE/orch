import { readFileSync } from "node:fs";

export interface SessionData {
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
  entries: any[];
}

export function blockText(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((block) => block && typeof block === "object" && block.type === "text")
      .map((block) => block.text ?? "")
      .join("\n");
  }
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
    let entry: any;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    data.entries.push(entry);
    if (entry.type === "model_change") {
      lastModelChange = entry.modelId ?? lastModelChange;
      if (entry.provider) lastAsstProvider = entry.provider;
      continue;
    }
    if (entry.type === "thinking_level_change") {
      lastThinkChange = entry.thinkingLevel ?? lastThinkChange;
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
