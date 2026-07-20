import { createServerFn } from "@tanstack/react-start";
import { createConnection, type Socket } from "node:net";
import { spawn } from "node:child_process";

import type { Workspace } from "@/lib/fleet";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3716;
const RPC_TIMEOUT_MS = 1_000;

type RpcMessage = {
  id?: number;
  event?: unknown;
  seq?: number;
  result?: unknown;
  error?: { code?: string | number; message?: string } | string;
};

export type DaemonDown = { daemon: "down"; reason?: string };
export type DaemonUp = { daemon: "up" };
export type DaemonStatus = DaemonDown | (DaemonUp & { running: true; startedAt?: string });
export type FleetResult = DaemonDown | { daemon: "up"; workspaces: Workspace[] };

function daemonTarget(): { host: string; port: number } {
  const rawPort = Number(process.env.ORCH_DAEMON_PORT ?? DEFAULT_PORT);
  return {
    host: process.env.ORCH_DAEMON_HOST ?? DEFAULT_HOST,
    port: Number.isInteger(rawPort) && rawPort > 0 ? rawPort : DEFAULT_PORT,
  };
}

function rpcError(message: RpcMessage): Error | undefined {
  if (message.error === undefined) return undefined;
  const error = typeof message.error === "string" ? message.error : message.error.message ?? "RPC request failed";
  return new Error(error);
}

function connectDaemon(timeoutMs = RPC_TIMEOUT_MS): Promise<Socket> {
  const { host, port } = daemonTarget();
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      reject(error);
    };
    const timer = setTimeout(() => fail(new Error("daemon connection timed out")), timeoutMs);
    socket.once("error", fail);
    socket.once("connect", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.removeListener("error", fail);
      resolve(socket);
    });
  });
}

function readLines(socket: Socket, onLine: (message: RpcMessage) => void): void {
  let buffer = "";
  socket.setEncoding("utf8");
  socket.on("data", (chunk: string) => {
    buffer += chunk;
    let end = buffer.indexOf("\n");
    while (end >= 0) {
      const line = buffer.slice(0, end).trim();
      buffer = buffer.slice(end + 1);
      if (line) {
        try {
          const message = JSON.parse(line) as RpcMessage;
          if (message && typeof message === "object") onLine(message);
        } catch {
          // Ignore malformed daemon output.
        }
      }
      end = buffer.indexOf("\n");
    }
  });
}

/** TCP-only RPC boundary. All connection failures stay values for server callers. */
async function daemonRpc<T>(method: string, params?: unknown): Promise<T> {
  const socket = await connectDaemon();
  const id = Date.now() + Math.random();
  try {
    const response = await new Promise<RpcMessage>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("daemon RPC timed out")), RPC_TIMEOUT_MS);
      readLines(socket, (message) => {
        if (message.id !== id) return;
        clearTimeout(timer);
        const error = rpcError(message);
        if (error) reject(error);
        else resolve(message);
      });
      socket.once("error", reject);
      socket.write(`${JSON.stringify({ id, method, params })}\n`);
    });
    return response.result as T;
  } finally {
    socket.destroy();
  }
}

function down(error: unknown): DaemonDown {
  return { daemon: "down", reason: error instanceof Error ? error.message : "daemon unavailable" };
}

export const getDaemonStatus = createServerFn({ method: "GET" }).handler(async (): Promise<DaemonStatus> => {
  try {
    const result = await daemonRpc<Record<string, unknown>>("daemon-status");
    return {
      daemon: "up",
      running: true,
      ...(typeof result?.startedAt === "string" ? { startedAt: result.startedAt } : {}),
    };
  } catch (error) {
    return down(error);
  }
});

interface PresenceRow {
  key: string;
  paneId: string | null;
  name: string | null;
  agent: string | null;
  state: string;
  exited: boolean;
  model: string;
  lastText: string | null;
  cost: number;
  ctxPercent: number | null;
  tokens: unknown;
  workspace?: string | null;
  workspaceName?: string | null;
}

interface PresenceResult {
  rows: PresenceRow[];
}

function fleetFromPresence(result: PresenceResult): Workspace[] {
  const workspaces = new Map<string, Workspace>();
  for (const row of result.rows) {
    const id = row.workspace ?? "local";
    const workspace = workspaces.get(id) ?? {
      id,
      name: row.workspaceName ?? id,
      slug: id,
      agents: [],
    };
    workspace.agents.push({
      key: row.key,
      handle: row.paneId ?? row.key,
      name: row.name ?? row.agent ?? row.key,
      state: row.state,
      ...(row.model ? { model: { id: row.model } } : {}),
      ...(row.lastText ? { lastText: row.lastText } : {}),
      cost: row.cost,
      ...(row.tokens && typeof row.tokens === "object" ? { tokens: row.tokens as Workspace["agents"][number]["tokens"] } : {}),
      ...(row.ctxPercent !== null ? { context: { percent: row.ctxPercent } } : {}),
      alive: !row.exited,
    });
    workspaces.set(id, workspace);
  }
  return [...workspaces.values()];
}

/** Read the merged pane + presence view from orchd. The web server never reads $ORCH_DIR. */
export const getFleet = createServerFn({ method: "GET" }).handler(async (): Promise<FleetResult> => {
  try {
    const result = await daemonRpc<PresenceResult>("presence");
    return { daemon: "up", workspaces: fleetFromPresence(result) };
  } catch (error) {
    return down(error);
  }
});

export const startDaemon = createServerFn({ method: "POST" }).handler((): { ok: boolean } => {
  try {
    const child = spawn("orch", ["daemon", "start"], { detached: true, stdio: "ignore" });
    child.unref();
    return { ok: true };
  } catch {
    return { ok: false };
  }
});

export interface DaemonEventStream {
  stream: ReadableStream<Uint8Array>;
  close: () => void;
}

/** Bridge the daemon's newline-framed subscribe-events stream to an SSE body. */
export function daemonEventStream(since = 0): DaemonEventStream {
  const encoder = new TextEncoder();
  let closed = false;
  let socket: Socket | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let delay = 250;
  let lastSeq = since;
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;

  const send = (value: string) => {
    try { controller?.enqueue(encoder.encode(value)); } catch { close(); }
  };
  const schedule = () => {
    if (closed || retry) return;
    retry = setTimeout(() => { retry = undefined; connect(); }, delay);
    delay = Math.min(delay * 2, 5_000);
  };
  const disconnect = () => { socket = undefined; schedule(); };
  const connect = () => {
    if (closed) return;
    void connectDaemon(5_000).then((connected) => {
      if (closed) return connected.destroy();
      socket = connected;
      delay = 250;
      readLines(connected, (message) => {
        if (message.seq !== undefined && "event" in message) {
          lastSeq = Math.max(lastSeq, message.seq);
          send(`data: ${JSON.stringify(message.event)}\n\n`);
        }
      });
      connected.once("error", disconnect);
      connected.once("close", disconnect);
      connected.write(`${JSON.stringify({ method: "subscribe-events", params: { since: lastSeq } })}\n`);
    }).catch(schedule);
  };
  const stream = new ReadableStream<Uint8Array>({
    start(next) {
      controller = next;
      heartbeat = setInterval(() => send(": heartbeat\\n\\n"), 15_000);
      heartbeat.unref?.();
      connect();
    },
    cancel() { close(); },
  });
  const close = () => {
    closed = true;
    if (retry) clearTimeout(retry);
    if (heartbeat) clearInterval(heartbeat);
    socket?.destroy();
    socket = undefined;
  };
  return { stream, close };
}

/** Handler used by the web route for GET /api/events. */
export function eventsResponse(request: Request): Response {
  const rawSince = Number(new URL(request.url).searchParams.get("since") ?? 0);
  const bridge = daemonEventStream(Number.isInteger(rawSince) && rawSince >= 0 ? rawSince : 0);
  return new Response(bridge.stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
