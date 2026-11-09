// The frames a host link carries: one JSON object per line, between orchd on the
// machine you run from and `orch host serve` on the host it reaches over SSH.
import { z } from "zod";
import { HOST_GREETING, HOST_IDENTITY, RPC_PARAMS } from "../daemon/client/protocol.ts";
import { isRecord } from "../util.ts";
import { SIGNAL_OUTCOMES } from "../types/host.ts";
import type { HostGreeting } from "../types/host.ts";

const GREETING = z.object({ greeting: HOST_GREETING }).strict();

/** Requests orchd sends over a link, each with its params and its result. */
export const HOST_PARAMS = {
  ping: z.object({}).strict(),
  /** Whether each of these processes is alive there, answered in the same order. */
  alive: z.object({ processes: z.array(z.object({ pid: z.number().int().positive(), startToken: z.string().nullable() }).strict()) }).strict(),
  /** Carry orchd's RPC for agents there: the host orchd runs on, and its token. */
  relay: z.object({ origin: HOST_IDENTITY, token: z.string().min(1) }).strict(),
  /** End this recorded process instance there with SIGTERM; a different process on a reused pid is left alone. */
  signal: z.object({ pid: z.number().int().positive(), startToken: z.string().nullable() }).strict(),
  /** Start a headless agent there for that orchd: the launch facts a local headless spawn takes. */
  launch: RPC_PARAMS["spawn-headless"].pick({ key: true, name: true, adapter: true, model: true, thinking: true, prompt: true, cwd: true, env: true, preferredModels: true, tools: true, workers: true }).strict(),
} as const;

export const HOST_RESULTS = {
  ping: z.object({ at: z.number() }).strict(),
  alive: z.object({ alive: z.array(z.boolean()) }).strict(),
  /** The directory agents there use as their ORCH_DIR to reach that orchd. */
  relay: z.object({ orchDir: z.string() }).strict(),
  signal: z.object({ outcome: z.enum(SIGNAL_OUTCOMES) }).strict(),
  /** The agent's handle, as recorded, and its process there. */
  launch: z.object({ handle: z.string(), process: z.object({ pid: z.number().int().positive(), startToken: z.string().nullable() }).strict() }).strict(),
} as const;

export type HostMethod = keyof typeof HOST_PARAMS;
export type HostParamsOf<M extends HostMethod> = z.infer<(typeof HOST_PARAMS)[M]>;
export type HostResultOf<M extends HostMethod> = z.infer<(typeof HOST_RESULTS)[M]>;

export function isHostMethod(value: unknown): value is HostMethod {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(HOST_PARAMS, value);
}

const REQUEST = z.object({ id: z.number().int(), method: z.string(), params: z.unknown() }).strict();
const REPLY = z.object({ id: z.number().int(), result: z.unknown() }).strict();
const FAILURE = z.object({ id: z.number().int(), error: z.object({ message: z.string() }).strict() }).strict();
const STREAM_OPEN = z.object({ stream: z.number().int(), open: z.literal(true) }).strict();
const STREAM_LINE = z.object({ stream: z.number().int(), line: z.string() }).strict();
const STREAM_END = z.object({ stream: z.number().int(), end: z.literal(true) }).strict();

/** One line off a link, decoded. Anything else on the line is a broken far side. */
export type HostFrame =
  | { readonly kind: "greeting"; readonly greeting: HostGreeting }
  | { readonly kind: "request"; readonly id: number; readonly method: string; readonly params: unknown }
  | { readonly kind: "reply"; readonly id: number; readonly result: unknown }
  | { readonly kind: "failure"; readonly id: number; readonly message: string }
  /** A client on the far host connected to the relay: stream `stream` is open. */
  | { readonly kind: "stream-open"; readonly stream: number }
  /** One line on a stream, either way. */
  | { readonly kind: "stream-line"; readonly stream: number; readonly line: string }
  /** Either end closed a stream. */
  | { readonly kind: "stream-end"; readonly stream: number };

/** Whether a line is a greeting in a shape this orch does not read: what an orch built from
 *  another commit says first, when the greeting changed between the two. */
export function isUnreadableGreeting(line: string): boolean {
  try {
    const value: unknown = JSON.parse(line);
    return isRecord(value) && "greeting" in value && !GREETING.safeParse(value).success;
  } catch {
    return false;
  }
}

export function parseHostFrame(line: string): HostFrame | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  const greeting = GREETING.safeParse(value);
  if (greeting.success) return { kind: "greeting", greeting: greeting.data.greeting };
  const request = REQUEST.safeParse(value);
  if (request.success) return { kind: "request", id: request.data.id, method: request.data.method, params: request.data.params };
  const reply = REPLY.safeParse(value);
  if (reply.success) return { kind: "reply", id: reply.data.id, result: reply.data.result };
  const failure = FAILURE.safeParse(value);
  if (failure.success) return { kind: "failure", id: failure.data.id, message: failure.data.error.message };
  const streamed = STREAM_LINE.safeParse(value);
  if (streamed.success) return { kind: "stream-line", stream: streamed.data.stream, line: streamed.data.line };
  const open = STREAM_OPEN.safeParse(value);
  if (open.success) return { kind: "stream-open", stream: open.data.stream };
  const end = STREAM_END.safeParse(value);
  if (end.success) return { kind: "stream-end", stream: end.data.stream };
  return null;
}

export function encodeHostFrame(frame: HostFrame): string {
  switch (frame.kind) {
    case "greeting":
      return `${JSON.stringify({ greeting: frame.greeting })}\n`;
    case "request":
      return `${JSON.stringify({ id: frame.id, method: frame.method, params: frame.params })}\n`;
    case "reply":
      return `${JSON.stringify({ id: frame.id, result: frame.result })}\n`;
    case "failure":
      return `${JSON.stringify({ id: frame.id, error: { message: frame.message } })}\n`;
    case "stream-open":
      return `${JSON.stringify({ stream: frame.stream, open: true })}\n`;
    case "stream-line":
      return `${JSON.stringify({ stream: frame.stream, line: frame.line })}\n`;
    case "stream-end":
      return `${JSON.stringify({ stream: frame.stream, end: true })}\n`;
    default: {
      const exhaustive: never = frame;
      throw new Error(`unknown host frame: ${String(exhaustive)}`);
    }
  }
}
