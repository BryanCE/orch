import { closeSync, mkdirSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";
import { join } from "node:path";

import { processInstanceMatches, processStartToken } from "../process-identity.ts";
import { errnoCode, sleep } from "../util.ts";

export interface CommandLock {
  pid: number;
  start_token: string;
  holder: string;
  note?: string;
  acquired_at: number;
}

interface CommandLockOptions {
  holder: string;
  note?: string;
  timeoutMs?: number;
  pollMs?: number;
}

const LOCK_NAME = "cmd-lock.json";
const DEFAULT_TIMEOUT_MS = 600_000;
const DEFAULT_POLL_MS = 500;

function normalizeCommandText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function matchesLockedCommand(argv: readonly string[], patterns: readonly string[]): boolean {
  const command = normalizeCommandText(argv.join(" "));
  return patterns.some((pattern) => {
    const prefix = normalizeCommandText(pattern);
    return prefix.length > 0 && (command === prefix || command.startsWith(prefix + " "));
  });
}

function lockPath(orchDir: string): string {
  return join(orchDir, LOCK_NAME);
}

function loadLock(path: string): CommandLock | null {
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!value || typeof value !== "object") return null;
    const record = value as Partial<CommandLock>;
    if (typeof record.pid !== "number" || !Number.isInteger(record.pid) || typeof record.start_token !== "string" || typeof record.holder !== "string" || typeof record.acquired_at !== "number") return null;
    return { pid: record.pid, start_token: record.start_token, holder: record.holder, ...(record.note === undefined ? {} : { note: record.note }), acquired_at: record.acquired_at };
  } catch {
    return null;
  }
}

function createLock(path: string, record: CommandLock): boolean {
  try {
    const fd = openSync(path, "wx");
    try {
      writeSync(fd, JSON.stringify(record));
    } finally {
      closeSync(fd);
    }
    return true;
  } catch (error: unknown) {
    if (errnoCode(error) === "EEXIST") return false;
    throw error;
  }
}

function reapLock(path: string, lock: CommandLock): boolean {
  if (processInstanceMatches(lock.pid, lock.start_token)) return false;
  try {
    unlinkSync(path);
    return true;
  } catch (error: unknown) {
    if (errnoCode(error) === "ENOENT") return false;
    throw error;
  }
}

export async function acquireCommandLock(orchDir: string, options: CommandLockOptions): Promise<CommandLock> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const path = lockPath(orchDir);
  mkdirSync(orchDir, { recursive: true });
  const started = Date.now();
  const startToken = processStartToken(process.pid);
  if (!startToken) throw new Error("cannot identify current process instance for command lock");
  const record: CommandLock = { pid: process.pid, start_token: startToken, holder: options.holder, ...(options.note === undefined ? {} : { note: options.note }), acquired_at: started };
  while (Date.now() - started <= timeoutMs) {
    if (createLock(path, record)) return record;
    const current = loadLock(path);
    if (current && reapLock(path, current)) continue;
    if (!current) {
      try {
        unlinkSync(path);
        continue;
      } catch (error: unknown) {
        if (errnoCode(error) !== "ENOENT") throw error;
      }
    }
    if (Date.now() - started >= timeoutMs) break;
    await sleep(pollMs);
  }
  const holder = loadLock(path);
  const heldBy = holder ? `${holder.holder} (pid ${holder.pid})` : "an unknown holder";
  throw new Error(`timed out after ${timeoutMs}ms waiting for command lock held by ${heldBy}`);
}

export function releaseCommandLock(orchDir: string, pid = process.pid, startToken = processStartToken(pid)): boolean {
  const path = lockPath(orchDir);
  const current = loadLock(path);
  if (!current || current.pid !== pid || !startToken || current.start_token !== startToken) return false;
  try {
    unlinkSync(path);
    return true;
  } catch (error: unknown) {
    if (errnoCode(error) === "ENOENT") return false;
    throw error;
  }
}

export function readCommandLock(orchDir: string): CommandLock | null {
  return loadLock(lockPath(orchDir));
}

/** The current holder only when its process instance is still alive. */
export function readLiveCommandLock(orchDir: string): CommandLock | null {
  const lock = loadLock(lockPath(orchDir));
  return lock && processInstanceMatches(lock.pid, lock.start_token) ? lock : null;
}
