import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { osSide } from "../util.ts";

/** The files one orchd instance owns while it runs. Orch defines these names, so
 *  they get exactly one definition site — same rule as the presence filenames. */
export interface DaemonDiscoveryFiles {
  /** Machine-wide registration; unlike the store this is shared by all clients. */
  readonly registration: string;
}

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

export interface DaemonRuntimeFiles {
  /** The backing-store ownership record (machine-wide admission is registration). */
  readonly lock: string;
  /** The unix socket orchd binds for RPC. */
  readonly socket: string;
  /** The TCP port orchd advertises where unix sockets are unavailable. */
  readonly port: string;
  /** Owner-readable credential for loopback TCP hello. */
  readonly token: string;
  /** Where the daemon's structured JSONL diagnostics are written. */
  readonly log: string;
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
