import { afterEach, describe, expect, test } from "bun:test";
import { createConnection } from "node:net";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireDaemonLock } from "../src/daemon/lifecycle";
import {
  DaemonAbsentError,
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

async function waitForLine(lines: string[], index: number): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (lines.length <= index && Date.now() < deadline) await Bun.sleep(5);
  if (lines.length <= index) throw new Error("timed out waiting for RPC line");
}

async function start(dir: string): Promise<RpcServer> {
  const server = await startRpcServer(dir, {
    echo: (params) => params,
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
    expect(rpcCall(dir, "echo", { ok: true })).resolves.toEqual({ ok: true });
  });

  test("returns an error for an unknown method", async () => {
    const dir = tempOrchDir();
    await start(dir);
    expect(rpcCall(dir, "missing")).rejects.toBeInstanceOf(RpcError);
    expect(rpcCall(dir, "missing")).rejects.toThrow("Unknown method");
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
    expect(event).resolves.toEqual({ kind: "pushed", value: 1 });
    server.emit({ kind: "broadcast", value: 2 });
  });

  test("removes a stale unix socket when the daemon owns the lock", async () => {
    const dir = tempOrchDir();
    writeFileSync(join(dir, "orchd.sock"), "stale endpoint");
    expect(acquireDaemonLock(dir)).toBe(true);
    const server = await start(dir);
    expect(server.transport).toBe("unix");
    expect(rpcCall(dir, "echo", "after-reclaim")).resolves.toBe("after-reclaim");
  });

  test("has a catchable absent-daemon error", () => {
    const dir = tempOrchDir();
    expect(rpcCall(dir, "echo")).rejects.toBeInstanceOf(DaemonAbsentError);
  });
});
