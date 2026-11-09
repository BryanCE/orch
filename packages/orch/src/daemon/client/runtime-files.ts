import type { OrchDir } from "../../types/core.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { homeDir } from "../../shared/home.ts";
import { hostOs } from "../../host.ts";
import { isRecord } from "../../util.ts";
import type { DaemonDiscoveryFiles, DaemonRuntimeFiles } from "../../types/daemon.ts";

/** Machine-wide discovery is deliberately independent of `$ORCH_DIR`. Tests and
 *  installations may override the native runtime root, but clients never derive
 *  an address from their private store. */
export function daemonDiscoveryFiles(): DaemonDiscoveryFiles {
  const root = process.env.ORCH_DAEMON_DISCOVERY_DIR
    ?? process.env.XDG_RUNTIME_DIR
    ?? (hostOs() === "windows" ? process.env.LOCALAPPDATA : undefined)
    ?? join(tmpdir(), `orchd-${homeDir().replace(/[^a-zA-Z0-9_.-]/g, "_")}`);
  return { registration: join(root, "orchd.registration") };
}

export function daemonRuntimeFiles(orchDir: OrchDir): DaemonRuntimeFiles {
  return {
    lock: join(orchDir, "orchd.lock"),
    socket: join(orchDir, "orchd.sock"),
    port: join(orchDir, "orchd.port"),
    token: join(orchDir, "orchd.token"),
  };
}

/** The files a departed orchd must not leave behind. The log survives: it is the
 *  record of why the last daemon died. */
export function daemonOwnershipFiles(orchDir: OrchDir): readonly string[] {
  const files = daemonRuntimeFiles(orchDir);
  return [files.lock, files.socket, files.port, files.token];
}

function isValidPort(port: unknown): port is number {
  return typeof port === "number" && Number.isInteger(port) && port > 0 && port < 65536;
}

/**
 * The TCP port orchd advertised in `orchd.port` (JSON number or `{port}`), or
 * undefined when the file is absent, unparseable, or holds an out-of-range port.
 */
export function readPortPath(file: string): number | undefined {
  let text: string;
  try {
    text = readFileSync(file, "utf8").trim();
  } catch {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(text);
    const port = typeof parsed === "number" ? parsed : isRecord(parsed) ? parsed.port : undefined;
    if (isValidPort(port)) return port;
  } catch {
    const port = Number(text);
    if (isValidPort(port)) return port;
  }
  return undefined;
}
