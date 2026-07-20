import { closeSync, mkdirSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";
import { join } from "node:path";

export interface CommandLock {
  pid: number;
  holder: string;
  note?: string;
  ts: number;
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

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function processIsAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: unknown) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function loadLock(path: string): CommandLock | null {
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!value || typeof value !== "object") return null;
    const record = value as Partial<CommandLock>;
    if (typeof record.pid !== "number" || !Number.isInteger(record.pid) || typeof record.holder !== "string" || typeof record.ts !== "number") return null;
    return { pid: record.pid, holder: record.holder, ...(record.note === undefined ? {} : { note: record.note }), ts: record.ts };
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
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
}

function reapLock(path: string, lock: CommandLock): boolean {
  if (processIsAlive(lock.pid)) return false;
  try {
    unlinkSync(path);
    return true;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export async function acquireCommandLock(orchDir: string, options: CommandLockOptions): Promise<CommandLock> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const path = lockPath(orchDir);
  mkdirSync(orchDir, { recursive: true });
  const started = Date.now();
  const record: CommandLock = { pid: process.pid, holder: options.holder, ...(options.note === undefined ? {} : { note: options.note }), ts: started };
  while (Date.now() - started <= timeoutMs) {
    if (createLock(path, record)) return record;
    const current = loadLock(path);
    if (current && reapLock(path, current)) continue;
    if (Date.now() - started >= timeoutMs) break;
    await pause(pollMs);
  }
  const holder = loadLock(path);
  const heldBy = holder ? `${holder.holder} (pid ${holder.pid})` : "an unknown holder";
  throw new Error(`timed out after ${timeoutMs}ms waiting for command lock held by ${heldBy}`);
}

export function releaseCommandLock(orchDir: string, pid = process.pid): boolean {
  const path = lockPath(orchDir);
  const current = loadLock(path);
  if (!current || current.pid !== pid) return false;
  try {
    unlinkSync(path);
    return true;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export function readCommandLock(orchDir: string): CommandLock | null {
  return loadLock(lockPath(orchDir));
}

/** The current holder only when its pid is still alive; null when free or held by a dead pid. */
export function readLiveCommandLock(orchDir: string): CommandLock | null {
  const lock = loadLock(lockPath(orchDir));
  return lock && processIsAlive(lock.pid) ? lock : null;
}
