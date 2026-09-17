import type { Logger, OrchDir } from "../../types/core.ts";
import { createServer, type Server, type Socket } from "node:net";
import { randomBytes } from "node:crypto";
import { chmodSync, unlinkSync, writeFileSync } from "node:fs";
import { readDaemonLock } from "../client/process.ts";
import { attachBridge, detachBridge, attachedBridgeKeys, type BridgeLink } from "../../control/bridge-links.ts";
import type { BridgeDelivery } from "../../control/bridge-message.ts";
import { ensurePrivateDir, errorMessage } from "../../util.ts";
import { createEventBus, type EventBus } from "./event-bus.ts";
import { hostOs } from "../../host.ts";
import type { SessionAgentIdentity } from "../../types/store.ts";
import type { EndpointPaths, RpcEventEmitter, RpcHandlers, RpcRequestContext, RpcServer, RpcServerOptions } from "../../types/daemon.ts";
import type { IdentityMethod, ParamsOf, RpcMethod } from "../client/protocol.ts";
import { RpcError, endpointPaths, errorResponse, framedLineReader, lineResponse, parseRequest, type RpcRequest } from "../client/wire.ts";
import { ReplayBuffer } from "./replay.ts";
import { isRegisterSessionResponse } from "../client/registration.ts";
import { registerSession, claimIdentity } from "./session-registry.ts";

interface ConnectionState {
  identity?: SessionAgentIdentity;
  bridge?: { key: string; link: BridgeLink };
}

function detachConnectionBridge(orchDir: OrchDir, state: ConnectionState): void {
  if (state.bridge === undefined) return;
  detachBridge(orchDir, state.bridge.key, state.bridge.link);
  state.bridge = undefined;
}

function logRpc(logger: Logger | undefined, request: RpcRequest, transport: "unix" | "tcp", startedAt: number, error?: unknown): void {
  const fields: Record<string, string | number | boolean | null> = {
    method: request.method,
    id: request.id,
    transport,
    ok: error === undefined,
    elapsedMs: Date.now() - startedAt,
  };
  if (error !== undefined) fields.error = errorMessage(error);
  logger?.trace("rpc", fields);
}

/** A refused attach has already been answered on its socket, so the request ends there. */
type AttachOutcome =
  | { readonly kind: "not-attach" }
  | { readonly kind: "refused" }
  | { readonly kind: "attached"; readonly notify: () => void };

function attachRequest(
  orchDir: OrchDir,
  socket: Socket,
  request: Extract<RpcRequest, { method: "attach" }>,
  state: ConnectionState,
  transport: "unix" | "tcp",
  onBridgeAttached: ((key: string) => void) | undefined,
  logger: Logger | undefined,
): AttachOutcome {
  if (request.method !== "attach") return { kind: "not-attach" };
  const startedAt = Date.now();
  const key = request.params.key;
  detachConnectionBridge(orchDir, state);
  const link: BridgeLink = {
    push: (delivery: BridgeDelivery) => lineResponse(socket, { kind: "delivery", delivery }),
  };
  // A bridge for an agent this store does not know is refused on its own socket; it never ends the daemon.
  try {
    attachBridge(orchDir, key, link);
  } catch (error: unknown) {
    lineResponse(socket, errorResponse(request.id, "UNKNOWN_AGENT", errorMessage(error)));
    logRpc(logger, request, transport, startedAt, error);
    logger?.info("bridge.refused", { key, reason: errorMessage(error) });
    return { kind: "refused" };
  }
  logger?.info("bridge.attached", { key });
  state.bridge = { key, link };
  return { kind: "attached", notify: () => onBridgeAttached?.(key) };
}

function invoke<M extends Exclude<RpcMethod, IdentityMethod>>(
  handlers: RpcHandlers,
  method: M,
  params: ParamsOf<M>,
  emit: RpcEventEmitter,
  context: RpcRequestContext,
): unknown {
  return handlers[method](params, emit, context);
}

function dispatchRequest(
  socket: Socket,
  request: Exclude<RpcRequest, { method: IdentityMethod }>,
  handlers: RpcHandlers,
  emit: RpcEventEmitter,
  state: ConnectionState,
  transport: "unix" | "tcp",
  logger: Logger | undefined,
  notifyBridgeAttached?: () => void,
): void {
  const startedAt = Date.now();
  Promise.resolve()
    .then(() => invoke(handlers, request.method, request.params, emit, { transport, identity: state.identity }))
    .then((result) => {
      lineResponse(socket, { kind: "reply", id: request.id, result });
      logRpc(logger, request, transport, startedAt);
      notifyBridgeAttached?.();
    })
    .catch((error: unknown) => {
      lineResponse(socket, errorResponse(request.id, "HANDLER_ERROR", errorMessage(error)));
      logRpc(logger, request, transport, startedAt, error);
      notifyBridgeAttached?.();
    });
}

function handleLine(
  socket: Socket,
  line: string,
  handlers: RpcHandlers,
  subscriptions: Set<Socket>,
  replayBuffer: ReplayBuffer,
  orchDir: OrchDir,
  transport: "unix" | "tcp",
  state: ConnectionState,
  daemonToken: string,
  onBridgeAttached: ((key: string) => void) | undefined,
  logger: Logger | undefined,
): void {
  const request = parseRequest(line);
  if (!("method" in request)) {
    lineResponse(socket, request);
    return;
  }
  if (request.method === "register-session" || request.method === "claim-identity") {
    const startedAt = Date.now();
    Promise.resolve()
      .then(() => request.method === "register-session"
        ? registerSession(orchDir, request.params, daemonToken, logger)
        : claimIdentity(orchDir, request.params, daemonToken))
      .then((identity) => {
        if (isRegisterSessionResponse(identity)) state.identity = identity;
        lineResponse(socket, { kind: "reply", id: request.id, result: identity });
        logRpc(logger, request, transport, startedAt);
      })
      .catch((error: unknown) => {
        lineResponse(socket, errorResponse(request.id, error instanceof RpcError ? error.code : "HANDLER_ERROR", errorMessage(error)));
        logRpc(logger, request, transport, startedAt, error);
      });
    return;
  }
  if (request.method === "subscribe-events") {
    const since = request.params.since;
    if (since !== undefined) {
      const replay = replayBuffer.since(since);
      if (replay.gap && replay.oldestSeq !== undefined) lineResponse(socket, { kind: "gap", oldestSeq: replay.oldestSeq });
      for (const buffered of replay.events) lineResponse(socket, { kind: "event", ...buffered });
    }
    subscriptions.add(socket);
  }
  const attach: AttachOutcome = request.method === "attach"
    ? attachRequest(orchDir, socket, request, state, transport, onBridgeAttached, logger)
    : { kind: "not-attach" };
  if (attach.kind === "refused") return;
  const emit: RpcEventEmitter = (event) => lineResponse(socket, { kind: "event", event });
  dispatchRequest(socket, request, handlers, emit, state, transport, logger, attach.kind === "attached" ? attach.notify : undefined);
}


function attachConnection(
  socket: Socket,
  handlers: RpcHandlers,
  subscriptions: Set<Socket>,
  replayBuffer: ReplayBuffer,
  orchDir: OrchDir,
  transport: "unix" | "tcp",
  daemonToken: string,
  onBridgeAttached: ((key: string) => void) | undefined,
  logger: Logger | undefined,
): () => void {
  const state: ConnectionState = {};
  const detach = () => {
    subscriptions.delete(socket);
    detachConnectionBridge(orchDir, state);
  };
  framedLineReader(socket, (line) =>
    handleLine(socket, line.replace(/\r$/, ""), handlers, subscriptions, replayBuffer, orchDir, transport, state, daemonToken, onBridgeAttached, logger),
  );
  socket.on("close", detach);
  socket.on("error", detach);
  return detach;
}

/** Mark the socket path on disk after binding. A POSIX bind creates that entry
 *  itself; a Windows named pipe never does, so a client probing the path would
 *  call a live daemon absent. `close()` unlinks the path either way. */
function markSocketBound(socketPath: string): void {
  if (hostOs() !== "windows") return;
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
  orchDir: OrchDir,
  handlers: RpcHandlers,
  options: RpcServerOptions = {},
): Promise<RpcServer> {
  ensurePrivateDir(orchDir);
  const paths = endpointPaths(orchDir);
  const subscriptions = new Set<Socket>();
  const sockets = new Set<Socket>();
  const connectionCleanups = new Set<() => void>();
  const replayBuffer = new ReplayBuffer(orchDir);
  const logger = options.logger;
  const bus = createEventBus(logger);
  const unsubscribeBus = bus.on((event) => {
    const buffered = replayBuffer.push(event);
    for (const socket of subscriptions) lineResponse(socket, { kind: "event", ...buffered });
  });
  const daemonToken = writeDaemonToken(paths.token);
  const attachFor = (transport: "unix" | "tcp") => (socket: Socket): void => {
    sockets.add(socket);
    const cleanup = attachConnection(socket, handlers, subscriptions, replayBuffer, orchDir, transport, daemonToken, options.onBridgeAttached, logger);
    connectionCleanups.add(cleanup);
    socket.once("close", () => {
      sockets.delete(socket);
      connectionCleanups.delete(cleanup);
    });
  };
  const attachUnix = attachFor("unix");
  const attachTcp = attachFor("tcp");
  const server = createServer(attachUnix);
  if (await bindUnix(server, paths, reclaimableSocket(orchDir, options))) {
    const tcpServer = await startTcpServer(attachTcp, options, paths);
    return makeRpcServer(server, tcpServer, sockets, connectionCleanups, subscriptions, bus, unsubscribeBus, paths, "unix", tcpEndpointOf(tcpServer));
  }
  try { server.close(); } catch {}
  const tcpServer = createServer(attachTcp);
  await listen(tcpServer, { host: "127.0.0.1", port: options.tcpPort ?? 0 });
  const boundPort = boundTcpPort(tcpServer);
  writeFileSync(paths.port, `${boundPort}\n`, { mode: 0o600 });
  return makeRpcServer(tcpServer, undefined, sockets, connectionCleanups, subscriptions, bus, unsubscribeBus, paths, "tcp", `tcp://127.0.0.1:${boundPort}`);
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
function reclaimableSocket(orchDir: OrchDir, options: RpcServerOptions): (error: unknown) => boolean {
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
  return options.tcpPort ?? (hostOs() === "windows" ? 0 : undefined);
}

function tcpEndpointOf(tcpServer: Server | undefined): string | undefined {
  const address = tcpServer?.address();
  return address !== null && typeof address === "object" ? `tcp://127.0.0.1:${address.port}` : undefined;
}

function makeRpcServer(
  server: Server,
  tcpServer: Server | undefined,
  sockets: Set<Socket>,
  connectionCleanups: Set<() => void>,
  subscriptions: Set<Socket>,
  bus: EventBus,
  unsubscribeBus: () => void,
  paths: { socket: string; port: string; token: string },
  transport: "unix" | "tcp",
  tcpEndpoint?: string,
): RpcServer {
  const close = async (): Promise<void> => {
    for (const cleanup of connectionCleanups) cleanup();
    for (const socket of sockets) socket.destroy();
    await Promise.all([server, tcpServer].filter((value): value is Server => value !== undefined).map((listener) => new Promise<void>((resolve) => {
      if (!listener.listening) return resolve();
      listener.close(() => resolve());
    })));
    try { unlinkSync(paths.socket); } catch {}
    try { unlinkSync(paths.port); } catch {}
    try { unlinkSync(paths.token); } catch {}
    unsubscribeBus();
    subscriptions.clear();
  };
  return {
    close,
    emit: (event) => bus.emit(event),
    subscriberCount: () => subscriptions.size,
    attachedBridgeCount: () => attachedBridgeKeys().length,
    transport,
    socketPath: paths.socket,
    portFile: paths.port,
    tcpEndpoint,
  };
}
