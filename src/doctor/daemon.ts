import * as filesystem from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { daemonEntrypoint, liveDaemonRegistration, provenDaemonPid, readDaemonCodeSkew, readDaemonLock, readDaemonRegistration } from "../daemon/lifecycle.ts";
import { daemonDiscoveryFiles, daemonRuntimeFiles } from "../daemon/runtime-files.ts";
import { rpcCall } from "../daemon/rpc.ts";
import type { CheckResult } from "../check-result.ts";
import { pidAlive } from "../util.ts";

/** Verify the machine declaration independently from any project's ORCH_DIR. */
export function checkDaemonRegistration(): CheckResult {
  const registration = readDaemonRegistration();
  if (!registration) {
    return { id: "orchd-registration", label: "orchd registration", status: "ok", detail: "no daemon is registered on this machine" };
  }
  if (liveDaemonRegistration()) {
    return {
      id: "orchd-registration",
      label: "orchd registration",
      status: "ok",
      detail: `live-and-registered daemon (pid ${registration.pid}) at socket ${registration.socket}; token ${registration.token}`,
    };
  }
  return {
    id: "orchd-registration",
    label: "orchd registration",
    status: "warn",
    detail: `registered-but-dead daemon (pid ${registration.pid}) at socket ${registration.socket}; token ${registration.token}`,
    fix: {
      description: "Remove the dead orchd machine registration",
      destructive: true,
      apply() {
        filesystem.rmSync(daemonDiscoveryFiles().registration, { force: true });
      },
    },
  };
}

export async function checkDaemonPresence(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const lockFile = daemonRuntimeFiles(orchDir).lock;
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
  const skew = readDaemonCodeSkew(orchDir, daemonEntrypoint());
  if (skew) {
    return {
      id: "orchd-staleness",
      label: "orchd code",
      status: "warn",
      detail: `orchd code is stale (lock ${skew.daemonHash}, disk ${skew.diskHash}); run orch daemon reload`,
    };
  }
  return { id: "orchd-staleness", label: "orchd code", status: "ok", detail: `orchd code is current (${lock.codeHash})` };
}

interface OrphanDaemon {
  dir: string;
  pid: number;
  provable: boolean;
}

/** Live daemon locks in foreign `orch-*` dirs under the OS temp root. Each is a
 *  daemon nothing will ever dial again — a test run or crash left it behind — and
 *  it pins its dir and a process slot until something notices it. No orch command
 *  scopes to those dirs, so doctor is the only place this state is visible. */
export function checkOrphanDaemons(orchDir: string): CheckResult {
  const own = resolve(orchDir);
  const orphans: OrphanDaemon[] = [];
  let names: string[] = [];
  try { names = filesystem.readdirSync(tmpdir()); } catch {}
  for (const name of names) {
    if (!name.startsWith("orch-")) continue;
    const dir = join(tmpdir(), name);
    if (resolve(dir) === own) continue;
    const lock = readDaemonLock(dir);
    if (!lock || !pidAlive(lock.pid)) continue;
    orphans.push({ dir, pid: lock.pid, provable: provenDaemonPid(dir) !== undefined });
  }
  if (orphans.length === 0) {
    return { id: "orphan-daemons", label: "Orphaned daemons", status: "ok", detail: "no live daemons in temp orch dirs" };
  }
  const provable = orphans.filter((orphan) => orphan.provable);
  const listed = orphans.map((orphan) => `pid ${orphan.pid} @ ${orphan.dir}${orphan.provable ? "" : " (unproven owner - never signalled)"}`);
  return {
    id: "orphan-daemons",
    label: "Orphaned daemons",
    status: "warn",
    detail: `${orphans.length} live daemon${orphans.length === 1 ? "" : "s"} in temp orch dirs nothing will dial again:\n    ${listed.join("\n    ")}`,
    fix: provable.length === 0 ? undefined : {
      description: `Stop ${provable.length} proven orphaned daemon${provable.length === 1 ? "" : "s"}: ${provable.map((orphan) => `pid ${orphan.pid}`).join(", ")}`,
      destructive: true,
      apply() {
        for (const orphan of provable) {
          try { process.kill(orphan.pid, "SIGTERM"); } catch {}
        }
      },
    },
  };
}

/** Every lock that names no live daemon is stale, and every stale lock is removable —
 *  leaving one behind is what refuses the next `orch daemon start` forever. */
function staleLockResult(lockFile: string, why: string): CheckResult {
  return {
    id: "orchd-lock",
    label: "orchd lock",
    status: "fail",
    detail: `stale orchd lock ${lockFile} (${why})`,
    fix: {
      description: `Remove stale orchd lock ${lockFile} (${why})`,
      apply() {
        filesystem.rmSync(lockFile, { force: true });
      },
    },
  };
}

export async function checkDaemonLock(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const lockFile = daemonRuntimeFiles(orchDir).lock;
  if (!filesystem.existsSync(lockFile)) {
    return { id: "orchd-lock", label: "orchd lock", status: "ok", detail: "no orchd lock" };
  }
  const lock = readDaemonLock(orchDir);
  if (!lock) return staleLockResult(lockFile, "names no verifiable daemon");
  if (pidAlive(lock.pid)) {
    return { id: "orchd-lock", label: "orchd lock", status: "ok", detail: `lock belongs to live pid ${lock.pid}` };
  }
  return staleLockResult(lockFile, `dead pid ${lock.pid}`);
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
