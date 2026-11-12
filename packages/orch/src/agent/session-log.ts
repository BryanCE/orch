import { appendFileSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
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

function ensureParentDirectory(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
}

/** Creates an agent's session log, empty, when it does not exist. */
export function openSessionLog(path: string): void {
  ensureParentDirectory(path);
  appendFileSync(path, "", "utf8");
}

/** The suffix of the sibling name a session log is set aside under. */
export const SET_ASIDE_SUFFIX = ".aside";

/** A session log set aside while a new one is written. */
export interface SetAsideLog {
  /** Deletes the log that was set aside. */
  keep(): void;
  /** Puts the log that was set aside back over the new one. */
  restore(): void;
}

/** Sets an agent's session log aside under a sibling name and creates the log empty. */
export function setAsideSessionLog(path: string): SetAsideLog {
  const aside = `${path}${SET_ASIDE_SUFFIX}`;
  ensureParentDirectory(path);
  const held = existsSync(path);
  if (held) renameSync(path, aside);
  writeFileSync(path, "", "utf8");
  return {
    keep() {
      rmSync(aside, { force: true });
    },
    restore() {
      if (held) renameSync(aside, path);
    },
  };
}

/** Append normalized session entries as JSONL, creating their parent directory. */
export function appendSessionEntries(path: string, entries: readonly SessionViewEntry[]): void {
  if (entries.length === 0) return;
  ensureParentDirectory(path);
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
