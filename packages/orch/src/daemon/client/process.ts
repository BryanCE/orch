import { logFile } from "../../log.ts";
import type { OrchDir } from "../../types/core.ts";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  openSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import * as path from "node:path";
import { processIsAlive, processStartToken, recordedInstanceIsLive } from "../../process-identity.ts";
import { observedHere } from "../../local-process.ts";
import { retryingAsync } from "../../retry.ts";
import { ensurePrivateDir, errnoCode, isRecord, packageRoot } from "../../util.ts";
import { hostOs, isHostOs } from "../../host.ts";
import { entrypointArgs, runningRuntime } from "../../runtime.ts";
import { daemonDiscoveryFiles, daemonOwnershipFiles, daemonRuntimeFiles } from "./runtime-files.ts";
import { orchDirAt } from "../../orch-dir.ts";
import type { DaemonCodeSkew, DaemonLock, DaemonRegistration, LockRecord, OsExecutor, OsSideExecution } from "../../types/daemon.ts";
import type { HostOs } from "../../types/host.ts";

const HASH_LENGTH = 12;

/** Read the exact live-daemon code-hash skew used by doctor. */
/** The orchd entrypoint every caller starts, re-execs, or verifies. */
export function daemonEntrypoint(): string {
  return process.env.ORCHD_ENTRYPOINT ?? path.join(packageRoot(), "dist", "daemon", "orchd.js");
}

export function readDaemonCodeSkew(orchDir: OrchDir, entrypoint: string): DaemonCodeSkew | null {
  const lock = readDaemonLock(orchDir);
  if (!lock || !processIsAlive(lock.pid)) return null;
  const diskHash = computeCodeHash(entrypoint);
  return lock.codeHash === diskHash ? null : { daemonHash: lock.codeHash, diskHash };
}

function lockPath(orchDir: OrchDir): string {
  return daemonRuntimeFiles(orchDir).lock;
}

function registrationPath(): string {
  return daemonDiscoveryFiles().registration;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function parseRegistration(value: unknown): DaemonRegistration | undefined {
  if (!isRecord(value)) return undefined;
  const rawOrchDir = nonEmptyString(value.orchDir);
  const orchDir = rawOrchDir === undefined ? undefined : orchDirAt(rawOrchDir);
  const pid = positiveInteger(value.pid);
  const startToken = nonEmptyString(value.startToken);
  const side = isHostOs(value.osSide) ? value.osSide : undefined;
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

export function liveDaemonRegistration(orchDir?: OrchDir): DaemonRegistration | null {
  const registration = readDaemonRegistration();
  if (!registration || !recordedInstanceIsLive(observedHere(registration.pid, registration.startToken))) return null;
  if (orchDir !== undefined && path.resolve(orchDir) !== path.resolve(registration.orchDir)) return null;
  return registration;
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

function logPath(orchDir: OrchDir): string {
  return logFile(orchDir);
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
export function provenDaemonPid(orchDir: OrchDir): number | undefined {
  const record = readLock(lockPath(orchDir));
  if (record) return record.startToken && recordedInstanceIsLive(observedHere(record.pid, record.startToken)) ? record.pid : undefined;
  const registration = liveDaemonRegistration(orchDir);
  return registration?.pid;
}

function isLockRecord(value: unknown): value is LockRecord {
  return isRecord(value)
    && typeof value.pid === "number" && Number.isInteger(value.pid) && value.pid > 0
    && typeof value.codeHash === "string"
    && typeof value.startedAt === "string"
    && (value.startToken === undefined || typeof value.startToken === "string");
}

function readLock(file: string): LockRecord | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
    return isLockRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** Read the daemon lock identity, returning null when it is absent or recycled. */
export function readDaemonLock(orchDir: OrchDir): DaemonLock | null {
  const record = readLock(lockPath(orchDir));
  if (!record || processIsAlive(record.pid) && !processIdentityMatches(record)) return null;
  const lock: DaemonLock = { pid: record.pid, codeHash: record.codeHash };
  if (record.startToken !== undefined) lock.startToken = record.startToken;
  return lock;
}

/** Whether the lock names a live process proven to be the instance that took it. An
 *  unreadable lock names no owner: a crash truncated it. */
export function lockHolderIsLive(orchDir: OrchDir): boolean {
  const record = readLock(lockPath(orchDir));
  return record !== undefined && processIdentityMatches(record);
}

/** Erase every trace of a departed daemon, returning what was removed. Call only
 *  once no daemon is proven live: a survivor would lose its own socket. */
export function clearDaemonRuntime(orchDir: OrchDir): string[] {
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
    () => {
      if (!processIsAlive(pid)) return;
      throw new Error("daemon is still alive");
    },
    { attempts, delayMs: 50, backoff: 1 },
  ).catch(() => undefined);
}

/** The side orch itself runs on. Its three questions are the ones this process
 *  can already answer directly: spawn, signal 0, and SIGTERM. */
const localExecutor: OsExecutor = {
  osSide: hostOs(),
  start: (entrypoint, args = [], orchDir) => {
    if (orchDir === undefined) throw new Error("daemon start requires orchDir");
    return daemonize(orchDirAt(orchDir), entrypoint, args);
  },
  isAlive: (pid, startToken) => startToken === undefined ? processIsAlive(pid) : recordedInstanceIsLive(observedHere(pid, startToken)),
  kill: (pid, graceMs) => terminateDaemon(pid, graceMs),
};

/**
 * The executor for one OS side, or null when nothing can run there from here.
 *
 * Only the local side has one: this build ships no cross-boundary executor, and
 * a side with none is an honest declared missing capability, not a defect to
 * discover at the moment something tries to run.
 */
export function executorFor(side: HostOs): OsExecutor | null {
  return side === localExecutor.osSide ? localExecutor : null;
}

/**
 * Do something on one OS side, through that side's executor.
 *
 * An OS side with no executor is one nothing can run on. That is a fact about
 * the environment and therefore an ANSWER with exit code zero — never a thrown
 * error, and never a silently empty result the caller reads as "nothing there".
 */
export function onOsSide<T>(side: HostOs, body: (executor: OsExecutor) => T): OsSideExecution<T> {
  const executor = executorFor(side);
  if (!executor) {
    return { outcome: "answer", reason: "no-environment-role", exitCode: 0, text: `nothing runs on the ${side} side from here: it declares no executor.` };
  }
  return { outcome: "ran", value: body(executor) };
}

/** Why orch will not signal a live lock pid it cannot tie to its own daemon. */
export function unprovenLockRefusal(orchDir: OrchDir, pid: number): string {
  return `orchd.lock names live pid ${pid}, which orch cannot verify is its daemon - refusing to signal it. `
    + `Stop that process yourself, or delete ${lockPath(orchDir)} if it is stale.`;
}

function commandFor(entrypoint: string, args: string[]): [string, string[]] {
  if (/\.(?:[cm]?jsx?|[cm]?tsx?)$/i.test(entrypoint)) {
    return [process.execPath, entrypointArgs(runningRuntime(), entrypoint, args)];
  }
  return [entrypoint, args];
}

/** Spawn orchd detached; diagnostics are written by the structured logger, never raw stdio. */
export function daemonize(
  orchDir: OrchDir,
  entrypoint: string,
  args: string[] = [],
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

/** Return a short SHA-256 digest of an entrypoint's contents. */
export function computeCodeHash(entryFile: string): string {
  return createHash("sha256").update(readFileSync(entryFile)).digest("hex").slice(0, HASH_LENGTH);
}
