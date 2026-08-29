import { createConnection, createServer, type Server, type Socket } from "node:net";
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { liveDaemonRegistration, readDaemonLock } from "./lifecycle.ts";
import { daemonRuntimeFiles } from "./runtime-files.ts";
import { readPortPath } from "../presence/socket-client.ts";
import { errorMessage } from "../util.ts";
import { appendEvent, oldestEventSeq, selectEventsSince } from "../store/event-rows.ts";
import { callerSession } from "../identity/self.ts";
import { currentHostOs, getOrCreateSessionAgent, isLiveAgentIdentity, type HostOs, type SessionAgentIdentity } from "../store/agent-rows.ts";
import { processStartToken } from "../process-identity.ts";
import { openStore } from "../store/connection.ts";
import { allBackends } from "../backends/registry.ts";
import { supportedPlexerVersion, supportedRange } from "../backends/versions.ts";
import { ensureDaemon, translateDaemonError } from "../commands/daemon.ts";

export type RpcParams = unknown;
export type RpcEventEmitter = (event: unknown) => void;
export interface RpcRequestContext {
  readonly transport: "unix" | "tcp";
  readonly identity?: SessionAgentIdentity;
}

export interface UnleasedAgent {
  readonly id: string;
  readonly name: string;
}

/** The hello identity retains its existing fields and appends the adoptable agents summary. */
export type HelloResponse = SessionAgentIdentity & { readonly unleased: readonly UnleasedAgent[]; readonly registrationWarning?: string };
export type RpcHandler = (params: RpcParams, emit: RpcEventEmitter, context: RpcRequestContext) => unknown;
export type RpcHandlers = Record<string, RpcHandler>;

/** Nothing holds the endpoint: every dial was refused or found no endpoint at all. */
export class DaemonAbsentError extends Error {
  readonly code = "DAEMON_ABSENT";

  constructor(orchDir: string) {
    super(`orchd daemon is absent (${orchDir})`);
    this.name = "DaemonAbsentError";
  }
}

/** A dial or request outran its budget. Says nothing about liveness — a loaded
 *  machine starves a healthy daemon — so no caller may signal a pid on it. */
export class DaemonUnreachableError extends Error {
  readonly code = "DAEMON_UNREACHABLE";

  constructor(stage: "connect" | "response") {
    super(`orchd did not answer in time (${stage}); its liveness is unknown`);
    this.name = "DaemonUnreachableError";
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
  /** TCP port to bind on loopback alongside the unix socket. */
  tcpPort?: number;
  /** Report a TCP bind failure without taking down the unix listener. */
  onTcpError?: (error: unknown, port: number) => void;
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

/** Maximum number of durable events returned by one replay request. Retention is configured
 * separately; this bound prevents a subscriber from being flooded by an unbounded replay. */
export const REPLAY_WINDOW = 1_000;

export class ReplayBuffer {
  constructor(private readonly orchDir: string) {}

  push(event: unknown): BufferedEvent {
    const stored = appendEvent(this.orchDir, Date.now(), event);
    return { event: stored.event, seq: stored.seq };
  }

  since(seq: number): ReplayResult {
    const oldestSeq = oldestEventSeq(this.orchDir);
    // `seq` is the last sequence the subscriber has. The row immediately before
    // the oldest retained row is still contiguous; only an earlier request has a gap.
    const gap = oldestSeq !== undefined && seq < oldestSeq - 1;
    return {
      events: selectEventsSince(this.orchDir, seq, REPLAY_WINDOW).map(({ event, seq: eventSeq }) => ({ event, seq: eventSeq })),
      gap,
      ...(oldestSeq === undefined ? {} : { oldestSeq }),
    };
  }
}

export interface RpcServer {
  /** Stop accepting connections and remove the endpoint files. */
  close(): Promise<void>;
  /** Push an event to every connection subscribed with subscribe-events. */
  emit(event: unknown): void;
  /** How many connections currently hold a subscribe-events subscription. */
  subscriberCount(): number;
  readonly transport: "unix" | "tcp";
  readonly socketPath: string;
  readonly portFile: string;
  readonly tcpEndpoint?: string;
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

export function isRpcResponse(value: unknown): value is RpcResponse {
  if (!isObject(value)) return false;
  const hasId = Object.prototype.hasOwnProperty.call(value, "id");
  const hasResult = Object.prototype.hasOwnProperty.call(value, "result");
  const hasError = Object.prototype.hasOwnProperty.call(value, "error");
  const hasEvent = Object.prototype.hasOwnProperty.call(value, "event");
  const hasGap = Object.prototype.hasOwnProperty.call(value, "gap");
  if (!hasId && !hasEvent && !hasGap) return false;
  if (hasId && value.id !== null && typeof value.id !== "number") return false;
  if (hasResult && hasError) return false;
  if (hasId && !hasResult && !hasError) return false;
  if (hasEvent && value.event === undefined) return false;
  if ("seq" in value && (typeof value.seq !== "number" || !Number.isSafeInteger(value.seq))) return false;
  if (hasGap && (value.gap !== true || typeof value.oldestSeq !== "number")) return false;
  if ("oldestSeq" in value && typeof value.oldestSeq !== "number") return false;
  if (hasError) {
    const error = value.error;
    if (typeof error === "string") return true;
    if (!isObject(error)) return false;
    if (typeof error.code !== "string" && typeof error.code !== "number") return false;
    if (typeof error.message !== "string") return false;
  }
  return hasEvent || hasGap || hasResult || hasError;
}

function isUnleasedAgent(value: unknown): value is UnleasedAgent {
  return isObject(value) && typeof value.id === "string" && typeof value.name === "string";
}

/** Validate every field carried by the hello response before trusting it. */
export function isHelloResponse(value: unknown): value is HelloResponse {
  return isObject(value)
    && typeof value.id === "string"
    && value.id.length > 0
    && typeof value.label === "string"
    && value.kind === "session"
    && Array.isArray(value.unleased)
    && value.unleased.every(isUnleasedAgent)
    && (value.registrationWarning === undefined || typeof value.registrationWarning === "string");
}

const DEFAULT_TIMEOUT_MS = 5_000;
// Bounds for the self-healing event subscription's reconnect loop. A daemon can
// return at any time (restart, reload, machine wake), so retries never give up;
// they only stop climbing once the delay reaches the cap.
const RECONNECT_BASE_MS = 250;
const RECONNECT_CAP_MS = 5_000;
let nextRequestId = 1;

/** Print the startup adoption hint once for each session identity. The writer seam keeps
 * command output testable without changing the wire response. */
export function announceUnleasedAgents(
  orchDir: string,
  identity: HelloResponse,
  write: (text: string) => void = (text) => { process.stdout.write(text); },
): void {
  if (identity.unleased.length === 0) return;
  write(`${identity.unleased.length} unleased agent(s) exist - orch adopt ${identity.unleased[0]!.name} to take one, orch status to see them.\n`);
}

export function endpointPaths(orchDir: string): { socket: string; port: string; token: string } {
  const registration = liveDaemonRegistration(orchDir);
  if (registration) return { socket: registration.socket, port: registration.port, token: registration.token };
  const files = daemonRuntimeFiles(orchDir);
  return { socket: files.socket, port: files.port, token: files.token };
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
  if (!isObject(request)) {
    return errorResponse(null, "INVALID_REQUEST", "Request must be a JSON object");
  }
  const value = request;
  if (typeof value.method !== "string" || value.method.length === 0) {
    return errorResponse(value.id ?? null, "INVALID_REQUEST", "Request method must be a non-empty string");
  }
  return { id: value.id ?? null, method: value.method, params: value.params };
}

interface ConnectionState {
  identity?: SessionAgentIdentity;
}

/**
 * Issue the caller's identity. One mechanism serves both transports: the token file
 * is `0600` in a directory only this uid can read, so presenting it proves the caller
 * is the same uid as the daemon — exactly what peer credentials establish, and the
 * only proof portable node can obtain (it exposes neither SO_PEERCRED nor a peer's
 * ancestry, and scraping `/proc` or `ss` for them works on Linux alone).
 *
 * The session pid and label are the caller's own report, used for continuity and
 * display, never for authorization: a same-uid caller that misreports its session
 * gains nothing it could not already do by dialing again.
 */
function nonEmpty(value: string | undefined): string | undefined {
  if (value === "") return undefined;
  return value;
}

function hostOs(): HostOs {
  try {
    return currentHostOs();
  } catch (error: unknown) {
    throw new RpcError("IDENTITY_UNAVAILABLE", `hello cannot register this host: ${errorMessage(error)}`);
  }
}

function isUnleasedAgentRow(value: unknown): value is { id: string; name: string } {
  return isObject(value) && typeof value.id === "string" && typeof value.name === "string";
}

function unleasedAgents(orchDir: string, excludeId: string): UnleasedAgent[] {
  const rows = openStore(orchDir).query(
    `SELECT a.id, a.name
       FROM agents a
       LEFT JOIN agent_endings e ON e.agent_id = a.id
      WHERE a.id <> ?
        AND e.agent_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM agent_leases newest
           WHERE newest.agent_id = a.id
             AND newest.id = (SELECT MAX(latest.id) FROM agent_leases latest WHERE latest.agent_id = a.id)
             AND newest.until IS NULL
        )
      ORDER BY a.id`,
  ).all(excludeId);
  return rows.filter(isUnleasedAgentRow).map(({ id, name }) => ({ id, name }));
}

function helloIdentity(orchDir: string, params: unknown, daemonToken: string): HelloResponse {
  const claim = isObject(params) ? params : {};
  if (claim.token !== daemonToken) throw new RpcError("IDENTITY_REQUIRED", "hello requires the daemon token");
  const pid = typeof claim.pid === "number" ? claim.pid : Number.NaN;
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new RpcError("IDENTITY_UNAVAILABLE", "hello requires the caller's session pid");
  const harness = typeof claim.harness === "string" ? claim.harness.trim() : "";
  const cwd = typeof claim.cwd === "string" ? claim.cwd.trim() : "";
  if (!harness || !cwd) throw new RpcError("IDENTITY_UNAVAILABLE", "hello requires the caller's harness and cwd");
  const startToken = processStartToken(pid);
  if (!startToken) throw new RpcError("IDENTITY_UNAVAILABLE", "hello could not verify the caller's session process");
  // A CLI invocation is short-lived, while its parent session is not. Detect the
  // first hello for that process instance so the startup hint cannot repeat on
  // every subsequent `orch` command from the same session.
  const alreadyRegistered = openStore(orchDir).query(
    `SELECT a.id FROM agents a
       JOIN agent_processes p ON p.agent_id = a.id AND p.until IS NULL
       LEFT JOIN agent_endings e ON e.agent_id = a.id
      WHERE p.pid = ? AND p.start_token = ? AND e.agent_id IS NULL
      LIMIT 1`,
  ).get(pid, startToken) != null;
  const sessionToken = typeof claim.sessionToken === "string" && claim.sessionToken.length > 0
    ? claim.sessionToken
    : null;
  const claimed = typeof claim.label === "string" ? claim.label.trim() : "";
  const host = hostname();
  const plexerId = typeof claim.plexer === "string" ? claim.plexer.trim() : null;
  const plexerVersion = typeof claim.plexerVersion === "string" ? claim.plexerVersion.trim() : null;
  const identity = getOrCreateSessionAgent(orchDir, {
    pid,
    startToken,
    sessionToken,
    harnessId: harness,
    cwd,
    label: claimed || `${harness} session ${pid}`,
    hostId: host,
    hostName: host,
    hostOs: hostOs(),
    plexerId,
    plexerVersion,
    now: Date.now(),
  });
  const registrationWarning = plexerId && plexerVersion && supportedRange(plexerId) && !supportedPlexerVersion(plexerId, plexerVersion)
    ? `plexer ${plexerId} ${plexerVersion} is outside orch's supported ${supportedRange(plexerId)}; update orch`
    : undefined;
  return {
    ...identity,
    ...(registrationWarning ? { registrationWarning } : {}),
    // The summary belongs to session startup. Later invocations retain the
    // field for wire stability but have no announcement to make.
    unleased: alreadyRegistered ? [] : unleasedAgents(orchDir, identity.id),
  };
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
  if (request.method === "hello") {
    Promise.resolve()
      .then(() => helloIdentity(orchDir, request.params, daemonToken))
      .then((identity) => {
        state.identity = identity;
        lineResponse(socket, { id: request.id, result: identity });
      })
      .catch((error: unknown) => {
        lineResponse(socket, errorResponse(request.id, error instanceof RpcError ? String(error.code) : "HANDLER_ERROR", errorMessage(error)));
      });
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
    .then(() => handler(request.params, emit, { transport, identity: state.identity }))
    .then((result) => lineResponse(socket, { id: request.id, result }))
    .catch((error: unknown) => {
      lineResponse(socket, errorResponse(request.id, "HANDLER_ERROR", errorMessage(error)));
    });
}

/**
 * Drive `onLine` for each newline-framed line arriving on `socket`, buffering
 * partial lines across chunks. This owns only the framing loop — encoding,
 * split-on-newline, and cross-chunk buffering. Callers keep their own error,
 * close, and per-line parse semantics by attaching those listeners themselves
 * and doing any trim/parse inside `onLine`.
 */
function framedLineReader(socket: Socket, onLine: (line: string) => void): void {
  let buffer = "";
  socket.setEncoding("utf8");
  socket.on("data", (chunk: string) => {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      onLine(line);
      newline = buffer.indexOf("\n");
    }
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
  if (process.platform !== "win32") return;
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

function connect(pathOrPort: string | number, timeoutMs: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = typeof pathOrPort === "string"
      ? createConnection(pathOrPort)
      : createConnection({ host: "127.0.0.1", port: pathOrPort });
    let settled = false;
    // The timeout rejects WITHOUT destroying: tearing down a socket whose
    // native connect is still in flight makes the late completion surface as
    // an uncatchable error on Windows. The connect/error handlers stay armed
    // and destroy the socket once the native attempt actually settles.
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.unref();
      reject(new DaemonUnreachableError("connect"));
    }, timeoutMs);
    socket.once("connect", () => {
      clearTimeout(timer);
      if (settled) {
        socket.destroy();
        return;
      }
      settled = true;
      resolve(socket);
    });
    // "on", not "once": a Windows pipe connect can emit a second error after the
    // first settles the promise — an unlistened emission throws in the caller.
    socket.on("error", (error: Error) => {
      clearTimeout(timer);
      socket.destroy();
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}

/** Why a dial yielded no socket. Only these two codes prove nothing is listening;
 *  every other failure (a full accept backlog's EAGAIN, EACCES, a timeout) leaves
 *  liveness unknown, and callers must not act as if the daemon were dead. */
const NOT_LISTENING_CODES = new Set(["ENOENT", "ECONNREFUSED"]);

type DialSilence = "not-listening" | "unreachable";

function silenceOf(error: unknown): DialSilence {
  const code = isObject(error) && typeof error.code === "string" ? error.code : undefined;
  return code !== undefined && NOT_LISTENING_CODES.has(code) ? "not-listening" : "unreachable";
}

/** Dial one daemon endpoint, or say why it stayed silent. An absent unix-socket
 *  path is skipped without dialing — a dead pipe path faults uncatchably on
 *  Windows, and a missing endpoint is proof nothing listens there. */
async function dialEndpoint(endpoint: string | number | undefined, timeoutMs: number): Promise<Socket | DialSilence> {
  if (endpoint === undefined) return "not-listening";
  if (typeof endpoint === "string" && !existsSync(endpoint)) return "not-listening";
  try {
    return await connect(endpoint, timeoutMs);
  } catch (error: unknown) {
    return silenceOf(error);
  }
}

function stayedSilent(outcome: Socket | DialSilence): outcome is DialSilence {
  return typeof outcome === "string";
}

/** Dial orchd. Deliberately NOT retried: callers probe with a short budget to tell a
 *  daemon that is not listening from a live one, and reattempts would turn that verdict
 *  into a multi-second stall. A slow orchd is handled by giving the CALL a budget that
 *  matches its work. Absent only when BOTH endpoints proved nothing is listening —
 *  otherwise the daemon is merely unreachable and may be perfectly healthy. */
async function connectDaemon(orchDir: string, timeoutMs: number): Promise<Socket> {
  const paths = endpointPaths(orchDir);
  const unix = await dialEndpoint(paths.socket, timeoutMs);
  if (!stayedSilent(unix)) return unix;
  const loopback = await dialEndpoint(readPortPath(paths.port), timeoutMs);
  if (!stayedSilent(loopback)) return loopback;
  if (unix === "not-listening" && loopback === "not-listening") throw new DaemonAbsentError(orchDir);
  throw new DaemonUnreachableError("connect");
}

function responseError(response: RpcResponse): RpcError {
  const error = response.error;
  if (typeof error === "string") return new RpcError("RPC_ERROR", error);
  return new RpcError(error?.code ?? "RPC_ERROR", error?.message ?? "RPC request failed", error?.data);
}

export function readJsonMessages(socket: Socket, onMessage: (message: RpcResponse) => void): void {
  framedLineReader(socket, (raw) => {
    const line = raw.trim();
    if (!line) return;
    try {
      const parsed: unknown = JSON.parse(line);
      if (isRpcResponse(parsed)) onMessage(parsed);
    } catch {
      // Ignore malformed unsolicited data from the server.
    }
  });
}

function receiveResponse(socket: Socket, id: number, timeoutMs: number): Promise<RpcResponse> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new DaemonUnreachableError("response"));
    }, timeoutMs);
    readJsonMessages(socket, (parsed) => {
      if (parsed.id === id) {
        clearTimeout(timer);
        resolve(parsed);
      }
    });
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
  mkdirSync(orchDir, { recursive: true });
  const paths = endpointPaths(orchDir);
  const subscriptions = new Set<Socket>();
  const sockets = new Set<Socket>();
  const replayBuffer = new ReplayBuffer(orchDir);
  const daemonToken = writeDaemonToken(paths.token);
  let transport: "unix" | "tcp" = "tcp";
  const attachFor = (transport: "unix" | "tcp") => (socket: Socket): void => {
    sockets.add(socket);
    attachConnection(socket, handlers, subscriptions, replayBuffer, orchDir, transport, daemonToken);
    socket.once("close", () => sockets.delete(socket));
  };
  const attachUnix = attachFor("unix");
  const attachTcp = attachFor("tcp");
  const server = createServer(attachUnix);
  let tcpServer: Server | undefined;
  let tcpEndpoint: string | undefined;
  try {
    await listen(server, paths.socket);
    transport = "unix";
    markSocketBound(paths.socket);
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
        markSocketBound(paths.socket);
        try {
          unlinkSync(paths.port);
        } catch {}
        tcpServer = await startTcpServer(attachTcp, options, paths);
        tcpEndpoint = tcpEndpointOf(tcpServer);
        return makeRpcServer(server, tcpServer, sockets, subscriptions, replayBuffer, paths, transport, tcpEndpoint);
      } catch {
        // A live endpoint or an unremovable path still requires TCP fallback.
      }
    }
    try { server.close(); } catch {}
    tcpServer = createServer(attachTcp);
    await listen(tcpServer, { host: "127.0.0.1", port: options.tcpPort ?? 0 });
    const boundPort = boundTcpPort(tcpServer);
    writeFileSync(paths.port, `${boundPort}\n`, { mode: 0o600 });
    transport = "tcp";
    tcpEndpoint = `tcp://127.0.0.1:${boundPort}`;
    return makeRpcServer(tcpServer, undefined, sockets, subscriptions, replayBuffer, paths, transport, tcpEndpoint);
  }
  tcpServer = await startTcpServer(attachTcp, options, paths);
  tcpEndpoint = tcpEndpointOf(tcpServer);
  return makeRpcServer(server, tcpServer, sockets, subscriptions, replayBuffer, paths, transport, tcpEndpoint);
}

async function startTcpServer(
  attach: (socket: Socket) => void,
  options: RpcServerOptions,
  paths: { socket: string; port: string; token: string },
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
  return options.tcpPort ?? (process.platform === "win32" ? 0 : undefined);
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

/**
 * The one hello claim. TASKS/08-identity-registration.md: a session presents a
 * STABLE token the harness itself carries, and orch resolves the id it already
 * minted. `process.ppid` is the shell this `orch` ran under — it differs on every
 * invocation, so claiming it re-mints a fresh agent id per CLI call (finding 1.15).
 * Both the request path and the subscription's inline handshake build the claim
 * HERE so the two can never present different facts for the same session.
 */
export function helloClaim(orchDir: string, label?: string): Record<string, unknown> {
  const token = readFileSync(endpointPaths(orchDir).token, "utf8").trim();
  // The calling harness identifies ITSELF through its adapter's declared env
  // vocabulary; orch names no harness here (Rule 9). An empty ORCH_HARNESS is
  // unset, not a harness named "".
  const session = callerSession();
  const configuredHarness = nonEmpty(process.env.ORCH_HARNESS?.trim());
  const harness = configuredHarness ?? session?.harnessId ?? "cli";
  // Registration carries the plexer fact observed by this session. Herdr is
  // the only versioned integration today; unknown environments simply omit it.
  const callerBackend = allBackends().find((backend) => backend.currentIdentity?.());
  return {
    token,
    pid: session?.pid ?? process.pid,
    sessionToken: session?.sessionId ?? null,
    harness,
    cwd: process.cwd(),
    label,
    plexer: callerBackend?.id,
    plexerVersion: callerBackend?.version?.() ?? undefined,
  };
}

/** Register this process with the daemon and return the identity it issued. Reading the
 *  `0600` token file IS the credential, so there is nothing else to enroll. The session
 *  is this process's parent — the shell or harness that outlives one `orch` invocation. */
export async function rpcHello(orchDir: string, label?: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<HelloResponse> {
  try {
    // Ensure the daemon first: its token exists only for the lifetime of a running
    // daemon, so reading it before this probe turns a fresh store into raw ENOENT.
    await ensureDaemon(orchDir);
    const identity = await rpcCall(orchDir, "hello", helloClaim(orchDir, label), timeoutMs);
    if (!isLiveAgentIdentity(orchDir, identity) || !isHelloResponse(identity)) {
      throw new RpcError("IDENTITY_UNAVAILABLE", "Daemon returned a malformed identity");
    }
    announceUnleasedAgents(orchDir, identity);
    if (identity.registrationWarning) process.stderr.write(`warning: ${identity.registrationWarning}\n`);
    return identity;
  } catch (error: unknown) {
    throw translateDaemonError(orchDir, error);
  }
}

export interface EventSubscription {
  close(): void;
  readonly lastSeq: () => number;
}

/**
 * Subscribe to daemon-pushed events, self-healing across daemon restarts. The
 * socket dying is the disconnect signal: on close or error the subscription
 * redials with bounded exponential backoff — reading `orchd.port` fresh each
 * attempt via {@link connectDaemon}, since the port changes when the daemon
 * comes back on a new instance — and resubscribes on success. It retries
 * forever at the capped interval; only {@link EventSubscription.close} stops the
 * loop, and every timer is `unref`'d so a pending retry never keeps the process
 * alive.
 */
export function subscribeEvents(
  orchDir: string,
  opts: { since?: number },
  onEvent: (event: unknown, seq: number) => void,
  onGap?: (oldestSeq: number) => void,
  hello = false,
): EventSubscription {
  let last = opts.since ?? 0;
  let socket: Socket | undefined;
  let closed = false;
  let connectedBefore = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let backoffMs = RECONNECT_BASE_MS;

  const scheduleReconnect = (): void => {
    if (closed || retryTimer) return;
    const delay = backoffMs;
    backoffMs = Math.min(backoffMs * 2, RECONNECT_CAP_MS);
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      connect();
    }, delay);
    retryTimer.unref?.();
  };

  // A dead socket means the daemon is gone; both error and close route here, but
  // only the first schedules — scheduleReconnect no-ops while a retry is pending.
  const onDisconnect = (): void => {
    socket = undefined;
    scheduleReconnect();
  };

  const connect = (): void => {
    if (closed) return;
    void connectDaemon(orchDir, DEFAULT_TIMEOUT_MS)
      .then((connected) => {
        if (closed) {
          connected.destroy();
          return;
        }
        socket = connected;
        backoffMs = RECONNECT_BASE_MS; // a healthy dial resets the climb
        readJsonMessages(connected, (parsed) => {
          if (parsed.gap === true && typeof parsed.oldestSeq === "number") {
            onGap?.(parsed.oldestSeq);
          } else if (parsed.seq !== undefined && "event" in parsed) {
            last = Math.max(last, parsed.seq);
            onEvent(parsed.event, parsed.seq);
          }
        });
        connected.once("error", onDisconnect);
        connected.once("close", onDisconnect);
        // Re-register bridge sessions on every daemon instance. The token is
        // read fresh because a restart mints a new credential; this handshake
        // shares the same socket as the event subscription.
        if (hello) {
          // The token is read fresh because a restart mints a new credential.
          connected.write(`${JSON.stringify({
            id: nextRequestId++,
            method: "hello",
            params: helloClaim(orchDir),
          })}\n`);
        }
        // The first dial honours the caller's `since` (undefined = live only).
        // Durable sequence numbers survive daemon restarts, so reconnects resume
        // from the last sequence delivered instead of replaying an unrelated window.
        const since = connectedBefore ? last : opts.since;
        connectedBefore = true;
        connected.write(`${JSON.stringify({
          id: nextRequestId++,
          method: "subscribe-events",
          params: { since },
        })}\n`);
      })
      .catch(() => {
        // Daemon absent or the dial failed; keep retrying — it may return.
        scheduleReconnect();
      });
  };

  connect();

  return {
    close: () => {
      closed = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = undefined;
      }
      socket?.destroy();
      socket = undefined;
    },
    lastSeq: () => last,
  };
}
