import { afterEach, describe, expect, test } from "bun:test";
import { createConnection } from "node:net";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireDaemonLock } from "../src/daemon/lifecycle";
import { daemonRuntimeFiles } from "../src/daemon/runtime-files";
import {
  DaemonAbsentError,
  DaemonUnreachableError,
  RpcError,
  rpcCall,
  rpcHello,
  rpcSubscribe,
  subscribeEvents,
  ReplayBuffer,
  startRpcServer,
  type RpcServer,
} from "../src/daemon/rpc";
import { isSessionIdentity } from "../src/store/identity-rows.ts";
import { appendEvent, deleteEventsBefore } from "../src/store/event-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
const servers: RpcServer[] = [];

function tempOrchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-rpc-"));
  dirs.push(dir);
  return dir;
}

/** A handler that never responds — the shape a starved daemon presents to the CLI. */
function neverAnswers(): Promise<never> {
  return new Promise(() => undefined);
}

/** The rejection from a call that must fail, awaited so the assertion runs inside
 *  the test — an unawaited `expect(p).rejects` lets afterEach tear the server down
 *  while the call is still dialing, turning every verdict into daemon-absent. */
function rejectionOf(action: Promise<unknown>): Promise<unknown> {
  return action.then(() => undefined, (error: unknown) => error);
}

async function waitForLine(lines: string[], index: number): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (lines.length <= index && Date.now() < deadline) await Bun.sleep(5);
  if (lines.length <= index) throw new Error("timed out waiting for RPC line");
}

async function tcpHello(server: RpcServer, params?: unknown): Promise<Record<string, unknown>> {
  const endpoint = server.tcpEndpoint;
  if (!endpoint) throw new Error("TCP endpoint was not bound");
  const port = Number(endpoint.slice(endpoint.lastIndexOf(":") + 1));
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    let data = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      data += chunk;
      const newline = data.indexOf("\n");
      if (newline < 0) return;
      socket.destroy();
      resolve(JSON.parse(data.slice(0, newline)) as Record<string, unknown>);
    });
    socket.once("error", reject);
    socket.once("connect", () => socket.write(`${JSON.stringify({ id: 1, method: "hello", params })}\n`));
  });
}

async function start(dir: string): Promise<RpcServer> {
  const server = await startRpcServer(dir, {
    echo: (params) => params,
    hang: neverAnswers,
    "subscribe-events": (_params, emit) => {
      setTimeout(() => emit({ kind: "pushed", value: 1 }), 5);
      return { subscribed: true };
    },
  });
  servers.push(server);
  return server;
}

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

describe("daemon RPC", () => {
  test("round-trips a call over the real unix socket", async () => {
    const dir = tempOrchDir();
    await start(dir);
    expect(await rpcCall(dir, "echo", { ok: true })).toEqual({ ok: true });
  });

  test("issues one session identity to sequential invocations from one session", async () => {
    const dir = tempOrchDir();
    await start(dir);
    const first = await rpcHello(dir);
    const second = await rpcHello(dir);
    expect(second).toEqual(first);
    // An issued id is opaque; a plexer coordinate would carry `~` separators.
    expect(first.id).not.toContain("~");
  });

  test("a TCP hello with the daemon token gets an identity", async () => {
    const dir = tempOrchDir();
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    const token = readFileSync(daemonRuntimeFiles(dir).token, "utf8").trim();
    const reply = await tcpHello(server, { token, pid: process.pid, startedAt: "2024-01-01T00:00:00.000Z", label: "web client" });
    expect(reply.id).toBe(1);
    if (!isSessionIdentity(reply.result)) throw new Error(`TCP hello returned a non-identity: ${JSON.stringify(reply)}`);
    expect(reply.result.label).toBe("web client");
  });

  test("refuses a hello that reports no session pid", async () => {
    const dir = tempOrchDir();
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    const token = readFileSync(daemonRuntimeFiles(dir).token, "utf8").trim();
    expect(await tcpHello(server, { token })).toMatchObject({ id: 1, error: { code: "IDENTITY_UNAVAILABLE" } });
  });

  test("refuses a hello without a process start time", async () => {
    const dir = tempOrchDir();
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    const token = readFileSync(daemonRuntimeFiles(dir).token, "utf8").trim();
    expect(await tcpHello(server, { token, pid: process.pid })).toMatchObject({ id: 1, error: { code: "IDENTITY_UNAVAILABLE" } });
  });

  test("issues a new identity when a pid is recycled", async () => {
    const dir = tempOrchDir();
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    const token = readFileSync(daemonRuntimeFiles(dir).token, "utf8").trim();
    const first = await tcpHello(server, { token, pid: 424242, startedAt: "2024-01-01T00:00:00.000Z", label: "old session" });
    const second = await tcpHello(server, { token, pid: 424242, startedAt: "2025-01-01T00:00:00.000Z", label: "new session" });
    if (!isSessionIdentity(first.result) || !isSessionIdentity(second.result)) throw new Error("hello returned a non-identity");
    expect(second.result.id).not.toBe(first.result.id);
    expect(second.result.label).toBe("new session");
  });

  test("refuses a TCP hello without a token", async () => {
    const dir = tempOrchDir();
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    expect(await tcpHello(server)).toMatchObject({ id: 1, error: { code: "IDENTITY_REQUIRED" } });
  });

  test("refuses a TCP hello with a wrong token", async () => {
    const dir = tempOrchDir();
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    expect(await tcpHello(server, { token: "wrong-token" })).toMatchObject({ id: 1, error: { code: "IDENTITY_REQUIRED" } });
  });

  test("writes the daemon token with owner-only permissions", async () => {
    const dir = tempOrchDir();
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    const tokenFile = daemonRuntimeFiles(dir).token;
    expect(readFileSync(tokenFile, "utf8").trim()).toMatch(/^[0-9a-f]{64}$/);
    // Windows carries no POSIX mode bits: the token inherits the ACL of the
    // per-user directory it lives in, which is the same-uid proof the mode gives here.
    if (process.platform !== "win32") expect(statSync(tokenFile).mode & 0o777).toBe(0o600);
  });

  test("returns an error for an unknown method", async () => {
    const dir = tempOrchDir();
    await start(dir);
    const failure = await rejectionOf(rpcCall(dir, "missing"));
    expect(failure).toBeInstanceOf(RpcError);
    expect((failure as Error).message).toContain("Unknown method");
  });

  test("reports malformed lines and keeps the connection alive", async () => {
    const dir = tempOrchDir();
    const server = await start(dir);
    const socket = await new Promise<import("node:net").Socket>((resolve, reject) => {
      const connection = createConnection(server.socketPath);
      connection.once("connect", () => resolve(connection));
      connection.once("error", reject);
    });
    socket.setEncoding("utf8");
    const lines: string[] = [];
    socket.on("data", (chunk: string) => lines.push(...chunk.trim().split("\n")));
    socket.write("not json\n");
    await waitForLine(lines, 0);
    const malformed: unknown = JSON.parse(lines[0]!);
    expect(malformed).toMatchObject({ error: { code: "INVALID_REQUEST" } });
    socket.write('{"id":7,"method":"echo","params":"still alive"}\n');
    await waitForLine(lines, 1);
    expect(JSON.parse(lines[1]!)).toMatchObject({ id: 7, result: "still alive" });
    socket.destroy();
  });

  test("delivers pushed subscription events", async () => {
    const dir = tempOrchDir();
    const server = await start(dir);
    const event = new Promise((resolve) => {
      void rpcSubscribe(dir, "subscribe-events", resolve);
    });
    expect(await event).toEqual({ kind: "pushed", value: 1 });
    server.emit({ kind: "broadcast", value: 2 });
  });

  test("replays durable events after a daemon restart without a gap", async () => {
    const dir = tempOrchDir();
    const first = await start(dir);
    const received: unknown[] = [];
    const gaps: number[] = [];
    const subscription = subscribeEvents(dir, { since: 0 }, (event) => received.push(event), (oldest) => gaps.push(oldest));
    const deadline = Date.now() + 2_000;
    while (first.subscriberCount() === 0 && Date.now() < deadline) await Bun.sleep(5);
    first.emit({ value: 1 });
    while (received.length < 1 && Date.now() < deadline) await Bun.sleep(5);
    expect(received).toEqual([{ value: 1 }]);
    await first.close();
    servers.splice(servers.indexOf(first), 1);
    const second = await start(dir);
    const secondDeadline = Date.now() + 3_000;
    while (second.subscriberCount() === 0 && Date.now() < secondDeadline) await Bun.sleep(5);
    second.emit({ value: 2 });
    while (received.length < 2 && Date.now() < secondDeadline) await Bun.sleep(5);
    expect(received).toEqual([{ value: 1 }, { value: 2 }]);
    expect(gaps).toEqual([]);
    subscription.close();
  });

  test("reports the oldest sequence when replay starts before the pruned window", () => {
    const dir = tempOrchDir();
    appendEvent(dir, "2024-01-01T00:00:00.000Z", { value: 1 });
    appendEvent(dir, "2024-01-02T00:00:00.000Z", { value: 2 });
    appendEvent(dir, "2024-01-03T00:00:00.000Z", { value: 3 });
    deleteEventsBefore(dir, "2024-01-03T00:00:00.000Z");
    const replay = new ReplayBuffer(dir).since(0);
    expect(replay.gap).toBe(true);
    expect(replay.oldestSeq).toBe(3);
    expect(replay.events).toEqual([{ seq: 3, event: { value: 3 } }]);
  });

  test("removes a stale unix socket when the daemon owns the lock", async () => {
    const dir = tempOrchDir();
    writeFileSync(join(dir, "orchd.sock"), "stale endpoint");
    expect(acquireDaemonLock(dir)).toBe(true);
    const server = await start(dir);
    expect(server.transport).toBe("unix");
    expect(await rpcCall(dir, "echo", "after-reclaim")).toBe("after-reclaim");
  });

  test("has a catchable absent-daemon error", async () => {
    const dir = tempOrchDir();
    expect(await rejectionOf(rpcCall(dir, "echo"))).toBeInstanceOf(DaemonAbsentError);
  });

  // A live daemon too slow to answer must never look absent: callers SIGTERM on
  // absent, and a loaded machine would make them kill the daemon they came to use.
  test("calls a slow daemon unreachable, not absent", async () => {
    const dir = tempOrchDir();
    await start(dir);
    const failure = await rejectionOf(rpcCall(dir, "hang", undefined, 100));
    expect(failure).toBeInstanceOf(DaemonUnreachableError);
    expect(failure).not.toBeInstanceOf(DaemonAbsentError);
  });

  test("calls a refused endpoint absent so a wedged daemon is still reclaimable", async () => {
    const dir = tempOrchDir();
    writeFileSync(join(dir, "orchd.sock"), "");
    expect(await rejectionOf(rpcCall(dir, "echo"))).toBeInstanceOf(DaemonAbsentError);
  });
});
