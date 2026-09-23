// fallow-ignore-file code-duplication -- one case per RPC method is how TypeScript links a method to its params without a cast.
import type { OrchDir } from "../../types/core.ts";
import { z } from "zod";
import { type Socket } from "node:net";
import { liveDaemonRegistration } from "./process.ts";
import { daemonRuntimeFiles } from "./runtime-files.ts";
import type { EndpointPaths } from "../../types/daemon.ts";
import type { NotifyEvent } from "../../types/notify.ts";
import { notifyEventSchema } from "../../notify/event.ts";
import { isBridgeDelivery, type BridgeDelivery } from "../../control/bridge-message.ts";
import {
  RPC_PARAMS,
  type ParamsOf,
  type RpcErrorCode,
  type RpcMethod,
  isRpcErrorCode,
  isRpcMethod,
} from "./protocol.ts";

/** Nothing holds the endpoint: every dial was refused or found no endpoint at all. */
export class DaemonAbsentError extends Error {
  readonly code = "DAEMON_ABSENT";

  constructor(orchDir: OrchDir, lastLogLine: string | null = null) {
    super(`orchd daemon is absent (${orchDir})${lastLogLine === null ? "" : `; last log line: ${lastLogLine}`}`);
    this.name = "DaemonAbsentError";
  }
}

/** A dial or request outran its budget. Says nothing about liveness. */
export class DaemonUnreachableError extends Error {
  readonly code = "DAEMON_UNREACHABLE";

  constructor(stage: "connect" | "response") {
    super(`orchd did not answer in time (${stage}); its liveness is unknown`);
    this.name = "DaemonUnreachableError";
  }
}

export class RpcError extends Error {
  readonly code: RpcErrorCode;
  readonly data: unknown;

  constructor(code: RpcErrorCode, message: string, data?: unknown) {
    super(message);
    this.name = "RpcError";
    this.code = code;
    this.data = data;
  }
}

export type RpcLine =
  | { kind: "reply"; id: number | null; result: unknown }
  | { kind: "error"; id: number | null; error: { code: RpcErrorCode; message: string; data?: unknown } }
  | { kind: "event"; seq?: number; event: NotifyEvent }
  | { kind: "delivery"; delivery: BridgeDelivery }
  | { kind: "gap"; oldestSeq: number };

const replySchema = z.object({ id: z.number().nullable(), result: z.unknown() }).strict();
const errorSchema = z.object({
  id: z.number().nullable(),
  error: z.object({
    code: z.custom<RpcErrorCode>(isRpcErrorCode),
    message: z.string(),
    data: z.unknown().optional(),
  }).strict(),
}).strict();
const eventSchema = z.object({ event: notifyEventSchema, seq: z.number().int().optional() }).strict();
const gapSchema = z.object({ gap: z.literal(true), oldestSeq: z.number().int() }).strict();

export function parseRpcLine(value: unknown): RpcLine | null {
  const reply = replySchema.safeParse(value);
  if (reply.success) return { kind: "reply", id: reply.data.id, result: reply.data.result };
  const error = errorSchema.safeParse(value);
  if (error.success) return { kind: "error", id: error.data.id, error: error.data.error };
  const event = eventSchema.safeParse(value);
  if (event.success) {
    if (event.data.seq === undefined) return { kind: "event", event: event.data.event };
    return { kind: "event", seq: event.data.seq, event: event.data.event };
  }
  if (isRecord(value) && isBridgeDelivery(value.delivery)) return { kind: "delivery", delivery: value.delivery };
  const gap = gapSchema.safeParse(value);
  if (gap.success) return { kind: "gap", oldestSeq: gap.data.oldestSeq };
  return null;
}

export function encodeLine(line: RpcLine): string {
  switch (line.kind) {
    case "reply":
      return `${JSON.stringify({ id: line.id, result: line.result })}\n`;
    case "error":
      return `${JSON.stringify({ id: line.id, error: line.error })}\n`;
    case "event":
      return `${JSON.stringify(line.seq === undefined ? { event: line.event } : { event: line.event, seq: line.seq })}\n`;
    case "delivery":
      return `${JSON.stringify({ delivery: line.delivery })}\n`;
    case "gap":
      return `${JSON.stringify({ gap: true, oldestSeq: line.oldestSeq })}\n`;
    default: {
      const exhaustive: never = line;
      throw new Error(`unknown RPC line kind: ${String(exhaustive)}`);
    }
  }
}

export const DEFAULT_TIMEOUT_MS = 5_000;
export function endpointPaths(orchDir: OrchDir): EndpointPaths {
  const registration = liveDaemonRegistration(orchDir);
  if (registration) return { socket: registration.socket, port: registration.port, token: registration.token };
  const files = daemonRuntimeFiles(orchDir);
  return { socket: files.socket, port: files.port, token: files.token };
}

/** Write one already-encoded line to a live socket. */
export function writeEncodedLine(socket: Socket, encoded: string): void {
  if (!socket.destroyed) socket.write(encoded);
}

export function lineResponse(socket: Socket, line: RpcLine): void {
  writeEncodedLine(socket, encodeLine(line));
}

export function errorResponse(id: number | null, code: RpcErrorCode, message: string): Extract<RpcLine, { kind: "error" }> {
  return { kind: "error", id, error: { code, message } };
}

export function responseError(line: Extract<RpcLine, { kind: "error" }>): RpcError {
  return new RpcError(line.error.code, line.error.message, line.error.data);
}

export type RpcRequest = { [M in RpcMethod]: { id: number | null; method: M; params: ParamsOf<M> } }[RpcMethod];

export function encodeRequest<M extends RpcMethod>(id: number, method: M, params: ParamsOf<M>): string {
  return `${JSON.stringify({ id, method, params })}\n`;
}

export function parseRequest(line: string): RpcRequest | Extract<RpcLine, { kind: "error" }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return errorResponse(null, "INVALID_REQUEST", "Malformed JSON request");
  }
  if (!isRecord(parsed)) return errorResponse(null, "INVALID_REQUEST", "Request must be a JSON object");
  const id = parsed.id;
  if (id !== undefined && id !== null && typeof id !== "number") {
    return errorResponse(null, "INVALID_REQUEST", "Request id must be a number or null");
  }
  if (typeof parsed.method !== "string") {
    return errorResponse(id ?? null, "INVALID_REQUEST", "Request method must be a non-empty string");
  }
  const requestId = id ?? null;
  if (!isRpcMethod(parsed.method)) return errorResponse(requestId, "METHOD_NOT_FOUND", `Unknown method: ${parsed.method}`);
  return parseTypedRequest(parsed.method, requestId, parsed.params);
}

function parseTypedRequest(method: RpcMethod, id: number | null, value: unknown): RpcRequest | Extract<RpcLine, { kind: "error" }> {
  switch (method) {
    case "daemon-status": return parseOne(method, RPC_PARAMS[method], id, value);
    case "subscribe-events": return parseOne(method, RPC_PARAMS[method], id, value);
    case "environment-labels": return parseOne(method, RPC_PARAMS[method], id, value);
    case "peer-view": return parseOne(method, RPC_PARAMS[method], id, value);
    case "notify": return parseOne(method, RPC_PARAMS[method], id, value);
    case "status": return parseOne(method, RPC_PARAMS[method], id, value);
    case "attach": return parseOne(method, RPC_PARAMS[method], id, value);
    case "dispatch": return parseOne(method, RPC_PARAMS[method], id, value);
    case "steer": return parseOne(method, RPC_PARAMS[method], id, value);
    case "message": return parseOne(method, RPC_PARAMS[method], id, value);
    case "answer": return parseOne(method, RPC_PARAMS[method], id, value);
    case "set-model": return parseOne(method, RPC_PARAMS[method], id, value);
    case "lifecycle": return parseOne(method, RPC_PARAMS[method], id, value);
    case "spawn-headless": return parseOne(method, RPC_PARAMS[method], id, value);
    case "agent-closed": return parseOne(method, RPC_PARAMS[method], id, value);
    case "register-agent": return parseOne(method, RPC_PARAMS[method], id, value);
    case "detach": return parseOne(method, RPC_PARAMS[method], id, value);
    case "adopt": return parseOne(method, RPC_PARAMS[method], id, value);
    case "rename": return parseOne(method, RPC_PARAMS[method], id, value);
    case "reap": return parseOne(method, RPC_PARAMS[method], id, value);
    case "reap-candidates": return parseOne(method, RPC_PARAMS[method], id, value);
    case "reclaim": return parseOne(method, RPC_PARAMS[method], id, value);
    case "set-handle": return parseOne(method, RPC_PARAMS[method], id, value);
    case "spaces": return parseOne(method, RPC_PARAMS[method], id, value);
    case "space": return parseOne(method, RPC_PARAMS[method], id, value);
    case "space-create": return parseOne(method, RPC_PARAMS[method], id, value);
    case "space-rename": return parseOne(method, RPC_PARAMS[method], id, value);
    case "space-delete": return parseOne(method, RPC_PARAMS[method], id, value);
    case "home": return parseOne(method, RPC_PARAMS[method], id, value);
    case "record-home": return parseOne(method, RPC_PARAMS[method], id, value);
    case "clear-home": return parseOne(method, RPC_PARAMS[method], id, value);
    case "grants": return parseOne(method, RPC_PARAMS[method], id, value);
    case "grant": return parseOne(method, RPC_PARAMS[method], id, value);
    case "admit-home": return parseOne(method, RPC_PARAMS[method], id, value);
    case "resolve-agent": return parseOne(method, RPC_PARAMS[method], id, value);
    case "queue-list": return parseOne(method, RPC_PARAMS[method], id, value);
    case "queue-cancel": return parseOne(method, RPC_PARAMS[method], id, value);
    case "queue-edit": return parseOne(method, RPC_PARAMS[method], id, value);
    case "queue-take-on": return parseOne(method, RPC_PARAMS[method], id, value);
    case "queue-reap": return parseOne(method, RPC_PARAMS[method], id, value);
    case "queue-intake": return parseOne(method, RPC_PARAMS[method], id, value);
    case "clean": return parseOne(method, RPC_PARAMS[method], id, value);
    case "fleet": return parseOne(method, RPC_PARAMS[method], id, value);
    case "capacity": return parseOne(method, RPC_PARAMS[method], id, value);
    case "runs": return parseOne(method, RPC_PARAMS[method], id, value);
    case "run": return parseOne(method, RPC_PARAMS[method], id, value);
    case "agent-status": return parseOne(method, RPC_PARAMS[method], id, value);
    case "process-live": return parseOne(method, RPC_PARAMS[method], id, value);
    case "resolve-target": return parseOne(method, RPC_PARAMS[method], id, value);
    case "self": return parseOne(method, RPC_PARAMS[method], id, value);
    case "resolve-lifecycle": return parseOne(method, RPC_PARAMS[method], id, value);
    case "close-targets": return parseOne(method, RPC_PARAMS[method], id, value);
    case "owned-agents": return parseOne(method, RPC_PARAMS[method], id, value);
    case "question": return parseOne(method, RPC_PARAMS[method], id, value);
    case "questions": return parseOne(method, RPC_PARAMS[method], id, value);
    case "ack": return parseOne(method, RPC_PARAMS[method], id, value);
    case "report-status": return parseOne(method, RPC_PARAMS[method], id, value);
    case "report-result": return parseOne(method, RPC_PARAMS[method], id, value);
    case "command-lock": return parseOne(method, RPC_PARAMS[method], id, value);
    case "command-unlock": return parseOne(method, RPC_PARAMS[method], id, value);
    case "enqueue": return parseOne(method, RPC_PARAMS[method], id, value);
    case "control-outcome": return parseOne(method, RPC_PARAMS[method], id, value);
    case "reload": return parseOne(method, RPC_PARAMS[method], id, value);
    case "register-session": return parseOne(method, RPC_PARAMS[method], id, value);
    case "claim-identity": return parseOne(method, RPC_PARAMS[method], id, value);
    default: {
      const exhaustive: never = method;
      throw new Error(`unknown RPC method: ${String(exhaustive)}`);
    }
  }
}

interface RpcRequestFor<M extends RpcMethod> { id: number | null; method: M; params: ParamsOf<M> }

function parseOne<M extends RpcMethod>(method: M, schema: z.ZodType<ParamsOf<M>>, id: number | null, value: unknown): RpcRequestFor<M> | Extract<RpcLine, { kind: "error" }> {
  const params = schema.safeParse(value);
  if (!params.success) return errorResponse(id, "INVALID_PARAMS", params.error.message);
  return makeRequest(method, id, params.data);
}

function makeRequest<M extends RpcMethod>(method: M, id: number | null, params: ParamsOf<M>): RpcRequestFor<M> {
  return { id, method, params };
}

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

export function readJsonMessages(socket: Socket, onMessage: (line: RpcLine) => void): void {
  framedLineReader(socket, (raw) => {
    const line = raw.trim();
    if (!line) return;
    try {
      const parsed: unknown = JSON.parse(line);
      const message = parseRpcLine(parsed);
      if (message !== null) onMessage(message);
    } catch {
      // Ignore malformed unsolicited data from the server.
    }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
