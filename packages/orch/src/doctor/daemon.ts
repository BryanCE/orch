import type { OrchDir } from "../types/core.ts";
import * as filesystem from "node:fs";
import { daemonEntrypoint, liveDaemonRegistration, onOsSide, readDaemonCodeSkew, readDaemonLock, readDaemonRegistration } from "../daemon/client/process.ts";
import { daemonDiscoveryFiles, daemonRuntimeFiles } from "../daemon/client/runtime-files.ts";
import { rpcCall } from "../daemon/client/rpc.ts";
import { errorMessage, pidAlive } from "../util.ts";
import { hostOs } from "../host.ts";
import type { CheckResult } from "../types/doctor.ts";

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

/**
 * Which OS sides orch can actually run something on, checked against the side
 * the live daemon says it is hosted on.
 *
 * Cross-OS execution is a backend — start, is-alive, kill — never a peer daemon.
 * A side with no executor is one nothing can run on, and that is an answer this
 * check states plainly: not a crash, and not a silently empty list that reads as
 * "there is nothing over there".
 */
export function checkOsExecutors(): CheckResult {
  const id = "os-executors";
  const label = "OS-side executors";
  const here = hostOs();
  const registration = liveDaemonRegistration();
  if (!registration) {
    return { id, label, status: "ok", detail: `orch runs processes on the ${here} side; no daemon is registered on this machine` };
  }
  // Ask the daemon's own side whether it is alive, through that side's executor.
  const alive = onOsSide(registration.osSide, (executor) => executor.isAlive(registration.pid, registration.startToken));
  if (alive.outcome === "answer") {
    return {
      id,
      label,
      status: "warn",
      detail: `the live daemon (pid ${registration.pid}) is hosted on the ${registration.osSide} side: ${alive.text} `
        + `orch on the ${here} side can dial it at ${registration.socket}, but can neither start nor stop it.`,
    };
  }
  return {
    id,
    label,
    status: "ok",
    detail: `orch runs processes on the ${here} side, where the registered daemon (pid ${registration.pid}) is ${alive.value ? "live" : "no longer running"}.`,
  };
}

export async function checkDaemonPresence(orchDir: OrchDir): Promise<CheckResult> {
  await Promise.resolve();
  const lockFile = daemonRuntimeFiles(orchDir).lock;
  if (!filesystem.existsSync(lockFile)) {
    return { id: "orchd", label: "orchd presence", status: "ok", detail: "orchd is absent (daemon is optional)" };
  }
  const lock = readDaemonLock(orchDir);
  if (!lock) {
    return { id: "orchd", label: "orchd presence", status: "warn", detail: "orchd lock is present but invalid" };
  }
  if (!pidAlive(lock.pid)) {
    return { id: "orchd", label: "orchd presence", status: "warn", detail: `orchd is stale (lock for dead pid ${lock.pid}); run orch daemon start` };
  }
  // Never two daemons at once: two would be two lease tables, two identity
  // spaces and two answers to who holds an agent. The machine registration is
  // what makes that impossible, so doctor checks it held.
  const registered = liveDaemonRegistration();
  if (registered && registered.pid !== lock.pid) {
    return {
      id: "orchd",
      label: "orchd presence",
      status: "fail",
      detail: `two live daemons: pid ${lock.pid} holds the lock in ${orchDir}, while the machine registration names pid ${registered.pid} (store ${registered.orchDir}). `
        + `Stop one - 'orch daemon stop' talks to the registered daemon.`,
    };
  }
  return { id: "orchd", label: "orchd presence", status: "ok", detail: `orchd is running (pid ${lock.pid})` };
}

export async function checkDaemonStaleness(orchDir: OrchDir): Promise<CheckResult> {
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

export async function checkDaemonLock(orchDir: OrchDir): Promise<CheckResult> {
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

export async function checkDaemonSocket(orchDir: OrchDir): Promise<CheckResult> {
  const lock = readDaemonLock(orchDir);
  if (!lock || !pidAlive(lock.pid)) {
    return { id: "orchd-socket", label: "orchd socket", status: "skip", detail: "no running orchd to probe" };
  }
  try {
    await rpcCall(orchDir, "daemon-status", undefined, 250);
    return { id: "orchd-socket", label: "orchd socket", status: "ok", detail: `daemon-status answered (pid ${lock.pid})` };
  } catch (error: unknown) {
    const reason = errorMessage(error);
    return {
      id: "orchd-socket",
      label: "orchd socket",
      status: "fail",
      detail: `orchd pid ${lock.pid} is not answerable: ${reason}; try orch daemon start`,
    };
  }
}
