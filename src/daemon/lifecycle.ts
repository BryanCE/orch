import { spawn } from "node:child_process";
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

const LOCK_NAME = "orchd.lock";
const SOCKET_NAME = "orchd.sock";
const LOG_NAME = "orchd.log";
const HASH_LENGTH = 12;

type LockRecord = {
  pid: number;
  codeHash: string;
  startedAt: string;
  startTicks?: string;
};

export type DaemonLock = Pick<LockRecord, "pid" | "codeHash" | "startTicks">;

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

function processStartTicks(pid: number): string | undefined {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const closingParen = stat.lastIndexOf(")");
    if (closingParen < 0) return undefined;
    const fields = stat.slice(closingParen + 2).trim().split(/\s+/);
    return fields[19] || undefined;
  } catch {
    return undefined;
  }
}

function processIdentityMatches(record: LockRecord): boolean {
  if (!processIsAlive(record.pid)) return false;
  if (!record.startTicks) return true;
  const currentTicks = processStartTicks(record.pid);
  return currentTicks === undefined || currentTicks === record.startTicks;
}

function readLock(file: string): LockRecord | undefined {
  try {
    const record = JSON.parse(readFileSync(file, "utf8")) as Partial<LockRecord>;
    if (
      !Number.isInteger(record.pid) ||
      typeof record.codeHash !== "string" ||
      typeof record.startedAt !== "string" ||
      (record.startTicks !== undefined && typeof record.startTicks !== "string")
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
  if (record.startTicks !== undefined) lock.startTicks = record.startTicks;
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
    startTicks: processStartTicks(process.pid),
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
  if (/\.(?:[cm]?tsx?|mts|cts)$/i.test(entrypoint)) {
    return [process.execPath, [entrypoint, ...args]];
  }
  return [entrypoint, args];
}

/** Spawn orchd detached, redirecting all output to `$ORCH_DIR/orchd.log`. */
export function daemonize(
  entrypoint: string,
  args: string[] = [],
  orchDir = process.env.ORCH_DIR ?? path.join(process.env.HOME ?? process.cwd(), ".orch"),
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
  orchDir = process.env.ORCH_DIR ?? path.join(process.env.HOME ?? process.cwd(), ".orch"),
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
