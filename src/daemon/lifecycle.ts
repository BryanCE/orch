import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import { orchDir as resolveOrchDir } from "../presence/store.ts";
import { packageRoot } from "../util.ts";

const LOCK_NAME = "orchd.lock";
const SOCKET_NAME = "orchd.sock";
const LOG_NAME = "orchd.log";
const HASH_LENGTH = 12;

interface LockRecord {
  pid: number;
  codeHash: string;
  startedAt: string;
  startToken?: string;
}

export type DaemonLock = Pick<LockRecord, "pid" | "codeHash" | "startToken">;

export interface DaemonCodeSkew {
  daemonHash: string;
  diskHash: string;
}

/** Read the exact live-daemon code-hash skew used by doctor. */
/** The orchd entrypoint every caller starts, re-execs, or verifies. */
export function daemonEntrypoint(): string {
  return process.env.ORCHD_ENTRYPOINT ?? path.join(packageRoot(), "dist", "daemon", "orchd.js");
}

export function readDaemonCodeSkew(orchDir: string, entrypoint: string): DaemonCodeSkew | null {
  const lock = readDaemonLock(orchDir);
  if (!lock || !processIsAlive(lock.pid)) return null;
  const diskHash = computeCodeHash(entrypoint);
  return lock.codeHash === diskHash ? null : { daemonHash: lock.codeHash, diskHash };
}

/** A synchronous socket answer check supplied by the RPC layer (and by tests). */
export type SocketProbe = (socketPath: string) => boolean;

function lockPath(orchDir: string): string {
  return path.join(orchDir, LOCK_NAME);
}

function socketPath(orchDir: string): string {
  return path.join(orchDir, SOCKET_NAME);
}

function logPath(orchDir: string): string {
  return path.join(orchDir, LOG_NAME);
}

function currentCodeHash(): string {
  const entrypoint = process.env.ORCHD_ENTRYPOINT ?? process.argv[1];
  if (!entrypoint || !existsSync(entrypoint)) return "unknown";
  return computeCodeHash(entrypoint);
}

function processIsAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { return process.kill(pid, 0), true; }
  catch (error: unknown) { return (error as NodeJS.ErrnoException).code !== "ESRCH"; }
}

/** Read one field from a process-reporting tool; undefined when it cannot answer. */
function readProcessField(command: string, args: string[]): string | undefined {
  try {
    const output = execFileSync(command, args, { encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"] });
    return output.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Field 22 of /proc/<pid>/stat: the process's start time in clock ticks. */
function linuxStartTicks(pid: number): string | undefined {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const closingParen = stat.lastIndexOf(")");
    if (closingParen < 0) return undefined;
    return stat.slice(closingParen + 2).trim().split(/\s+/)[19];
  } catch {
    return undefined;
  }
}

/**
 * A token identifying one process INSTANCE, so a pid the OS has recycled can
 * never pass for the daemon that took the lock. Every platform orch runs on
 * reports one; undefined only when the OS refuses, and callers treat that as
 * "unproven", never as "matches".
 */
function processStartToken(pid: number): string | undefined {
  if (process.platform === "linux") return linuxStartTicks(pid);
  if (process.platform === "win32") {
    return readProcessField("powershell", ["-NoProfile", "-NonInteractive", "-Command", `(Get-Process -Id ${pid}).StartTime.Ticks`]);
  }
  return readProcessField("ps", ["-o", "lstart=", "-p", String(pid)]);
}

function processIdentityMatches(record: LockRecord): boolean {
  if (!processIsAlive(record.pid)) return false;
  if (!record.startToken) return true;
  const currentToken = processStartToken(record.pid);
  return currentToken === undefined || currentToken === record.startToken;
}

/**
 * The daemon's pid, but ONLY when the live process is provably the instance that
 * took the lock. Orch must never signal an unproven pid: a lock left behind by a
 * crashed daemon names a number the OS is free to hand to anything, and killing
 * it kills a stranger.
 */
export function provenDaemonPid(orchDir: string): number | undefined {
  const record = readLock(lockPath(orchDir));
  if (!record?.startToken || !processIsAlive(record.pid)) return undefined;
  return processStartToken(record.pid) === record.startToken ? record.pid : undefined;
}

function readLock(file: string): LockRecord | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    const record = parsed as Partial<LockRecord>;
    if (
      typeof record.pid !== "number" || !Number.isInteger(record.pid) || record.pid <= 0 ||
      typeof record.codeHash !== "string" ||
      typeof record.startedAt !== "string" ||
      (record.startToken !== undefined && typeof record.startToken !== "string")
    ) {
      return undefined;
    }
    return record as LockRecord;
  } catch {
    return undefined;
  }
}

/** Read the daemon lock identity, returning null when it is absent or recycled. */
export function readDaemonLock(orchDir: string): DaemonLock | null {
  const record = readLock(lockPath(orchDir));
  if (!record || processIsAlive(record.pid) && !processIdentityMatches(record)) return null;
  const lock: DaemonLock = { pid: record.pid, codeHash: record.codeHash };
  if (record.startToken !== undefined) lock.startToken = record.startToken;
  return lock;
}

function canReclaim(record: LockRecord | undefined, probe: SocketProbe, orchDir: string): boolean {
  if (!record || processIdentityMatches(record)) return false;
  try {
    return !probe(socketPath(orchDir));
  } catch {
    // A failed probe is not proof that another daemon is absent.
    return false;
  }
}

/** Acquire the one-per-host daemon lock. Returns false when another instance owns it. */
export function acquireDaemonLock(orchDir: string, socketProbe: SocketProbe = () => false): boolean {
  mkdirSync(orchDir, { recursive: true });
  const file = lockPath(orchDir);
  const record: LockRecord = {
    pid: process.pid,
    codeHash: currentCodeHash(),
    startedAt: new Date().toISOString(),
    startToken: processStartToken(process.pid),
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      writeFileSync(file, `${JSON.stringify(record)}\n`, { encoding: "utf8", flag: "wx" });
      return true;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (!canReclaim(readLock(file), socketProbe, orchDir)) return false;
      try {
        unlinkSync(file);
      } catch (unlinkError: unknown) {
        if ((unlinkError as NodeJS.ErrnoException).code !== "ENOENT") return false;
      }
    }
  }
  return false;
}

/** Release the daemon lock. Missing locks are already released. */
export function releaseDaemonLock(orchDir: string): void {
  try {
    unlinkSync(lockPath(orchDir));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

function commandFor(entrypoint: string, args: string[]): [string, string[]] {
  if (/\.(?:[cm]?jsx?|[cm]?tsx?)$/i.test(entrypoint)) {
    return [process.execPath, [entrypoint, ...args]];
  }
  return [entrypoint, args];
}

/** Spawn orchd detached, redirecting all output to `$ORCH_DIR/orchd.log`. */
export function daemonize(
  entrypoint: string,
  args: string[] = [],
  orchDir = resolveOrchDir(),
): number {
  mkdirSync(orchDir, { recursive: true });
  const log = openSync(logPath(orchDir), "a");
  const [command, commandArgs] = commandFor(entrypoint, args);
  try {
    const child = spawn(command, commandArgs, {
      detached: true,
      stdio: ["ignore", log, log],
      env: process.env,
    });
    child.unref();
    if (child.pid === undefined) throw new Error("daemon process did not provide a pid");
    return child.pid;
  } finally {
    closeSync(log);
  }
}

/** Spawn orchd attached to the current terminal (the supervisor/`--fg` mode). */
export function runForeground(entrypoint: string, args: string[] = []): number {
  const [command, commandArgs] = commandFor(entrypoint, args);
  const child = spawn(command, commandArgs, {
    detached: false,
    stdio: "inherit",
    env: process.env,
  });
  if (child.pid === undefined) throw new Error("foreground process did not provide a pid");
  return child.pid;
}

/** Re-run this entrypoint with unchanged argv, handing the lock to the replacement. */
export function reexecSelf(
  orchDir = resolveOrchDir(),
): never {
  releaseDaemonLock(orchDir);
  const replacement = spawn(process.execPath, process.argv.slice(1), {
    detached: true,
    env: process.env,
    stdio: "inherit",
  });
  replacement.unref();
  process.exit(0);
}

/** Return a short SHA-256 digest of an entrypoint's contents. */
export function computeCodeHash(entryFile: string): string {
  return createHash("sha256").update(readFileSync(entryFile)).digest("hex").slice(0, HASH_LENGTH);
}
