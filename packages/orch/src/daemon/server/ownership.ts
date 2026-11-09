/**
 * How orchd takes and gives up the machine: the one-per-host lock, the machine-wide
 * registration, and the hand-off to a re-executed replacement. Only orchd runs these.
 */
import type { OrchDir } from "../../types/core.ts";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import * as path from "node:path";
import { processStartToken, recordedInstanceIsLive } from "../../process-identity.ts";
import { observedHere } from "../../local-process.ts";
import { retryingSync } from "../../retry.ts";
import { createFileExclusively, ensurePrivateDir, errnoCode } from "../../util.ts";
import { hostOs } from "../../host.ts";
import { orchDirAt } from "../../orch-dir.ts";
import { daemonDiscoveryFiles, daemonRuntimeFiles } from "../client/runtime-files.ts";
import { computeCodeHash, lockHolderIsLive, readDaemonRegistration } from "../client/process.ts";
import type { DaemonRegistration, DaemonRegistrationResult, LockRecord, SocketProbe } from "../../types/daemon.ts";

/** Create `file` exclusively with `payload`, evicting a holder `mayEvict` disowns, once.
 * Created atomically: a half-written file reads as no holder, and this code would
 * then evict the live machine-wide one and let a second orchd start (M1/M6).
 * See `createFileExclusively`.
 */
function acquireExclusiveFile(
  label: string,
  file: string,
  payload: string,
  mayEvict: () => boolean,
): { acquired: boolean; blocked: boolean } {
  const result = retryingSync(
    label,
    (): { acquired: boolean; blocked: boolean; retry: boolean } => {
      if (createFileExclusively(file, payload)) return { acquired: true, blocked: false, retry: false };
      if (!mayEvict()) return { acquired: false, blocked: true, retry: false };
      try {
        unlinkSync(file);
      } catch (unlinkError: unknown) {
        if (errnoCode(unlinkError) !== "ENOENT") return { acquired: false, blocked: false, retry: false };
      }
      return { acquired: false, blocked: false, retry: true };
    },
    { attempts: 2, delayMs: 0, backoff: 1 },
    { retryOnResult: (value) => value.retry },
  );
  return { acquired: result.acquired, blocked: result.blocked };
}

/** Atomically claim the machine rendezvous. A recycled or dead (pid,startToken)
 *  is evicted; a live owner always refuses and exposes its socket/token paths. */
export function acquireDaemonRegistration(orchDir: OrchDir): DaemonRegistrationResult {
  const runtime = daemonRuntimeFiles(orchDir);
  const startToken = processStartToken(process.pid);
  if (!startToken) throw new Error("cannot register orchd without a process start token");
  const registration: DaemonRegistration = {
    orchDir: orchDirAt(path.resolve(orchDir)),
    pid: process.pid,
    startToken,
    osSide: hostOs(),
    socket: runtime.socket,
    token: runtime.token,
    port: runtime.port,
  };
  const file = daemonDiscoveryFiles().registration;
  mkdirSync(path.dirname(file), { recursive: true });
  let blockedRegistration: DaemonRegistration | undefined;
  const result = acquireExclusiveFile("acquire daemon registration", file, `${JSON.stringify(registration)}\n`, () => {
    const existing = readDaemonRegistration();
    if (existing && recordedInstanceIsLive(observedHere(existing.pid, existing.startToken))) {
      blockedRegistration = existing;
      return false;
    }
    return true;
  });
  return result.acquired
    ? { acquired: true, registration }
    : { acquired: false, registration: result.blocked ? blockedRegistration : undefined };
}

export function releaseDaemonRegistration(): void {
  const existing = readDaemonRegistration();
  if (!existing || existing.pid !== process.pid || !recordedInstanceIsLive(observedHere(existing.pid, existing.startToken))) return;
  try {
    unlinkSync(daemonDiscoveryFiles().registration);
  } catch (error: unknown) {
    if (errnoCode(error) !== "ENOENT") throw error;
  }
}

function currentCodeHash(): string {
  const entrypoint = process.env.ORCHD_ENTRYPOINT ?? process.argv[1];
  if (!entrypoint || !existsSync(entrypoint)) return "unknown";
  return computeCodeHash(entrypoint);
}

/** A lock whose holder is proven live is never reclaimed, and only a live socket can
 *  still veto reclaiming one that is not. */
function canReclaim(probe: SocketProbe, orchDir: OrchDir): boolean {
  if (lockHolderIsLive(orchDir)) return false;
  try {
    return !probe(daemonRuntimeFiles(orchDir).socket);
  } catch {
    // A failed probe is not proof that another daemon is absent.
    return false;
  }
}

/** Acquire the one-per-host daemon lock. Returns false when another instance owns it. */
export function acquireDaemonLock(orchDir: OrchDir, socketProbe: SocketProbe = () => false): boolean {
  ensurePrivateDir(orchDir);
  const file = daemonRuntimeFiles(orchDir).lock;
  const record: LockRecord = {
    pid: process.pid,
    codeHash: currentCodeHash(),
    startedAt: new Date().toISOString(),
    startToken: processStartToken(process.pid),
  };

  // Same atomicity requirement as registration: use acquireExclusiveFile.
  return acquireExclusiveFile("acquire daemon lock", file, `${JSON.stringify(record)}\n`, () => canReclaim(socketProbe, orchDir)).acquired;
}

/** Release the daemon lock. Missing locks are already released. */
export function releaseDaemonLock(orchDir: OrchDir): void {
  try {
    unlinkSync(daemonRuntimeFiles(orchDir).lock);
  } catch (error: unknown) {
    if (errnoCode(error) !== "ENOENT") throw error;
  }
}

/** Re-run this entrypoint with unchanged argv, handing the lock to the replacement. */
export function reexecSelf(
  orchDir: OrchDir,
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
