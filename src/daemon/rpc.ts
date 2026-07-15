import { createConnection, createServer, type Server, type Socket } from "node:net";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readDaemonLock } from "./lifecycle.ts";
import { errorMessage } from "../util.ts";

export type RpcParams = unknown;
export type RpcEventEmitter = (event: unknown) => void;
export type RpcHandler = (params: RpcParams, emit: RpcEventEmitter) => unknown;
export type RpcHandlers = Record<string, RpcHandler>;

export class DaemonAbsentError extends Error {
  readonly code = "DAEMON_ABSENT";

  constructor(orchDir: string) {
    super(`orchd daemon is absent (${orchDir})`);
    this.name = "DaemonAbsentError";
  }
}

export class RpcError extends Error {
  readonly code: string | number;
  readonly data: unknown;

  constructor(code: string | number, message: string, data?: unknown) {
    super(message);
    this.name = "RpcError";
    this.code = code;
    this.data = data;
  }
}

export interface RpcServerOptions {
  /** Allow one stale unix endpoint to be removed during daemon boot. */
  holdsDaemonLock?: boolean;
};

export interface BufferedEvent {
  seq: number;
  event: unknown;
}

export interface ReplayResult {
  events: BufferedEvent[];
  gap: boolean;
  oldestSeq?: number;
}

export const REPLAY_WINDOW = 1_000;

export class ReplayBuffer {
  private readonly events: BufferedEvent[] = [];
  private nextSeq = 1;

  push(event: unknown): BufferedEvent {
    const buffered: BufferedEvent = { event, seq: this.nextSeq++ };
    this.events.push(buffered);
    if (this.events.length > REPLAY_WINDOW) this.events.shift();
    return buffered;
  }

  since(seq: number): ReplayResult {
    const oldestSeq = this.events[0]?.seq;
    return {
      events: this.events.filter((event) => event.seq > seq),
      gap: oldestSeq !== undefined && oldestSeq > seq + 1,
      ...(oldestSeq === undefined ? {} : { oldestSeq }),
    };
  }
}

export interface RpcServer {
  /** Stop accepting connections and remove the endpoint files. */
  close(): Promise<void>;
  /** Alias for close(), useful to callers that use server lifecycle wording. */
  stop(): Promise<void>;
  /** Push an event to every connection subscribed with subscribe-events. */
  emit(event: unknown): void;
  readonly transport: "unix" | "tcp";
  readonly socketPath: string;
  readonly portFile: string;
}

interface RpcResponse {
  id?: unknown;
  event?: unknown;
  seq?: number;
  gap?: boolean;
  oldestSeq?: number;
  result?: unknown;
  error?: { code?: string | number; message?: string; data?: unknown } | string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const SOCKET_NAME = "orchd.sock";
const PORT_NAME = "orchd.port";
const DEFAULT_TIMEOUT_MS = 5_000;
let nextRequestId = 1;

function endpointPaths(orchDir: string): { socket: string; port: string } {
  return { socket: join(orchDir, SOCKET_NAME), port: join(orchDir, PORT_NAME) };
}

function lineResponse(socket: Socket, response: RpcResponse): void {
  if (!socket.destroyed) socket.write(`${JSON.stringify(response)}\n`);
}

function errorResponse(id: unknown, code: string, message: string): RpcResponse {
  return { id, error: { code, message } };
}

function parseRequest(line: string): { id: unknown; method: string; params: unknown } | RpcResponse {
  let request: unknown;
  try {
    request = JSON.parse(line);
  } catch {
    return errorResponse(null, "INVALID_REQUEST", "Malformed JSON request");
  }
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    return errorResponse(null, "INVALID_REQUEST", "Request must be a JSON object");
  }
  const value = request as Record<string, unknown>;
  if (typeof value.method !== "string" || value.method.length === 0) {
    return errorResponse(value.id ?? null, "INVALID_REQUEST", "Request method must be a non-empty string");
  }
  return { id: value.id ?? null, method: value.method, params: value.params };
}

function handleLine(
  socket: Socket,
  line: string,
  handlers: RpcHandlers,
  subscriptions: Set<Socket>,
  replayBuffer: ReplayBuffer,
): void {
  const request = parseRequest(line);
  if (!("method" in request)) {
    lineResponse(socket, request);
    return;
  }
  if (request.method === "subscribe-events") {
    const params = isObject(request.params) ? request.params : undefined;
    const since = params?.since;
    if (typeof since === "number" && Number.isInteger(since)) {
      const replay = replayBuffer.since(since);
      if (replay.gap) lineResponse(socket, { gap: true, oldestSeq: replay.oldestSeq });
      for (const buffered of replay.events) lineResponse(socket, buffered);
    }
    subscriptions.add(socket);
  }
  const emit: RpcEventEmitter = (event) => lineResponse(socket, { event });
  const handler = handlers[request.method];
  if (!handler) {
    lineResponse(socket, errorResponse(request.id, "METHOD_NOT_FOUND", `Unknown method: ${request.method}`));
    return;
  }
  Promise.resolve()
    .then(() => handler(request.params, emit))
    .then((result) => lineResponse(socket, { id: request.id, result }))
    .catch((error: unknown) => {
      lineResponse(socket, errorResponse(request.id, "HANDLER_ERROR", errorMessage(error)));
    });
}

function attachConnection(
  socket: Socket,
  handlers: RpcHandlers,
  subscriptions: Set<Socket>,
  replayBuffer: ReplayBuffer,
): void {
  let buffer = "";
  socket.setEncoding("utf8");
  socket.on("data", (chunk: string) => {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).replace(/\r$/, "");
      buffer = buffer.slice(newline + 1);
      handleLine(socket, line, handlers, subscriptions, replayBuffer);
      newline = buffer.indexOf("\n");
    }
  });
  socket.on("close", () => subscriptions.delete(socket));
  socket.on("error", () => subscriptions.delete(socket));
}

function listen(server: Server, endpoint: string | { port: number; host: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(endpoint);
  });
}

function readPort(portFile: string): number | null {
  let text: string;
  try {
    text = readFileSync(portFile, "utf8").trim();
  } catch {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(text);
    const port = typeof parsed === "number" ? parsed : isObject(parsed) ? parsed.port : undefined;
    if (typeof port === "number" && Number.isInteger(port) && port > 0 && port < 65536) return port;
  } catch {
    const port = Number(text);
    if (Number.isInteger(port) && port > 0 && port < 65536) return port;
  }
  return null;
}

function connect(pathOrPort: string | number, timeoutMs: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = typeof pathOrPort === "string"
      ? createConnection(pathOrPort)
      : createConnection({ host: "127.0.0.1", port: pathOrPort });
    let settled = false;
    const finishError = (error: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(error);
    };
    const timer = setTimeout(() => finishError(new Error("RPC connection timed out")), timeoutMs);
    socket.once("connect", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once("error", finishError);
  });
}

async function connectDaemon(orchDir: string, timeoutMs: number): Promise<Socket> {
  const paths = endpointPaths(orchDir);
  try {
    return await connect(paths.socket, timeoutMs);
  } catch {}
  const port = existsSync(paths.port) ? readPort(paths.port) : null;
  if (port !== null) {
    try {
      return await connect(port, timeoutMs);
    } catch {
      // A stale port file is the same as an absent daemon to callers.
    }
  }
  throw new DaemonAbsentError(orchDir);
}

function responseError(response: RpcResponse): RpcError {
  const error = response.error;
  if (typeof error === "string") return new RpcError("RPC_ERROR", error);
  return new RpcError(error?.code ?? "RPC_ERROR", error?.message ?? "RPC request failed", error?.data);
}

function receiveResponse(socket: Socket, id: number, timeoutMs: number): Promise<RpcResponse> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("RPC request timed out"));
    }, timeoutMs);
    const onData = (chunk: string) => {
      buffer += chunk;
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) {
          try {
            const parsed: unknown = JSON.parse(line);
            if (!isObject(parsed)) continue;
            const message = parsed as unknown as RpcResponse;
            if (message.id === id) {
              clearTimeout(timer);
              socket.off("data", onData);
              resolve(message);
              return;
            }
          } catch {
            // Ignore unsolicited malformed data from a server.
          }
        }
        newline = buffer.indexOf("\n");
      }
    };
    socket.on("data", onData);
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    socket.once("close", () => {
      clearTimeout(timer);
      reject(new Error("RPC connection closed"));
    });
  });
}

/** Start the local RPC endpoint, preferring a unix socket and falling back to loopback TCP. */
export async function startRpcServer(
  orchDir: string,
  handlers: RpcHandlers,
  options: RpcServerOptions = {},
): Promise<RpcServer> {
  mkdirSync(orchDir, { recursive: true });
  const paths = endpointPaths(orchDir);
  const subscriptions = new Set<Socket>();
  const sockets = new Set<Socket>();
  const replayBuffer = new ReplayBuffer();
  const server = createServer((socket) => {
    sockets.add(socket);
    attachConnection(socket, handlers, subscriptions, replayBuffer);
    socket.once("close", () => sockets.delete(socket));
  });
  let transport: "unix" | "tcp";
  let port = 0;
  try {
    await listen(server, paths.socket);
    transport = "unix";
    try {
      unlinkSync(paths.port);
    } catch {}
  } catch (unixError: unknown) {
    const lockHeld = options.holdsDaemonLock ?? readDaemonLock(orchDir)?.pid === process.pid;
    if (unixError instanceof Error && Reflect.get(unixError, "code") === "EADDRINUSE" && lockHeld) {
      try {
        unlinkSync(paths.socket);
        await listen(server, paths.socket);
        transport = "unix";
        try {
          unlinkSync(paths.port);
        } catch {}
        return makeRpcServer(server, sockets, subscriptions, replayBuffer, paths, transport);
      } catch {
        // A live endpoint or an unremovable path still requires TCP fallback.
      }
    }
    try {
      server.close();
    } catch {}
    const tcpServer = createServer((socket) => {
      sockets.add(socket);
      attachConnection(socket, handlers, subscriptions, replayBuffer);
      socket.once("close", () => sockets.delete(socket));
    });
    await listen(tcpServer, { host: "127.0.0.1", port: 0 });
    port = (tcpServer.address() as { port: number }).port;
    writeFileSync(paths.port, `${port}\n`, { mode: 0o600 });
    transport = "tcp";
    return makeRpcServer(tcpServer, sockets, subscriptions, replayBuffer, paths, transport);
  }
  return makeRpcServer(server, sockets, subscriptions, replayBuffer, paths, transport);
}

function makeRpcServer(
  server: Server,
  sockets: Set<Socket>,
  subscriptions: Set<Socket>,
  replayBuffer: ReplayBuffer,
  paths: { socket: string; port: string },
  transport: "unix" | "tcp",
): RpcServer {
  const close = async (): Promise<void> => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => {
      if (!server.listening) return resolve();
      server.close(() => resolve());
    });
    if (transport === "unix") {
      try {
        unlinkSync(paths.socket);
      } catch {}
    } else {
      try {
        unlinkSync(paths.port);
      } catch {}
    }
    subscriptions.clear();
  };
  return {
    close,
    stop: close,
    emit: (event) => {
      const buffered = replayBuffer.push(event);
      for (const socket of subscriptions) lineResponse(socket, buffered);
    },
    transport,
    socketPath: paths.socket,
    portFile: paths.port,
  };
}

/** Make one request, probing the unix socket before the loopback-TCP port file. */
export async function rpcCall(
  orchDir: string,
  method: string,
  params?: unknown,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<unknown> {
  const socket = await connectDaemon(orchDir, timeoutMs);
  const id = nextRequestId++;
  try {
    socket.write(`${JSON.stringify({ id, method, params })}\n`);
    const response = await receiveResponse(socket, id, timeoutMs);
    if (response.error !== undefined) throw responseError(response);
    return response.result;
  } finally {
    socket.destroy();
  }
}

export interface EventSubscription {
  close(): void;
  readonly lastSeq: () => number;
}

/**
 * Subscribe to daemon-pushed events. A caller can reconnect by passing
 * `lastSeq()` as `since`; the daemon then replays events after that sequence.
 */
export function subscribeEvents(
  orchDir: string,
  opts: { since?: number },
  onEvent: (event: unknown, seq: number) => void,
  onGap?: (oldestSeq: number) => void,
): EventSubscription {
  let last = opts.since ?? 0;
  let socket: Socket | undefined;
  let closed = false;

  const subscription: EventSubscription = {
    close: () => {
      closed = true;
      socket?.destroy();
    },
    lastSeq: () => last,
  };

  void connectDaemon(orchDir, DEFAULT_TIMEOUT_MS)
    .then((connected) => {
      if (closed) {
        connected.destroy();
        return;
      }
      socket = connected;
      let buffer = "";
      connected.setEncoding("utf8");
      connected.on("data", (chunk: string) => {
        buffer += chunk;
        let newline = buffer.indexOf("\n");
        while (newline >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line) {
            try {
              const parsed: unknown = JSON.parse(line);
              if (!isObject(parsed)) {
                newline = buffer.indexOf("\n");
                continue;
              }
              const message = parsed as RpcResponse;
              if (message.gap === true && typeof message.oldestSeq === "number") {
                onGap?.(message.oldestSeq);
              } else if (message.seq !== undefined && typeof message.seq === "number" && "event" in message) {
                last = Math.max(last, message.seq);
                onEvent(message.event, message.seq);
              }
            } catch {
              // Ignore malformed unsolicited data from the daemon.
            }
          }
          newline = buffer.indexOf("\n");
        }
      });
      connected.on("error", () => {
        // The caller can reconnect using the sequence exposed by lastSeq().
      });
      connected.write(`${JSON.stringify({
        id: nextRequestId++,
        method: "subscribe-events",
        params: { since: opts.since },
      })}\n`);
    })
    .catch(() => {
      // A failed initial connection is surfaced by an empty subscription;
      // callers may retry with lastSeq() and a new subscription.
    });

  return subscription;
}

/** Subscribe to pushed events; the returned function closes the subscription. */
export async function rpcSubscribe(
  orchDir: string,
  method: string,
  onEvent: (event: unknown) => void,
): Promise<() => void> {
  const socket = await connectDaemon(orchDir, DEFAULT_TIMEOUT_MS);
  const id = nextRequestId++;
  let buffer = "";
  let responseResolve!: (value: unknown) => void;
  let responseReject!: (reason?: unknown) => void;
  const response = new Promise<unknown>((resolve, reject) => {
    responseResolve = resolve;
    responseReject = reject;
  });
  socket.setEncoding("utf8");
  socket.on("data", (chunk: string) => {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) {
        try {
          const parsed: unknown = JSON.parse(line);
          if (!isObject(parsed)) continue;
          const message = parsed as unknown as RpcResponse;
          if (Object.prototype.hasOwnProperty.call(message, "event")) {
            try {
              onEvent(message.event);
            } catch {}
          } else if (message.id === id) {
            if (message.error !== undefined) responseReject(responseError(message));
            else responseResolve(message.result);
          }
        } catch {}
      }
      newline = buffer.indexOf("\n");
    }
  });
  socket.once("error", responseReject);
  socket.write(`${JSON.stringify({ id, method })}\n`);
  await response;
  return () => socket.destroy();
}
