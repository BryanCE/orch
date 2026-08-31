import { type Socket } from "node:net";
import { liveDaemonRegistration } from "../lifecycle.ts";
import { daemonRuntimeFiles } from "../runtime-files.ts";
import { isRecord } from "../../util.ts";
import { appendEvent, oldestEventSeq, selectEventsSince } from "../../store/event-rows.ts";
import type { BufferedEvent, EndpointPaths, ReplayResult } from "../../types/daemon.ts";

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

export interface RpcResponse {
  id?: unknown;
  event?: unknown;
  seq?: number;
  gap?: boolean;
  oldestSeq?: number;
  result?: unknown;
  error?: { code?: string | number; message?: string; data?: unknown } | string;
}

/**
 * Which members a line actually carries. `hasOwnProperty`, not `in` and not an
 * `undefined` check: an explicitly-null `id` or an event whose payload is
 * `undefined` are both present-but-malformed, and the two must stay tellable
 * apart from a member that was never sent.
 */
function presentMembers(value: Record<string, unknown>): {
  id: boolean; result: boolean; error: boolean; event: boolean; gap: boolean;
} {
  const present = (name: string): boolean => Object.prototype.hasOwnProperty.call(value, name);
  return { id: present("id"), result: present("result"), error: present("error"), event: present("event"), gap: present("gap") };
}

type PresentMembers = ReturnType<typeof presentMembers>;

/** The `error` member of a reply: bare text, or `{ code, message, data? }`. */
function isRpcErrorField(error: unknown): boolean {
  if (typeof error === "string") return true;
  if (!isRecord(error)) return false;
  return (typeof error.code === "string" || typeof error.code === "number") && typeof error.message === "string";
}

/** A request id is absent, null (a notification), or a number. Never anything else. */
function wellFormedId(value: Record<string, unknown>, has: PresentMembers): boolean {
  return !has.id || value.id === null || typeof value.id === "number";
}

/** `seq` and `oldestSeq` may appear on any line, but never with the wrong type. */
function wellFormedSequenceFields(value: Record<string, unknown>): boolean {
  if ("seq" in value && (typeof value.seq !== "number" || !Number.isSafeInteger(value.seq))) return false;
  return !("oldestSeq" in value) || typeof value.oldestSeq === "number";
}

/** A gap notice carries `gap: true` AND the oldest sequence still replayable. */
function wellFormedGap(value: Record<string, unknown>, has: PresentMembers): boolean {
  return !has.gap || (value.gap === true && typeof value.oldestSeq === "number");
}

/** Every payload member that IS present is well formed, and a reply carries
 *  exactly one of result/error — never both, never neither. */
function wellFormedPayload(value: Record<string, unknown>, has: PresentMembers): boolean {
  if (has.result && has.error) return false;
  if (has.id && !has.result && !has.error) return false;
  if (has.event && value.event === undefined) return false;
  if (!wellFormedGap(value, has)) return false;
  return !has.error || isRpcErrorField(value.error);
}

export function isRpcResponse(value: unknown): value is RpcResponse {
  if (!isRecord(value)) return false;
  const has = presentMembers(value);
  // A line is one of three things: a reply (id), an event push, or a gap notice.
  if (!has.id && !has.event && !has.gap) return false;
  if (!wellFormedId(value, has)) return false;
  if (!wellFormedSequenceFields(value)) return false;
  if (!wellFormedPayload(value, has)) return false;
  return has.event || has.gap || has.result || has.error;
}
export const DEFAULT_TIMEOUT_MS = 5_000;
export function endpointPaths(orchDir: string): EndpointPaths {
  const registration = liveDaemonRegistration(orchDir);
  if (registration) return { socket: registration.socket, port: registration.port, token: registration.token };
  const files = daemonRuntimeFiles(orchDir);
  return { socket: files.socket, port: files.port, token: files.token };
}

export function lineResponse(socket: Socket, response: RpcResponse): void {
  if (!socket.destroyed) socket.write(`${JSON.stringify(response)}\n`);
}

export function errorResponse(id: unknown, code: string, message: string): RpcResponse {
  return { id, error: { code, message } };
}

export function parseRequest(line: string): { id: unknown; method: string; params: unknown } | RpcResponse {
  let request: unknown;
  try {
    request = JSON.parse(line);
  } catch {
    return errorResponse(null, "INVALID_REQUEST", "Malformed JSON request");
  }
  if (!isRecord(request)) {
    return errorResponse(null, "INVALID_REQUEST", "Request must be a JSON object");
  }
  const value = request;
  if (typeof value.method !== "string" || value.method.length === 0) {
    return errorResponse(value.id ?? null, "INVALID_REQUEST", "Request method must be a non-empty string");
  }
  return { id: value.id ?? null, method: value.method, params: value.params };
}
/**
 * Drive `onLine` for each newline-framed line arriving on `socket`, buffering
 * partial lines across chunks. This owns only the framing loop — encoding,
 * split-on-newline, and cross-chunk buffering. Callers keep their own error,
 * close, and per-line parse semantics by attaching those listeners themselves
 * and doing any trim/parse inside `onLine`.
 */
export function framedLineReader(socket: Socket, onLine: (line: string) => void): void {
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
export function responseError(response: RpcResponse): RpcError {
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
