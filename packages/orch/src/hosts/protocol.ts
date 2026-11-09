// The frames a host link carries: one JSON object per line, between orchd on the
// machine you run from and `orch host serve` on the host it reaches over SSH.
import { z } from "zod";
import { HOST_GREETING } from "../daemon/client/protocol.ts";
import { isRecord } from "../util.ts";
import type { HostGreeting } from "../types/host.ts";

const GREETING = z.object({ greeting: HOST_GREETING }).strict();

/** Requests orchd sends over a link, each with its params and its result. */
export const HOST_PARAMS = {
  ping: z.object({}).strict(),
  alive: z.object({ pid: z.number().int().positive(), startToken: z.string().nullable() }).strict(),
} as const;

export const HOST_RESULTS = {
  ping: z.object({ at: z.number() }).strict(),
  alive: z.object({ alive: z.boolean() }).strict(),
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

/** One line off a link, decoded. Anything else on the line is a broken far side. */
export type HostFrame =
  | { readonly kind: "greeting"; readonly greeting: HostGreeting }
  | { readonly kind: "request"; readonly id: number; readonly method: string; readonly params: unknown }
  | { readonly kind: "reply"; readonly id: number; readonly result: unknown }
  | { readonly kind: "failure"; readonly id: number; readonly message: string };

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
    default: {
      const exhaustive: never = frame;
      throw new Error(`unknown host frame: ${String(exhaustive)}`);
    }
  }
}
