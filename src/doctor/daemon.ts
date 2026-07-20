import * as filesystem from "node:fs";
import * as path from "node:path";
import { computeCodeHash, readDaemonLock } from "../daemon/lifecycle.ts";
import { rpcCall } from "../daemon/rpc.ts";
import type { CheckResult } from "../doctor-types.ts";
import { repoDir } from "./shared.ts";
import { pidAlive } from "../util.ts";

const defaultDaemonEntrypoint = path.join(repoDir, "dist", "daemon", "orchd.js");

function daemonEntrypoint(): string {
  return process.env.ORCHD_ENTRYPOINT ?? defaultDaemonEntrypoint;
}

export async function checkDaemonPresence(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const lockFile = path.join(orchDir, "orchd.lock");
  if (!filesystem.existsSync(lockFile)) {
    return { id: "orchd", label: "orchd presence", status: "ok", detail: "orchd is absent (daemon is optional)" };
  }
  const lock = readDaemonLock(orchDir);
  if (!lock) {
    return { id: "orchd", label: "orchd presence", status: "warn", detail: "orchd lock is present but invalid" };
  }
  return pidAlive(lock.pid)
    ? { id: "orchd", label: "orchd presence", status: "ok", detail: `orchd is running (pid ${lock.pid})` }
    : { id: "orchd", label: "orchd presence", status: "warn", detail: `orchd is stale (lock for dead pid ${lock.pid}); run orch daemon start` };
}

export async function checkDaemonStaleness(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const lock = readDaemonLock(orchDir);
  if (!lock || !pidAlive(lock.pid)) {
    return { id: "orchd-staleness", label: "orchd code", status: "skip", detail: "orchd is not running" };
  }
  const diskHash = computeCodeHash(daemonEntrypoint());
  if (lock.codeHash !== diskHash) {
    return {
      id: "orchd-staleness",
      label: "orchd code",
      status: "warn",
      detail: `orchd code is stale (lock ${lock.codeHash}, disk ${diskHash}); run orch daemon reload`,
    };
  }
  return { id: "orchd-staleness", label: "orchd code", status: "ok", detail: `orchd code is current (${diskHash})` };
}

export async function checkDaemonLock(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const lockFile = path.join(orchDir, "orchd.lock");
  if (!filesystem.existsSync(lockFile)) {
    return { id: "orchd-lock", label: "orchd lock", status: "ok", detail: "no orchd lock" };
  }
  const lock = readDaemonLock(orchDir);
  if (!lock) {
    return { id: "orchd-lock", label: "orchd lock", status: "fail", detail: `invalid orchd lock: ${lockFile}` };
  }
  if (pidAlive(lock.pid)) {
    return { id: "orchd-lock", label: "orchd lock", status: "ok", detail: `lock belongs to live pid ${lock.pid}` };
  }
  return {
    id: "orchd-lock",
    label: "orchd lock",
    status: "fail",
    detail: `stale orchd lock ${lockFile} (dead pid ${lock.pid})`,
    fix: {
      description: `Remove stale orchd lock ${lockFile} (dead pid ${lock.pid})`,
      apply() {
        filesystem.rmSync(lockFile, { force: true });
      },
    },
  };
}

export async function checkDaemonSocket(orchDir: string): Promise<CheckResult> {
  const lock = readDaemonLock(orchDir);
  if (!lock || !pidAlive(lock.pid)) {
    return { id: "orchd-socket", label: "orchd socket", status: "skip", detail: "no running orchd to probe" };
  }
  try {
    await rpcCall(orchDir, "daemon-status", undefined, 250);
    return { id: "orchd-socket", label: "orchd socket", status: "ok", detail: `daemon-status answered (pid ${lock.pid})` };
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      id: "orchd-socket",
      label: "orchd socket",
      status: "fail",
      detail: `orchd pid ${lock.pid} is not answerable: ${reason}; try orch daemon start`,
    };
  }
}
