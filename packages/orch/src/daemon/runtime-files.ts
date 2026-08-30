import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { osSide } from "../util.ts";
import type { DaemonDiscoveryFiles, DaemonRuntimeFiles } from "../types/daemon.ts";

/** Machine-wide discovery is deliberately independent of `$ORCH_DIR`. Tests and
 *  installations may override the native runtime root, but clients never derive
 *  an address from their private store. */
export function daemonDiscoveryFiles(): DaemonDiscoveryFiles {
  const root = process.env.ORCH_DAEMON_DISCOVERY_DIR
    ?? process.env.XDG_RUNTIME_DIR
    ?? (osSide() === "windows" ? process.env.LOCALAPPDATA : undefined)
    ?? join(tmpdir(), `orchd-${homedir().replace(/[^a-zA-Z0-9_.-]/g, "_")}`);
  return { registration: join(root, "orchd.registration") };
}

export function daemonRuntimeFiles(orchDir: string): DaemonRuntimeFiles {
  return {
    lock: join(orchDir, "orchd.lock"),
    socket: join(orchDir, "orchd.sock"),
    port: join(orchDir, "orchd.port"),
    token: join(orchDir, "orchd.token"),
    log: join(orchDir, "orchd.log"),
  };
}

/** The files a departed orchd must not leave behind. The log survives: it is the
 *  record of why the last daemon died. */
export function daemonOwnershipFiles(orchDir: string): readonly string[] {
  const files = daemonRuntimeFiles(orchDir);
  return [files.lock, files.socket, files.port, files.token];
}
