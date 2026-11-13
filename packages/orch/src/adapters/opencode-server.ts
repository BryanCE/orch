// opencode's own server, one per orchd, shared by every opencode agent: each agent is one session
// on it. opencode's wire format lives in this module and in ./opencode-session.ts, nowhere else.
//
// Modelled on t3code's packages/provider-opencode/src/server (acp/findings/t3code-bindings.md):
// OpenCodeServerOwner lends one server to every borrower, closes it once the last one has been
// gone for an idle period, and starts a fresh one on the next borrow after it exits; one event
// stream per server is routed to sessions by session id, and a stream that falls silent is
// reconnected and its sessions caught up. Unlike t3code, orchd needs no ledger to reap a server
// left behind: it runs `opencode serve --stdio`, which ends when its stdin closes, so the server
// never outlives orchd. Checked against opencode 2.2.7's own /openapi.json.
import { randomBytes } from "node:crypto";
import { definedEnv, isRecord, sleep, textValue } from "../util.ts";
import type { DriverIdentity, SessionOpenContext } from "../types/held-session.ts";
import type { JsonRecord, Logger } from "../types/core.ts";
import type { PipesProcess } from "../types/pipes.ts";
import type { OrchSettings } from "../types/settings.ts";

/** `opencode serve` in stdio mode: it prints `{"url": ...}` on one line once it listens, on a
 *  loopback port the OS picks, and exits when its stdin closes. */
const SERVE_ARGV = ["opencode", "serve", "--stdio", "--hostname=127.0.0.1", "--port=0"] as const;
/** opencode's HTTP Basic user is fixed. */
const BASIC_USER = "opencode";
/** opencode 2 reads its password from this variable and drops it from what its tools see. */
export const PASSWORD_ENV = "OPENCODE_PASSWORD";
/** opencode 1's name for the password; an inherited one must not reach the server. */
const LEGACY_PASSWORD_ENV = "OPENCODE_SERVER_PASSWORD";

/** One event of the server's stream. */
export interface ServerEvent {
  readonly type: string;
  readonly data: JsonRecord;
}

/** Follows the server's event stream. */
export interface ServerListener {
  event(event: ServerEvent): void;
  /** The stream came back after a gap: events in the gap are lost, so read the state again. */
  resync(): void;
  /** The server is gone. */
  lost(error: Error): void;
}

/** A running opencode server. */
export interface OpencodeServer {
  readonly url: string;
  readonly pid: number;
  /** The variables a client of this server needs: its password. */
  readonly clientEnv: Readonly<Record<string, string>>;
  /** Settles once the server process is gone. */
  readonly exited: Promise<void>;
  onStderr(listener: (text: string) => void): void;
  /** Call the server and answer its JSON body; a status other than 2xx throws with the body. */
  call(method: string, path: string, body?: unknown): Promise<unknown>;
  /** Follow the event stream until the returned function is called. */
  listen(listener: ServerListener): () => void;
}

/** A borrowed server, and the one call that hands it back. */
export interface BorrowedServer {
  readonly server: OpencodeServer;
  /** Hand the server back; a second call does nothing. */
  readonly release: () => void;
}

/** The record under `key`, when `value` is a record holding one there. */
export function recordAt(value: unknown, key: string): JsonRecord | undefined {
  if (!isRecord(value)) return undefined;
  const inner = value[key];
  return isRecord(inner) ? inner : undefined;
}

/** The `data` record of a response; a response without one throws. */
export function dataOf(response: unknown, what: string): JsonRecord {
  const data = recordAt(response, "data");
  if (data === undefined) throw new Error(`opencode answered ${what} without data`);
  return data;
}

/** Read the server's stdout until it says where it listens; then keep draining it, so the server
 *  never blocks on a full pipe. Rejects when the process exits or the wait runs out. */
async function awaitUrl(child: PipesProcess, timeoutMs: number): Promise<string> {
  const reader = child.output.getReader();
  const decoder = new TextDecoder();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const read = (async (): Promise<string> => {
    let buffered = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) throw new Error("opencode serve closed its output before it listened");
      buffered += decoder.decode(value, { stream: true });
      for (let newline = buffered.indexOf("\n"); newline >= 0; newline = buffered.indexOf("\n")) {
        const line = buffered.slice(0, newline).trim();
        buffered = buffered.slice(newline + 1);
        try {
          const announced: unknown = JSON.parse(line);
          const url = isRecord(announced) ? textValue(announced.url) : undefined;
          if (url !== undefined) return url;
        } catch {
          // A line that is not the announcement carries nothing orch reads.
        }
      }
    }
  })();
  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { reject(new Error(`opencode serve did not say it is listening within ${timeoutMs} ms`)); }, timeoutMs);
  });
  const exited = child.exited.then((exit): never => {
    throw new Error(`opencode serve exited before it listened: code ${String(exit.code)}, signal ${String(exit.signal)}`);
  });
  // Whichever loses the race still settles later; none of them may surface as unhandled.
  for (const pending of [read, timedOut, exited]) pending.catch(() => undefined);
  try {
    return await Promise.race([read, timedOut, exited]);
  } finally {
    clearTimeout(timer);
    void (async () => {
      try {
        for (;;) if ((await reader.read()).done) return;
      } catch {
        // The process ended; there is nothing left to drain.
      }
    })();
  }
}

/** Each event the stream carries, until the stream ends or `signal` aborts it. `onActivity` runs
 *  on every chunk, the server's heartbeat comments included. */
async function* eventStream(url: string, authorization: string, signal: AbortSignal, onActivity: () => void): AsyncGenerator<ServerEvent> {
  const response = await fetch(`${url}/api/event`, { headers: { authorization, accept: "text/event-stream" }, signal });
  if (!response.ok || response.body === null) throw new Error(`opencode GET /api/event answered ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  for (;;) {
    // fetch types its body loosely; a chunk is bytes or it is not read.
    const chunk: { readonly done: boolean; readonly value?: unknown } = await reader.read();
    if (chunk.done) return;
    onActivity();
    if (!(chunk.value instanceof Uint8Array)) continue;
    buffered += decoder.decode(chunk.value, { stream: true });
    for (let newline = buffered.indexOf("\n"); newline >= 0; newline = buffered.indexOf("\n")) {
      const line = buffered.slice(0, newline).trimEnd();
      buffered = buffered.slice(newline + 1);
      if (!line.startsWith("data:")) continue;
      try {
        const event: unknown = JSON.parse(line.slice("data:".length).trim());
        const data = recordAt(event, "data");
        if (isRecord(event) && typeof event.type === "string" && data !== undefined) yield { type: event.type, data };
      } catch {
        // A frame that is not JSON carries nothing orch reads.
      }
    }
  }
}

/** One started server process and its stream. */
class RunningServer implements OpencodeServer {
  readonly exited: Promise<void>;
  readonly clientEnv: Readonly<Record<string, string>>;
  private readonly authorization: string;
  private readonly listeners = new Set<ServerListener>();
  private closed = false;
  private stream: AbortController | null = null;

  constructor(private readonly child: PipesProcess, readonly url: string, password: string, private readonly logger: Logger) {
    this.clientEnv = { [PASSWORD_ENV]: password };
    this.authorization = `Basic ${Buffer.from(`${BASIC_USER}:${password}`, "utf8").toString("base64")}`;
    this.exited = child.exited.then(() => {
      this.closed = true;
      this.stream?.abort();
      const lost = new Error("the opencode server exited");
      for (const listener of [...this.listeners]) listener.lost(lost);
      this.listeners.clear();
    });
  }

  get pid(): number {
    return this.child.pid;
  }

  onStderr(listener: (text: string) => void): void {
    this.child.onStderr(listener);
  }

  async call(method: string, path: string, body?: unknown): Promise<unknown> {
    const response = await fetch(`${this.url}${path}`, {
      method,
      headers: { authorization: this.authorization, ...(body === undefined ? {} : { "content-type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`opencode ${method} ${path} answered ${response.status}: ${text.slice(0, 300)}`);
    if (text.length === 0) return undefined;
    const parsed: unknown = JSON.parse(text);
    return parsed;
  }

  listen(listener: ServerListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** Follow the stream for as long as the server runs. Answers once the first stream is open, so
   *  no session call is made before orchd hears its events. */
  follow(settings: OrchSettings["servers"]): Promise<void> {
    let connected: () => void = () => undefined;
    const first = new Promise<void>((resolve) => { connected = resolve; });
    void (async () => {
      let gap = false;
      while (!this.closed) {
        const controller = new AbortController();
        this.stream = controller;
        let silence: ReturnType<typeof setTimeout> | undefined;
        const heard = (): void => {
          clearTimeout(silence);
          silence = setTimeout(() => { controller.abort(); }, settings.silence_ms);
        };
        try {
          heard();
          for await (const event of eventStream(this.url, this.authorization, controller.signal, heard)) {
            connected();
            if (gap) {
              gap = false;
              for (const listener of [...this.listeners]) listener.resync();
            }
            for (const listener of [...this.listeners]) listener.event(event);
          }
        } catch (error: unknown) {
          if (!this.closed) this.logger.warn("opencode.stream-lost", { url: this.url, message: error instanceof Error ? error.message : String(error) });
        } finally {
          clearTimeout(silence);
        }
        if (this.closed) return;
        gap = true;
        await sleep(settings.reconnect_ms);
      }
    })();
    return first;
  }

  close(): void {
    this.closed = true;
    this.stream?.abort();
    this.child.kill();
  }
}

/**
 * Lends one opencode server to every borrower. The first borrow starts it; the last release
 * starts the idle wait, after which it is closed; a borrow after it exited starts a fresh one.
 * The password is minted once per owner, so a terminal program attached to one server reaches the
 * next with the credential it started with.
 */
export class OpencodeServerOwner {
  private readonly password = randomBytes(32).toString("base64url");
  private current: Promise<RunningServer> | null = null;
  /** Borrows held on each server, counted per server: a borrow of a server that exited never
   *  keeps the next one from closing. */
  private readonly borrowers = new Map<Promise<RunningServer>, number>();
  private idle: ReturnType<typeof setTimeout> | undefined;

  /** The variables a client of any server this owner starts needs: its password. */
  get clientEnv(): Readonly<Record<string, string>> {
    return { [PASSWORD_ENV]: this.password };
  }

  /** Borrow the running server, starting it when none runs. */
  async borrow(context: SessionOpenContext): Promise<BorrowedServer> {
    clearTimeout(this.idle);
    const lent = this.running(context);
    this.borrowers.set(lent, (this.borrowers.get(lent) ?? 0) + 1);
    let released = false;
    const release = (): void => {
      if (released) return;
      released = true;
      this.release(lent, context.settings);
    };
    try {
      return { server: await lent, release };
    } catch (error: unknown) {
      release();
      throw error;
    }
  }

  private running(context: SessionOpenContext): Promise<RunningServer> {
    const current = this.current;
    if (current !== null) return current;
    const started = this.start(context);
    this.current = started;
    const forget = (): void => {
      if (this.current === started) this.current = null;
      this.borrowers.delete(started);
    };
    started.then((server) => { void server.exited.then(forget); }, forget);
    return started;
  }

  private async start(context: SessionOpenContext): Promise<RunningServer> {
    const { settings, logger, pipes } = context;
    const { [LEGACY_PASSWORD_ENV]: _inherited, ...inherited } = process.env;
    const child = pipes.spawn({ argv: SERVE_ARGV, cwd: process.cwd(), env: definedEnv({ ...inherited, [PASSWORD_ENV]: this.password }) });
    child.onStderr((text) => { logger.warn("opencode.stderr", { text }); });
    try {
      const url = await awaitUrl(child, settings.timeouts.server_ready_ms);
      const server = new RunningServer(child, url, this.password, logger);
      await server.follow(settings.servers);
      logger.info("opencode.server-started", { url, pid: child.pid });
      return server;
    } catch (error: unknown) {
      child.kill();
      throw error;
    }
  }

  private release(lent: Promise<RunningServer>, settings: OrchSettings): void {
    const left = (this.borrowers.get(lent) ?? 0) - 1;
    if (!this.borrowers.has(lent)) return;
    this.borrowers.set(lent, Math.max(0, left));
    if (left > 0 || this.current !== lent) return;
    clearTimeout(this.idle);
    this.idle = setTimeout(() => {
      if ((this.borrowers.get(lent) ?? 0) > 0 || this.current !== lent) return;
      void lent.then((server) => { server.close(); }, () => undefined);
    }, settings.servers.idle_ms);
    this.idle.unref?.();
  }

  /** Close the server now, whoever borrows it. */
  shutdown(): void {
    clearTimeout(this.idle);
    void this.current?.then((server) => { server.close(); }, () => undefined);
  }
}

/** Ask the owner's server who it is: doctor's check of opencode's server. The server is borrowed
 *  and handed back like any agent's, so a check never ends a server agents run on. */
export async function serverIdentity(owner: OpencodeServerOwner, context: SessionOpenContext): Promise<DriverIdentity> {
  const { server, release } = await owner.borrow(context);
  try {
    const info = await server.call("GET", "/api/info");
    const version = isRecord(info) ? textValue(info.version) : undefined;
    if (version === undefined) throw new Error("opencode answered /api/info without a version");
    return { name: "opencode", version };
  } finally {
    release();
  }
}
