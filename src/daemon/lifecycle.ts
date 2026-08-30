import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import * as path from "node:path";
import { orchDir as resolveOrchDir } from "../presence/store.ts";
import { processInstanceMatches, processIsAlive, processStartToken } from "../process-identity.ts";
import { retryingAsync, retryingSync } from "../retry.ts";
import { createFileExclusively, ensurePrivateDir, errnoCode, isRecord, osSide, packageRoot } from "../util.ts";
import { daemonDiscoveryFiles, daemonOwnershipFiles, daemonRuntimeFiles } from "./runtime-files.ts";
import type { DaemonCodeSkew, DaemonLock, DaemonRegistration, DaemonRegistrationResult, LockRecord, OsExecutor, OsSideExecution, SocketProbe } from "../types/daemon.ts";
import type { OsSide } from "../types/core.ts";

const HASH_LENGTH = 12;

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

function lockPath(orchDir: string): string {
  return daemonRuntimeFiles(orchDir).lock;
}

function registrationPath(): string {
  return daemonDiscoveryFiles().registration;
}

/** The OS sides orch knows how to name. A record naming anything else was not
 *  written by this build, so it names no daemon this build can reason about. */
const OS_SIDES: readonly OsSide[] = ["linux", "windows", "darwin"];

function parsedOsSide(value: unknown): OsSide | undefined {
  return OS_SIDES.find((side) => side === value);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function parseRegistration(value: unknown): DaemonRegistration | undefined {
  if (!isRecord(value)) return undefined;
  const orchDir = nonEmptyString(value.orchDir);
  const pid = positiveInteger(value.pid);
  const startToken = nonEmptyString(value.startToken);
  const side = parsedOsSide(value.osSide);
  const socket = nonEmptyString(value.socket);
  const token = nonEmptyString(value.token);
  const port = nonEmptyString(value.port);
  if (orchDir === undefined || pid === undefined || startToken === undefined || side === undefined
    || socket === undefined || token === undefined || port === undefined) return undefined;
  return { orchDir, pid, startToken, osSide: side, socket, token, port };
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
    osSide: osSide(),
    socket: runtime.socket,
    token: runtime.token,
    port: runtime.port,
  };
  const file = registrationPath();
  mkdirSync(path.dirname(file), { recursive: true });
  const result = retryingSync(
    "acquire daemon registration",
    (): { acquired: boolean; registration?: DaemonRegistration; retry: boolean } => {
      // Created atomically: a half-written registration reads as NO registration,
      // and this code would then evict the LIVE machine-wide one and let a second
      // orchd start (M1/M6). See `createFileExclusively`.
      if (createFileExclusively(file, `${JSON.stringify(registration)}\n`)) return { acquired: true, registration, retry: false };
      const existing = readDaemonRegistration();
      if (existing && processInstanceMatches(existing.pid, existing.startToken)) {
        return { acquired: false, registration: existing, retry: false };
      }
      try {
        unlinkSync(file);
      } catch (unlinkError: unknown) {
        if (errnoCode(unlinkError) !== "ENOENT") return { acquired: false, retry: false };
      }
      return { acquired: false, retry: true };
    },
    { attempts: 2, delayMs: 0, backoff: 1 },
    { retryOnResult: (value) => value.retry },
  );
  return { acquired: result.acquired, registration: result.registration };
}

/**
 * Why a second daemon is refused, in the one wording every caller prints.
 *
 * There is one daemon per machine — two would be two lease tables, two identity
 * spaces and two answers to *who holds this* — so a refusal has to name the live
 * one precisely enough to go look at it: its pid, the store it is backed by, and
 * the socket to dial instead of starting anything.
 */
export function daemonStartRefusal(live: DaemonRegistration): string {
  return `orchd is already running on this machine (pid ${live.pid} on the ${live.osSide} side, store ${live.orchDir}); start refused. `
    + `Dial it at socket ${live.socket} with token ${live.token}, or stop it with 'orch daemon stop'.`;
}

export function releaseDaemonRegistration(): void {
  const existing = readDaemonRegistration();
  if (!existing || existing.pid !== process.pid || !processInstanceMatches(existing.pid, existing.startToken)) return;
  try {
    unlinkSync(registrationPath());
  } catch (error: unknown) {
    if (errnoCode(error) !== "ENOENT") throw error;
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
  ensurePrivateDir(orchDir);
  const file = lockPath(orchDir);
  const record: LockRecord = {
    pid: process.pid,
    codeHash: currentCodeHash(),
    startedAt: new Date().toISOString(),
    startToken: processStartToken(process.pid),
  };

  const result = retryingSync(
    "acquire daemon lock",
    (): { acquired: boolean; retry: boolean } => {
      // Same atomicity requirement as the registration above: `canReclaim` reads an
      // unparseable record as "nobody holds this", so a half-written lock file is a
      // live daemon's lock being handed to the next starter.
      if (createFileExclusively(file, `${JSON.stringify(record)}\n`)) return { acquired: true, retry: false };
      if (!canReclaim(readLock(file), socketProbe, orchDir)) return { acquired: false, retry: false };
      try {
        unlinkSync(file);
      } catch (unlinkError: unknown) {
        if (errnoCode(unlinkError) !== "ENOENT") return { acquired: false, retry: false };
      }
      return { acquired: false, retry: true };
    },
    { attempts: 2, delayMs: 0, backoff: 1 },
    { retryOnResult: (value) => value.retry },
  );
  return result.acquired;
}

/** Release the daemon lock. Missing locks are already released. */
export function releaseDaemonLock(orchDir: string): void {
  try {
    unlinkSync(lockPath(orchDir));
  } catch (error: unknown) {
    if (errnoCode(error) !== "ENOENT") throw error;
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
      if (errnoCode(error) !== "ENOENT") throw error;
    }
  }
  return removed;
}

/** SIGTERM a daemon and wait for the OS to reap it so its lock frees. */
export async function terminateDaemon(pid: number, graceMs: number): Promise<void> {
  try { process.kill(pid, "SIGTERM"); } catch { return; }
  const attempts = Math.max(1, Math.ceil(graceMs / 50));
  await retryingAsync(
    `wait for daemon ${pid} to exit`,
    async () => {
      if (!processIsAlive(pid)) return;
      throw new Error("daemon is still alive");
    },
    { attempts, delayMs: 50, backoff: 1 },
  ).catch(() => undefined);
}

/** The side orch itself runs on. Its three questions are the ones this process
 *  can already answer directly: spawn, signal 0, and SIGTERM. */
const localExecutor: OsExecutor = {
  osSide: osSide(),
  start: (entrypoint, args = [], orchDir = resolveOrchDir()) => daemonize(entrypoint, args, orchDir),
  isAlive: (pid, startToken) => startToken === undefined ? processIsAlive(pid) : processInstanceMatches(pid, startToken),
  kill: (pid, graceMs) => terminateDaemon(pid, graceMs),
};

/**
 * The executor for one OS side, or null when nothing can run there from here.
 *
 * Only the local side has one: this build ships no cross-boundary executor, and
 * a side with none is an honest declared missing capability, not a defect to
 * discover at the moment something tries to run.
 */
export function executorFor(side: OsSide): OsExecutor | null {
  return side === localExecutor.osSide ? localExecutor : null;
}

/**
 * Do something on one OS side, through that side's executor.
 *
 * An OS side with no executor is one nothing can run on. That is a fact about
 * the environment and therefore an ANSWER with exit code zero — never a thrown
 * error, and never a silently empty result the caller reads as "nothing there".
 */
export function onOsSide<T>(side: OsSide, body: (executor: OsExecutor) => T): OsSideExecution<T> {
  const executor = executorFor(side);
  if (!executor) {
    return { outcome: "answer", reason: "no-environment-role", exitCode: 0, text: `nothing runs on the ${side} side from here: it declares no executor.` };
  }
  return { outcome: "ran", value: body(executor) };
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
  ensurePrivateDir(orchDir);
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
