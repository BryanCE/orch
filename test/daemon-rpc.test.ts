import { afterEach, describe, expect, test } from "bun:test";
import { createConnection } from "node:net";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireDaemonLock } from "../src/daemon/lifecycle";
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
