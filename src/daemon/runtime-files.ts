import { join } from "node:path";

/** The files one orchd instance owns while it runs. Orch defines these names, so
 *  they get exactly one definition site — same rule as the presence filenames. */
export interface DaemonRuntimeFiles {
  /** The one-per-host ownership record. */
  readonly lock: string;
  /** The unix socket orchd binds for RPC. */
  readonly socket: string;
  /** The TCP port orchd advertises where unix sockets are unavailable. */
  readonly port: string;
  /** Owner-readable credential for loopback TCP hello. */
  readonly token: string;
  /** Where a detached orchd's stdout and stderr land. */
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
