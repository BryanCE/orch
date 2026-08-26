import { createConnection, type Socket } from "node:net";
import { existsSync } from "node:fs";

// The daemon's endpoint names and $ORCH_DIR have exactly one definition site; the web
// server reads them through the @orch/* seam rather than restating either one.
import { daemonRuntimeFiles } from "@orch/daemon/runtime-files.ts";
import { orchDir } from "@orch/presence/writer.ts";

// NOTHING a browser chunk imports may reach this module: node:net cannot be bundled
// for the client, and in dev there is no tree-shaking to save it. Client components
// import the server functions in ./orch.ts, which the Start plugin replaces with proxies.

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3716;
const CONNECT_TIMEOUT_MS = 2_000;
const CALL_TIMEOUT_MS = 5_000;

type RpcMessage = {
  id?: number;
  event?: unknown;
  seq?: number;
  result?: unknown;
  error?: { code?: string | number; message?: string } | string;
};

export type DaemonDown = { daemon: "down"; reason: string; tried: string };

/** The one endpoint a dial actually used, so callers can report it rather than guess. */
export interface DaemonEndpoint {
  transport: "unix" | "tcp";
  address: string;
}

function daemonTarget(): { host: string; port: number } {
  const rawPort = Number(process.env.ORCH_DAEMON_PORT ?? DEFAULT_PORT);
  return {
    host: process.env.ORCH_DAEMON_HOST ?? DEFAULT_HOST,
    port: Number.isInteger(rawPort) && rawPort > 0 ? rawPort : DEFAULT_PORT,
  };
}

/** The endpoints connectDaemon walks, named for the down screen. A web server on the
 *  other side of a VM boundary from orchd reads its own $ORCH_DIR here and sees why. */
function attemptedEndpoints(): string {
  const tcp = daemonTarget();
  return `${daemonRuntimeFiles(orchDir()).socket} or tcp://${tcp.host}:${tcp.port}`;
}

export function down(error: unknown): DaemonDown {
  return {
    daemon: "down",
    reason: error instanceof Error ? error.message : "daemon unavailable",
    tried: attemptedEndpoints(),
  };
}

function rpcError(message: RpcMessage): Error | undefined {
  if (message.error === undefined) return undefined;
  const error = typeof message.error === "string" ? message.error : message.error.message ?? "RPC request failed";
  return new Error(error);
}

function connectEndpoint(endpoint: string | { host: string; port: number }, timeoutMs: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = typeof endpoint === "string"
      ? createConnection(endpoint)
      : createConnection({ host: endpoint.host, port: endpoint.port });
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      reject(error);
    };
    const timer = setTimeout(() => fail(new Error(`daemon connection timed out: ${attemptedEndpoints()}`)), timeoutMs);
    socket.once("error", fail);
    socket.once("connect", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.removeListener("error", fail);
      resolve(socket);
    });
  });
}

function isAbsentOrRefused(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  const code = Reflect.get(error, "code");
  return code === "ENOENT" || code === "ECONNREFUSED";
}

interface DaemonDial {
  socket: Socket;
  endpoint: DaemonEndpoint;
}

/** Dial the local unix socket, else loopback TCP — the crossing a web server on
 *  Windows uses to reach an orchd running in WSL. */
async function connectDaemon(timeoutMs = CONNECT_TIMEOUT_MS): Promise<DaemonDial> {
  const unixSocket = daemonRuntimeFiles(orchDir()).socket;
  const tcp = daemonTarget();
  const overTcp = async (): Promise<DaemonDial> => ({
    socket: await connectEndpoint(tcp, timeoutMs),
    endpoint: { transport: "tcp", address: `tcp://${tcp.host}:${tcp.port}` },
  });
  if (!existsSync(unixSocket)) return overTcp();
  try {
    return { socket: await connectEndpoint(unixSocket, timeoutMs), endpoint: { transport: "unix", address: unixSocket } };
  } catch (error: unknown) {
    if (!isAbsentOrRefused(error)) throw error;
    return overTcp();
  }
}

function readLines(socket: Socket, onLine: (message: RpcMessage) => void): void {
  let buffer = "";
  socket.setEncoding("utf8");
  socket.on("data", (chunk: string) => {
    buffer += chunk;
    let end = buffer.indexOf("\n");
    while (end >= 0) {
      const line = buffer.slice(0, end).trim();
      buffer = buffer.slice(end + 1);
      if (line) {
        try {
          const message = JSON.parse(line) as RpcMessage;
          if (message && typeof message === "object") onLine(message);
        } catch {
          // Ignore malformed daemon output.
        }
      }
      end = buffer.indexOf("\n");
    }
  });
}

let nextRequestId = 0;

/** Local RPC boundary. All connection failures stay values for server callers. */
export async function daemonRpc<T>(method: string, params?: unknown): Promise<{ result: T; endpoint: DaemonEndpoint }> {
  const { socket, endpoint } = await connectDaemon();
  const id = ++nextRequestId;
  try {
    const response = await new Promise<RpcMessage>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`daemon RPC timed out: ${method}`)), CALL_TIMEOUT_MS);
      readLines(socket, (message) => {
        if (message.id !== id) return;
        clearTimeout(timer);
        const error = rpcError(message);
        if (error) reject(error);
        else resolve(message);
      });
      socket.once("error", reject);
      socket.write(`${JSON.stringify({ id, method, params })}\n`);
    });
    return { result: response.result as T, endpoint };
  } finally {
    socket.destroy();
  }
}

export interface DaemonEventStream {
  stream: ReadableStream<Uint8Array>;
  close: () => void;
}

/** Bridge the daemon's newline-framed subscribe-events stream to an SSE body. */
export function daemonEventStream(since = 0): DaemonEventStream {
  const encoder = new TextEncoder();
  let closed = false;
  let socket: Socket | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let delay = 250;
  let lastSeq = since;
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;

  const send = (value: string) => {
    try { controller?.enqueue(encoder.encode(value)); } catch { close(); }
  };
  // The DAEMON's connection state, never the web server's. A bare heartbeat made this
  // endpoint look alive while orchd was unreachable, which is the opposite of its job.
  const sendLink = (connected: boolean, reason?: string) =>
    send(`event: daemon\ndata: ${JSON.stringify({ connected, endpoint: attemptedEndpoints(), ...(reason ? { reason } : {}) })}\n\n`);
  const schedule = () => {
    if (closed || retry) return;
    retry = setTimeout(() => { retry = undefined; connect(); }, delay);
    delay = Math.min(delay * 2, 5_000);
  };
  const disconnect = () => { socket = undefined; sendLink(false, "daemon closed the connection"); schedule(); };
  const connect = () => {
    if (closed) return;
    void connectDaemon(5_000).then(({ socket: connected }) => {
      if (closed) return connected.destroy();
      socket = connected;
      delay = 250;
      sendLink(true);
      readLines(connected, (message) => {
        if (message.seq !== undefined && "event" in message) {
          lastSeq = Math.max(lastSeq, message.seq);
          send(`data: ${JSON.stringify(message.event)}\n\n`);
        }
      });
      connected.once("error", disconnect);
      connected.once("close", disconnect);
      connected.write(`${JSON.stringify({ method: "subscribe-events", params: { since: lastSeq } })}\n`);
    }).catch((error: unknown) => {
      sendLink(false, down(error).reason);
      schedule();
    });
  };
  const stream = new ReadableStream<Uint8Array>({
    start(next) {
      controller = next;
      connect();
    },
    cancel() { close(); },
  });
  const close = () => {
    closed = true;
    if (retry) clearTimeout(retry);
    socket?.destroy();
    socket = undefined;
  };
  return { stream, close };
}

/** Handler used by the web route for GET /api/events. */
export function eventsResponse(request: Request): Response {
  const rawSince = Number(new URL(request.url).searchParams.get("since") ?? 0);
  const bridge = daemonEventStream(Number.isInteger(rawSince) && rawSince >= 0 ? rawSince : 0);
  return new Response(bridge.stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
