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
import { orchDir as resolveOrchDir } from "../presence/store.ts";
import { processInstanceMatches, processIsAlive, processStartToken } from "../process-identity.ts";
import { packageRoot } from "../util.ts";
import { daemonDiscoveryFiles, daemonOwnershipFiles, daemonRuntimeFiles } from "./runtime-files.ts";

const HASH_LENGTH = 12;

interface LockRecord {
  pid: number;
  codeHash: string;
  startedAt: string;
  startToken?: string;
}

export type DaemonLock = Pick<LockRecord, "pid" | "codeHash" | "startToken">;

/** The machine-wide rendezvous record. Its endpoint paths are the only address
 *  clients discover; orchDir scopes those endpoints to the owning store. */
export interface DaemonRegistration {
  readonly orchDir: string;
  readonly pid: number;
  readonly startToken: string;
  readonly socket: string;
  readonly token: string;
  readonly port: string;
}

export interface DaemonRegistrationResult {
  readonly acquired: boolean;
  readonly registration?: DaemonRegistration;
}

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
  return daemonRuntimeFiles(orchDir).lock;
}

function registrationPath(): string {
  return daemonDiscoveryFiles().registration;
}

function parseRegistration(value: unknown): DaemonRegistration | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Partial<DaemonRegistration>;
  if (typeof record.orchDir !== "string" || record.orchDir.length === 0
    || typeof record.pid !== "number" || !Number.isInteger(record.pid) || record.pid <= 0
    || typeof record.startToken !== "string" || record.startToken.length === 0
    || typeof record.socket !== "string" || record.socket.length === 0
    || typeof record.token !== "string" || record.token.length === 0
    || typeof record.port !== "string" || record.port.length === 0) return undefined;
  const orchDir = record.orchDir;
  const pid = record.pid;
  const startToken = record.startToken;
  const socket = record.socket;
  const token = record.token;
  const port = record.port;
  if (orchDir === undefined || pid === undefined || startToken === undefined || socket === undefined || token === undefined || port === undefined) return undefined;
  return { orchDir, pid, startToken, socket, token, port };
}

/** Read registration without interpreting liveness; doctor needs to distinguish
 *  a declared-but-dead daemon from one that is both declared and live. */
export function readDaemonRegistration(): DaemonRegistration | null {
  try {
    return parseRegistration(JSON.parse(readFileSync(registrationPath(), "utf8"))) ?? null;
  } catch {
    return null;
  }
}

export function liveDaemonRegistration(orchDir?: string): DaemonRegistration | null {
  const registration = readDaemonRegistration();
  if (!registration || !processInstanceMatches(registration.pid, registration.startToken)) return null;
  if (orchDir !== undefined && path.resolve(orchDir) !== path.resolve(registration.orchDir)) return null;
  return registration;
}

/** Atomically claim the machine rendezvous. A recycled or dead (pid,startToken)
 *  is evicted; a live owner always refuses and exposes its socket/token paths. */
export function acquireDaemonRegistration(orchDir: string): DaemonRegistrationResult {
  const runtime = daemonRuntimeFiles(orchDir);
  const startToken = processStartToken(process.pid);
  if (!startToken) throw new Error("cannot register orchd without a process start token");
  const registration: DaemonRegistration = {
    orchDir: path.resolve(orchDir),
    pid: process.pid,
    startToken,
    socket: runtime.socket,
    token: runtime.token,
    port: runtime.port,
  };
  const file = registrationPath();
  mkdirSync(path.dirname(file), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      writeFileSync(file, `${JSON.stringify(registration)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
      return { acquired: true, registration };
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const existing = readDaemonRegistration();
      if (existing && processInstanceMatches(existing.pid, existing.startToken)) {
        return { acquired: false, registration: existing };
      }
      try {
        unlinkSync(file);
      } catch (unlinkError: unknown) {
        if ((unlinkError as NodeJS.ErrnoException).code !== "ENOENT") return { acquired: false };
      }
    }
  }
  return { acquired: false };
}

export function releaseDaemonRegistration(): void {
  const existing = readDaemonRegistration();
  if (!existing || existing.pid !== process.pid || !processInstanceMatches(existing.pid, existing.startToken)) return;
  try {
    unlinkSync(registrationPath());
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

function socketPath(orchDir: string): string {
  return daemonRuntimeFiles(orchDir).socket;
}

function logPath(orchDir: string): string {
  return daemonRuntimeFiles(orchDir).log;
}

function currentCodeHash(): string {
  const entrypoint = process.env.ORCHD_ENTRYPOINT ?? process.argv[1];
  if (!entrypoint || !existsSync(entrypoint)) return "unknown";
  return computeCodeHash(entrypoint);
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
  if (record) return record.startToken && processInstanceMatches(record.pid, record.startToken) ? record.pid : undefined;
  const registration = liveDaemonRegistration(orchDir);
  return registration?.pid;
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

/** An unreadable lock names no owner to protect — a crash truncated it — so only
 *  a live socket can still veto the reclaim. */
function canReclaim(record: LockRecord | undefined, probe: SocketProbe, orchDir: string): boolean {
  if (record && processIdentityMatches(record)) return false;
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

/** Erase every trace of a departed daemon, returning what was removed. Call only
 *  once no daemon is proven live: a survivor would lose its own socket. */
export function clearDaemonRuntime(orchDir: string): string[] {
  const removed: string[] = [];
  for (const file of daemonOwnershipFiles(orchDir)) {
    try {
      unlinkSync(file);
      removed.push(file);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return removed;
}

/** SIGTERM a daemon and wait for the OS to reap it so its lock frees. */
export async function terminateDaemon(pid: number, graceMs: number): Promise<void> {
  try { process.kill(pid, "SIGTERM"); } catch { return; }
  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline && processIsAlive(pid)) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/** Why orch will not signal a live lock pid it cannot tie to its own daemon. */
export function unprovenLockRefusal(orchDir: string, pid: number): string {
  return `orchd.lock names live pid ${pid}, which orch cannot verify is its daemon - refusing to signal it. `
    + `Stop that process yourself, or delete ${lockPath(orchDir)} if it is stale.`;
}

function commandFor(entrypoint: string, args: string[]): [string, string[]] {
  if (/\.(?:[cm]?jsx?|[cm]?tsx?)$/i.test(entrypoint)) {
    return [process.execPath, [entrypoint, ...args]];
  }
  return [entrypoint, args];
}

/** Spawn orchd detached; diagnostics are written by the structured logger, never raw stdio. */
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
      stdio: ["ignore", "ignore", "ignore"],
      env: process.env,
    });
    child.unref();
    if (child.pid === undefined) throw new Error("daemon process did not provide a pid");
    return child.pid;
  } finally {
    closeSync(log);
  }
}

/**
 * Run orchd attached to the current terminal (`--fg`), resolving its exit code.
 * The caller must await it: returning while the child still owns the terminal is
 * what made `--fg` indistinguishable from a detached start.
 */
export function runForeground(entrypoint: string, args: string[] = []): Promise<number> {
  const [command, commandArgs] = commandFor(entrypoint, args);
  const child = spawn(command, commandArgs, {
    detached: false,
    stdio: "inherit",
    env: process.env,
  });
  if (child.pid === undefined) throw new Error("foreground process did not provide a pid");
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code, signal) => resolve(signal === null ? code ?? 0 : 1));
  });
}

/** Re-run this entrypoint with unchanged argv, handing the lock to the replacement. */
export function reexecSelf(
  orchDir = resolveOrchDir(),
): never {
  releaseDaemonLock(orchDir);
  releaseDaemonRegistration();
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
