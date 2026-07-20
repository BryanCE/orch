// One-shot socket transport shared by every orchd/herdr dial site. Node
// built-ins + util.ts only, so shim bundles can pull it. Method vocabulary
// (which JSON method/params to send) stays with each caller — this moves the
// transport, not the protocol.
import { createConnection } from "node:net";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isRecord } from "../util.ts";

function isValidPort(port: unknown): port is number {
  return typeof port === "number" && Number.isInteger(port) && port > 0 && port < 65536;
}

/**
 * The TCP port orchd advertised in `orchd.port` (JSON number or `{port}`), or
 * undefined when the file is absent, unparseable, or holds an out-of-range port.
 */
export function readPortFile(orchDir: string): number | undefined {
  let text: string;
  try {
    text = readFileSync(join(orchDir, "orchd.port"), "utf8").trim();
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
