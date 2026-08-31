import { createConnection, type Socket } from "node:net";
import { existsSync } from "node:fs";
import { readPortPath } from "../../presence/socket-client.ts";
import { launchCredential } from "../../identity/launch.ts";
import { decisionLogger } from "../decision-log.ts";
import type { EventSubscription } from "../../types/daemon.ts";
import { DaemonAbsentError, DaemonUnreachableError, type RpcResponse, DEFAULT_TIMEOUT_MS, endpointPaths, readJsonMessages, responseError } from "./wire.ts";
import { sessionClaim } from "./registration.ts";
import { isRecord } from "../../util.ts";

// Bounds for the self-healing event subscription's reconnect loop. A daemon can
// return at any time (restart, reload, machine wake), so retries never give up;
// they only stop climbing once the delay reaches the cap.
const RECONNECT_BASE_MS = 250;
const RECONNECT_CAP_MS = 5_000;
let nextRequestId = 1;
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
export function nonEmpty(value: string | undefined): string | undefined {
  if (value === "") return undefined;
  return value;
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
  const code = isRecord(error) && typeof error.code === "string" ? error.code : undefined;
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
  identify = false,
): EventSubscription {
  let last = opts.since ?? 0;
  let socket: Socket | undefined;
  let closed = false;
  let connectedBefore = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let backoffMs = RECONNECT_BASE_MS;
  let retryAttempt = 0;

  const scheduleReconnect = (): void => {
    if (closed || retryTimer) return;
    const delay = backoffMs;
    retryAttempt += 1;
    decisionLogger(orchDir).debug("retry.attempt", { attempt: retryAttempt, delay });
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
        retryAttempt = 0;
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
        if (identify) {
          // The token is read fresh because a restart mints a new credential.
          const credential = launchCredential();
          const claim = sessionClaim(orchDir);
          connected.write(`${JSON.stringify({
            id: nextRequestId++,
            method: credential === null ? "register-session" : "claim-identity",
            params: credential === null ? claim : { ...claim, id: credential },
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
