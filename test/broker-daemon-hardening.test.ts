import { afterEach, describe, expect, test } from "bun:test";
import { createConnection } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { insertOutboxMessage, markOutboxDelivered, selectPendingOutbox } from "../src/store/sqlite.ts";
import { drainOutbox } from "../src/daemon/outbox.ts";
import { validateWriteParams } from "../src/daemon/orchd.ts";
import { ReplayBuffer, startRpcServer, type RpcServer } from "../src/daemon/rpc.ts";

const dirs: string[] = [];
const servers: RpcServer[] = [];

afterEach(async () => {
  while (servers.length > 0) await servers.pop()!.close();
  while (dirs.length > 0) rmSync(dirs.pop()!, { recursive: true, force: true });
});

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-hardening-"));
  dirs.push(dir);
  return dir;
}

describe("broker daemon hardening", () => {
  test("dispatch/steer validation rejects null, arrays, and non-string fields", () => {
    for (const params of [null, [], { target: null, text: "x" }, { target: "a", text: 3 }]) {
      expect(() => validateWriteParams(params)).toThrow();
    }
    expect(validateWriteParams({ target: "agent:a", text: "hello" })).toEqual({ target: "agent:a", text: "hello" });
  });

  test("ack is idempotent when the same id is acknowledged twice", () => {
    const dir = fixture();
    insertOutboxMessage(dir, { id: "ack-once", target: "agent:a", payload: "x" });
    markOutboxDelivered(dir, "ack-once");
    expect(() => markOutboxDelivered(dir, "ack-once")).not.toThrow();
    expect(selectPendingOutbox(dir, Date.now())).toEqual([]);
  });

  test("a throwing delivery is retried and does not poison later messages", async () => {
    const dir = fixture();
    insertOutboxMessage(dir, { id: "throws", target: "a", payload: "x" });
    insertOutboxMessage(dir, { id: "works", target: "b", payload: "y" });
    const delivered: string[] = [];
    const result = await drainOutbox(dir, {
      now: () => 1_000,
      deliver: (target) => {
        if (target === "a") return Promise.reject(new Error("backend down"));
        delivered.push(target);
        return Promise.resolve(true);
      },
    });
    expect(result).toEqual({ delivered: 1, retried: 1 });
    expect(delivered).toEqual(["b"]);
    expect(selectPendingOutbox(dir, 1_501).map((message) => message.id)).toEqual(["throws"]);
  });

  test("concurrent drains do not redeliver one message id", async () => {
    const dir = fixture();
    insertOutboxMessage(dir, { id: "single", target: "a", payload: "x" });
    let deliveries = 0;
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    const deps = { now: () => 0, deliver: async () => { deliveries += 1; await blocked; return true; } };
    const first = drainOutbox(dir, deps);
    await Bun.sleep(0);
    const second = drainOutbox(dir, deps);
    release();
    await Promise.all([first, second]);
    expect(deliveries).toBe(1);
  });

  test("replay after the newest sequence is empty without a gap", () => {
    const buffer = new ReplayBuffer();
    buffer.push("event");
    expect(buffer.since(99)).toEqual({ events: [], gap: false, oldestSeq: 1 });
  });

  test("malformed request gets an error and the connection remains usable", async () => {
    const dir = fixture();
    const server = await startRpcServer(dir, { echo: (params) => params });
    servers.push(server);
    const socket = await new Promise<import("node:net").Socket>((resolve, reject) => {
      const connection = createConnection(server.socketPath);
      connection.once("connect", () => resolve(connection));
      connection.once("error", reject);
    });
    socket.setEncoding("utf8");
    const lines: string[] = [];
    socket.on("data", (chunk: string) => lines.push(...chunk.trim().split("\n")));
    socket.write("{bad json}\n");
    while (lines.length < 1) await Bun.sleep(1);
    expect(JSON.parse(lines[0]!)).toMatchObject({ error: { code: "INVALID_REQUEST" } });
    socket.write('{"id":1,"method":"echo","params":"ok"}\n');
    while (lines.length < 2) await Bun.sleep(1);
    expect(JSON.parse(lines[1]!)).toMatchObject({ id: 1, result: "ok" });
    socket.destroy();
  });
});
