import { afterEach, describe, expect, test } from "bun:test";
import { createConnection } from "node:net";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireDaemonLock } from "../src/daemon/lifecycle";
import { daemonRuntimeFiles } from "../src/daemon/runtime-files";
import {
  DaemonAbsentError,
  DaemonUnreachableError,
  RpcError,
  rpcCall,
  rpcSubscribe,
  startRpcServer,
  type RpcServer,
} from "../src/daemon/rpc";

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
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe("daemon RPC", () => {
  test("round-trips a call over the real unix socket", async () => {
    const dir = tempOrchDir();
    await start(dir);
    expect(await rpcCall(dir, "echo", { ok: true })).toEqual({ ok: true });
  });

  test("issues one session identity to sequential connections from one ancestor", async () => {
    const dir = tempOrchDir();
    await start(dir);
    const first = await rpcCall(dir, "hello");
    const second = await rpcCall(dir, "hello");
    expect(first).toMatchObject({ label: expect.any(String), kind: "session" });
    expect(second).toEqual(first);
    expect((first as { id: string }).id).not.toContain("~");
  });

  test("a TCP hello with the daemon token gets an identity", async () => {
    const dir = tempOrchDir();
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    const token = readFileSync(daemonRuntimeFiles(dir).token, "utf8").trim();
    expect(await tcpHello(server, { token })).toMatchObject({
      id: 1,
      result: { kind: "session", label: "local TCP client", id: expect.any(String) },
    });
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

  test("writes the TCP token with owner-only permissions", async () => {
    const dir = tempOrchDir();
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    const tokenFile = daemonRuntimeFiles(dir).token;
    expect(readFileSync(tokenFile, "utf8").trim()).toMatch(/^[0-9a-f]{64}$/);
    expect(statSync(tokenFile).mode & 0o777).toBe(0o600);
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
