import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { isRecord, isUnknownArray } from "../util.ts";
import type { SessionViewEntry, SessionViewToolCall } from "../types/adapter.ts";

function isToolCall(value: unknown): value is SessionViewToolCall {
  return isRecord(value) && typeof value.name === "string" && typeof value.arg === "string";
}

function isSessionViewEntry(value: unknown): value is SessionViewEntry {
  return isRecord(value)
    && (value.role === "user" || value.role === "assistant" || value.role === "tool")
    && (value.text === undefined || typeof value.text === "string")
    && (value.toolCalls === undefined || (isUnknownArray(value.toolCalls) && value.toolCalls.every(isToolCall)))
    && (value.tool === undefined || typeof value.tool === "string")
    && (value.isError === undefined || typeof value.isError === "boolean")
    && (value.timestamp === undefined || typeof value.timestamp === "string");
}

/** Append normalized session entries as JSONL, creating their parent directory. */
export function appendSessionEntries(path: string, entries: readonly SessionViewEntry[]): void {
  if (entries.length === 0) return;
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, entries.map((entry) => `${JSON.stringify(entry)}\n`).join(""), "utf8");
}

/** Parse normalized JSONL entries, rejecting malformed lines by number. */
export function parseSessionLog(text: string): SessionViewEntry[] {
  if (text === "") return [];
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines.map((line, index) => {
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      throw new Error(`Invalid session entry at line ${index + 1}`);
    }
    if (!isSessionViewEntry(value)) throw new Error(`Invalid session entry at line ${index + 1}`);
    return value;
  });
}
