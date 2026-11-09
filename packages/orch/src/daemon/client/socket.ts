// One-shot socket transport shared by every orchd/herdr dial site. Node
// built-ins + util.ts only, so shim bundles can pull it. Method vocabulary
// (which JSON method/params to send) stays with each caller — this moves the
// transport, not the protocol.
import { createConnection } from "node:net";
import { existsSync } from "node:fs";
import { daemonRuntimeFiles, readPortPath } from "./runtime-files.ts";
import { isRecord, sleep } from "../../util.ts";
import type { OrchDir } from "../../types/core.ts";

export function readPortFile(orchDir: OrchDir): number | undefined {
  return readPortPath(daemonRuntimeFiles(orchDir).port);
}

/** Where orchd listens: its unix socket when the file exists, then its TCP port when one is advertised. */
export function daemonEndpoints(orchDir: OrchDir): (string | number)[] {
  const socket = daemonRuntimeFiles(orchDir).socket;
  const endpoints: (string | number)[] = existsSync(socket) ? [socket] : [];
  const port = readPortFile(orchDir);
  if (port !== undefined) endpoints.push(port);
  return endpoints;
}

type ReportMethod = "report-status" | "report-result" | "report-prompt" | "question";

/** Send one report until orchd accepts it or the wait runs out. A session can start
 *  before the spawn that launched it has registered the agent. */
export async function reportUntilAccepted(
  orchDir: OrchDir,
  method: ReportMethod,
  params: unknown,
  timing: { readonly timeoutMs: number; readonly waitMs: number; readonly pollMs: number },
): Promise<boolean> {
  const deadline = Date.now() + timing.waitMs;
  while (!await reportOnce(orchDir, method, params, timing.timeoutMs)) {
    if (Date.now() >= deadline) return false;
    await sleep(timing.pollMs);
  }
  return true;
}

/** Send one report to the daemon, trying its unix socket before its TCP port. */
export async function reportOnce(
  orchDir: OrchDir,
  method: ReportMethod,
  params: unknown,
  timeoutMs: number,
): Promise<boolean> {
  for (const endpoint of daemonEndpoints(orchDir)) {
    const line = await requestJsonLine(endpoint, { id: 1, method, params }, timeoutMs);
    if (line === undefined) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (isRecord(parsed) && "result" in parsed) return true;
    } catch {
      // Try the next advertised endpoint when the response is not JSON.
    }
  }
  return false;
}

export interface JsonLineLink {
  /** Write one JSON line. False when the socket is gone. */
  send(payload: unknown): boolean;
  close(): void;
}

/** Open a newline-framed connection that remains open until either side closes it. */
export function openJsonLineLink(
  endpoint: string | number,
  handlers: { onLine(line: string): void; onClose(): void },
): Promise<JsonLineLink | undefined> {
  return new Promise((resolve) => {
    const socket = typeof endpoint === "string"
      ? createConnection(endpoint)
      : createConnection({ host: "127.0.0.1", port: endpoint });
    let connected = false;
    let settled = false;
    let closed = false;
    let buffer = "";

    socket.unref();
    socket.setEncoding("utf8");

    const closeOnce = (): void => {
      if (closed) return;
      closed = true;
      socket.destroy();
      if (connected) handlers.onClose();
    };

    const link: JsonLineLink = {
      send(payload: unknown): boolean {
        if (!connected || closed || socket.destroyed) return false;
        try {
          socket.write(`${JSON.stringify(payload)}\n`);
          return true;
        } catch {
          closeOnce();
          return false;
        }
      },
      close: closeOnce,
    };

    socket.on("connect", () => {
      if (settled || closed) return;
      connected = true;
      settled = true;
      resolve(link);
    });
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        handlers.onLine(buffer.slice(0, newline).replace(/\r$/, ""));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
    });
    socket.on("error", () => {
      if (!connected) {
        if (!settled) {
          settled = true;
          socket.destroy();
          resolve(undefined);
        }
        return;
      }
      closeOnce();
    });
    socket.on("end", () => {
      if (!connected && !settled) {
        settled = true;
        socket.destroy();
        resolve(undefined);
        return;
      }
      closeOnce();
    });
  });
}

/**
 * Connect once to a unix socket path or a `127.0.0.1` TCP port, write `payload`
 * as a single JSON line, and resolve the first response line (trailing newline
 * stripped). Resolves undefined on connect/socket error, on `end` before a full
 * line, or when `timeoutMs` elapses. The timeout is unref'd so a pending dial
 * never keeps the process alive; the socket is always destroyed before resolving.
 */
export function requestJsonLine(
  endpoint: string | number,
  payload: unknown,
  timeoutMs: number,
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const socket = typeof endpoint === "string"
      ? createConnection(endpoint)
      : createConnection({ host: "127.0.0.1", port: endpoint });
    let settled = false;
    let buffer = "";
    const finish = (line: string | undefined): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      resolve(line);
    };
    const timeout = setTimeout(() => finish(undefined), timeoutMs);
    timeout.unref?.();
    socket.setEncoding("utf8");
    socket.on("error", () => finish(undefined));
    socket.on("end", () => finish(undefined));
    socket.on("connect", () => {
      socket.write(`${JSON.stringify(payload)}\n`);
    });
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline >= 0) finish(buffer.slice(0, newline).replace(/\r$/, ""));
    });
  });
}
