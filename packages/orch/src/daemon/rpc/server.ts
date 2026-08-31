import { createServer, type Server, type Socket } from "node:net";
import { randomBytes } from "node:crypto";
import { chmodSync, unlinkSync, writeFileSync } from "node:fs";
import { readDaemonLock } from "../lifecycle.ts";
import { ensurePrivateDir, errorMessage, isRecord, osSide } from "../../util.ts";
import type { SessionAgentIdentity } from "../../types/store.ts";
import type { EndpointPaths, RpcEventEmitter, RpcHandlers, RpcServer, RpcServerOptions } from "../../types/daemon.ts";
import { RpcError, ReplayBuffer, endpointPaths, errorResponse, framedLineReader, lineResponse, parseRequest } from "./wire.ts";
import { isRegisterSessionResponse, registerSession, claimIdentity } from "./registration.ts";

interface ConnectionState {
  identity?: SessionAgentIdentity;
}
function handleLine(
  socket: Socket,
  line: string,
  handlers: RpcHandlers,
  subscriptions: Set<Socket>,
  replayBuffer: ReplayBuffer,
  orchDir: string,
  transport: "unix" | "tcp",
  state: ConnectionState,
  daemonToken: string,
): void {
  const request = parseRequest(line);
  if (!("method" in request)) {
    lineResponse(socket, request);
    return;
  }
  if (request.method === "register-session" || request.method === "claim-identity") {
    Promise.resolve()
      .then(() => request.method === "register-session"
        ? registerSession(orchDir, request.params, daemonToken)
        : claimIdentity(orchDir, request.params, daemonToken))
      .then((identity) => {
        if (isRegisterSessionResponse(identity)) state.identity = identity;
        lineResponse(socket, { id: request.id, result: identity });
      })
      .catch((error: unknown) => {
        lineResponse(socket, errorResponse(request.id, error instanceof RpcError ? String(error.code) : "HANDLER_ERROR", errorMessage(error)));
      });
    return;
  }
  if (request.method === "subscribe-events") {
    const params = isRecord(request.params) ? request.params : undefined;
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
    .then(() => handler(request.params, emit, { transport, identity: state.identity }))
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
  orchDir: string,
  transport: "unix" | "tcp",
  daemonToken: string,
): void {
  const state: ConnectionState = {};
  framedLineReader(socket, (line) =>
    handleLine(socket, line.replace(/\r$/, ""), handlers, subscriptions, replayBuffer, orchDir, transport, state, daemonToken),
  );
  socket.on("close", () => subscriptions.delete(socket));
  socket.on("error", () => subscriptions.delete(socket));
}

/** Mark the socket path on disk after binding. A POSIX bind creates that entry
 *  itself; a Windows named pipe never does, so a client probing the path would
 *  call a live daemon absent. `close()` unlinks the path either way. */
function markSocketBound(socketPath: string): void {
  if (osSide() !== "windows") return;
  try {
    writeFileSync(socketPath, "", { mode: 0o600 });
  } catch {
    // No marker just means clients fall back to the port file.
  }
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
/** Mint this daemon instance's credential. Reapply mode because chmod is not
 *  implied when writeFileSync truncates an existing file. */
function writeDaemonToken(path: string): string {
  const token = randomBytes(32).toString("hex");
  writeFileSync(path, `${token}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
  return token;
}

/** Return the port assigned by a TCP listener, failing instead of guessing. */
function boundTcpPort(server: Server): number {
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("TCP listener did not report an address");
  return address.port;
}

/** Start the local RPC endpoint, preferring a unix socket and falling back to loopback TCP. */
export async function startRpcServer(
  orchDir: string,
  handlers: RpcHandlers,
  options: RpcServerOptions = {},
): Promise<RpcServer> {
  ensurePrivateDir(orchDir);
  const paths = endpointPaths(orchDir);
  const subscriptions = new Set<Socket>();
  const sockets = new Set<Socket>();
  const replayBuffer = new ReplayBuffer(orchDir);
  const daemonToken = writeDaemonToken(paths.token);
  const attachFor = (transport: "unix" | "tcp") => (socket: Socket): void => {
    sockets.add(socket);
    attachConnection(socket, handlers, subscriptions, replayBuffer, orchDir, transport, daemonToken);
    socket.once("close", () => sockets.delete(socket));
  };
  const attachUnix = attachFor("unix");
  const attachTcp = attachFor("tcp");
  const server = createServer(attachUnix);
  if (await bindUnix(server, paths, reclaimableSocket(orchDir, options))) {
    const tcpServer = await startTcpServer(attachTcp, options, paths);
    return makeRpcServer(server, tcpServer, sockets, subscriptions, replayBuffer, paths, "unix", tcpEndpointOf(tcpServer));
  }
  try { server.close(); } catch {}
  const tcpServer = createServer(attachTcp);
  await listen(tcpServer, { host: "127.0.0.1", port: options.tcpPort ?? 0 });
  const boundPort = boundTcpPort(tcpServer);
  writeFileSync(paths.port, `${boundPort}\n`, { mode: 0o600 });
  return makeRpcServer(tcpServer, undefined, sockets, subscriptions, replayBuffer, paths, "tcp", `tcp://127.0.0.1:${boundPort}`);
}

/**
 * Claim the unix endpoint: bind it, mark the path so a client can find it, and
 * drop the port file a previous TCP fallback left behind. `false` means the path
 * is not ours to take and the caller falls back to loopback TCP.
 *
 * The whole claim lives here because it is made twice — once outright, once after
 * clearing a stale path — and a fact added to one copy but not the other leaves a
 * recovered daemon reachable somewhere its fresh self is not.
 */
async function bindUnix(server: Server, paths: EndpointPaths, reclaimable: (error: unknown) => boolean): Promise<boolean> {
  let refusal = await refusedListen(server, paths.socket);
  if (refusal !== undefined && reclaimable(refusal)) {
    // Our own corpse: clear the path and take the address back. A live endpoint
    // or an unremovable path still requires the TCP fallback.
    try {
      unlinkSync(paths.socket);
    } catch {
      return false;
    }
    refusal = await refusedListen(server, paths.socket);
  }
  if (refusal !== undefined) return false;
  markSocketBound(paths.socket);
  try {
    unlinkSync(paths.port);
  } catch {}
  return true;
}

/** The error a bind refused with, or `undefined` when it took the address. */
async function refusedListen(server: Server, endpoint: string): Promise<unknown> {
  try {
    await listen(server, endpoint);
    return undefined;
  } catch (error: unknown) {
    return error;
  }
}

/** A bind refusal this process may clear: the address is taken and the lock on it
 *  is ours, so the path is a corpse of our own previous instance. */
function reclaimableSocket(orchDir: string, options: RpcServerOptions): (error: unknown) => boolean {
  return (error: unknown) => {
    if (!(error instanceof Error) || Reflect.get(error, "code") !== "EADDRINUSE") return false;
    return options.holdsDaemonLock ?? readDaemonLock(orchDir)?.pid === process.pid;
  };
}

async function startTcpServer(
  attach: (socket: Socket) => void,
  options: RpcServerOptions,
  paths: EndpointPaths,
): Promise<Server | undefined> {
  const port = companionTcpPort(options);
  if (port === undefined) return undefined;
  const tcpServer = createServer(attach);
  try {
    await listen(tcpServer, { host: "127.0.0.1", port });
    const boundPort = boundTcpPort(tcpServer);
    writeFileSync(paths.port, `${boundPort}\n`, { mode: 0o600 });
    return tcpServer;
  } catch (error: unknown) {
    try { tcpServer.close(); } catch {}
    options.onTcpError?.(error, port);
    return undefined;
  }
}

/** The loopback port bound beside the unix socket: the configured one, else an
 *  ephemeral one on Windows, where a client cannot stat an AF_UNIX socket path
 *  and needs the port file as its fallback dial to a live daemon. */
function companionTcpPort(options: RpcServerOptions): number | undefined {
  return options.tcpPort ?? (osSide() === "windows" ? 0 : undefined);
}

function tcpEndpointOf(tcpServer: Server | undefined): string | undefined {
  const address = tcpServer?.address();
  return address !== null && typeof address === "object" ? `tcp://127.0.0.1:${address.port}` : undefined;
}

function makeRpcServer(
  server: Server,
  tcpServer: Server | undefined,
  sockets: Set<Socket>,
  subscriptions: Set<Socket>,
  replayBuffer: ReplayBuffer,
  paths: { socket: string; port: string; token: string },
  transport: "unix" | "tcp",
  tcpEndpoint?: string,
): RpcServer {
  const close = async (): Promise<void> => {
    for (const socket of sockets) socket.destroy();
    await Promise.all([server, tcpServer].filter((value): value is Server => value !== undefined).map((listener) => new Promise<void>((resolve) => {
      if (!listener.listening) return resolve();
      listener.close(() => resolve());
    })));
    try { unlinkSync(paths.socket); } catch {}
    try { unlinkSync(paths.port); } catch {}
    try { unlinkSync(paths.token); } catch {}
    subscriptions.clear();
  };
  return {
    close,
    emit: (event) => {
      const buffered = replayBuffer.push(event);
      for (const socket of subscriptions) lineResponse(socket, buffered);
    },
    subscriberCount: () => subscriptions.size,
    transport,
    socketPath: paths.socket,
    portFile: paths.port,
    tcpEndpoint,
  };
}
