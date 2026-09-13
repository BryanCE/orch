import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createConnection, type Socket } from "node:net";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startRpcServer } from "../src/daemon/rpc/server.ts";
import { attachBridge, attachedBridgeKeys, detachBridge, pushToBridge } from "../src/control/bridge-links.ts";
import type { BridgeLink } from "../src/control/bridge-links.ts";
import { isBridgeDelivery } from "../src/control/bridge-message.ts";
import type { BridgeDelivery } from "../src/control/bridge-message.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import { isRecord } from "../src/util.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const originalOrchDir = process.env.ORCH_DIR;
const directories: string[] = [];
const servers: RpcServer[] = [];

function observe(socket: Socket): string[] {
  const lines: string[] = [];
  let buffer = "";
  socket.setEncoding("utf8");
  socket.on("data", (chunk: string) => {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      lines.push(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
    }
  });
  return lines;
}

async function connected(server: RpcServer): Promise<Socket> {
  return new Promise<Socket>((resolve, reject) => {
    const socket = createConnection(server.socketPath);
    socket.once("connect", () => resolve(socket));
    socket.once("error", reject);
  });
}

async function lineAt(lines: string[], index: number): Promise<Record<string, unknown>> {
  const deadline = Date.now() + 2_000;
  while (lines.length <= index && Date.now() < deadline) await Bun.sleep(5);
  if (lines.length <= index) throw new Error(`timed out waiting for RPC line ${index}`);
  const parsed: unknown = JSON.parse(lines[index]!);
  if (!isRecord(parsed)) throw new Error("RPC line was not an object");
  return parsed;
}

async function until(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!predicate() && Date.now() < deadline) await Bun.sleep(5);
  if (!predicate()) throw new Error("timed out waiting for bridge state");
}

function liveKey(directory: string): string {
  const key = mintAgentId();
  seedStatus(directory, key, { agent: "pi", pid: process.pid, state: "working" });
  return key;
}

async function start(onBridgeAttached?: (key: string) => void): Promise<RpcServer> {
  const directory = directories[directories.length - 1]!;
  const server = await startRpcServer(directory, {
    attach: () => ({ attached: true, open: 1 }),
  }, { onBridgeAttached });
  servers.push(server);
  return server;
}

beforeEach(() => {
  const directory = mkdtempSync(join(tmpdir(), "orch-bridge-link-server-"));
  directories.push(directory);
  process.env.ORCH_DIR = directory;
});

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  for (const key of attachedBridgeKeys()) {
    const link: BridgeLink = { push: () => undefined };
    attachBridge(key, link);
    detachBridge(key, link);
  }
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  while (directories.length) removeTempDir(directories.pop()!);
});

describe("daemon bridge links", () => {
  test("attaches, replies, notifies after the reply write, and pushes deliveries", async () => {
    const key = liveKey(directories[0]!);
    const notifications: string[] = [];
    const delivery: BridgeDelivery = { id: "row-1", message: { action: "steer", text: "hello" } };
    const server = await start((attached) => {
      notifications.push(attached);
      pushToBridge(attached, delivery);
    });
    const socket = await connected(server);
    const lines = observe(socket);
    socket.write(`${JSON.stringify({ id: 1, method: "attach", params: { key } })}\n`);

    const reply = await lineAt(lines, 0);
    const pushed = await lineAt(lines, 1);
    expect(reply).toEqual({ id: 1, result: { attached: true, open: 1 } });
    expect(pushed).toEqual({ event: { kind: "delivery", ...delivery } });
    expect(isBridgeDelivery(pushed.event)).toBe(true);
    expect(notifications).toEqual([key]);
    expect(attachedBridgeKeys()).toEqual([key]);
    expect(server.attachedBridgeCount()).toBe(1);
    socket.destroy();
  });

  test("a socket close detaches its bridge", async () => {
    const key = liveKey(directories[0]!);
    const server = await start();
    const socket = await connected(server);
    const lines = observe(socket);
    socket.write(`${JSON.stringify({ id: 1, method: "attach", params: { key } })}\n`);
    await lineAt(lines, 0);
    expect(server.attachedBridgeCount()).toBe(1);
    socket.destroy();
    await until(() => server.attachedBridgeCount() === 0);
  });

  test("a second socket replaces the first link", async () => {
    const key = liveKey(directories[0]!);
    const notifications: string[] = [];
    const server = await start((attached) => notifications.push(attached));
    const first = await connected(server);
    const firstLines = observe(first);
    first.write(`${JSON.stringify({ id: 1, method: "attach", params: { key } })}\n`);
    await lineAt(firstLines, 0);
    const second = await connected(server);
    const secondLines = observe(second);
    second.write(`${JSON.stringify({ id: 2, method: "attach", params: { key } })}\n`);
    await lineAt(secondLines, 0);

    pushToBridge(key, { id: "row-2", message: { action: "dispatch", text: "new" } });
    const pushed = await lineAt(secondLines, 1);
    expect(firstLines).toHaveLength(1);
    expect(pushed).toEqual({ event: { kind: "delivery", id: "row-2", message: { action: "dispatch", text: "new" } } });
    expect(notifications).toEqual([key, key]);
    expect(server.attachedBridgeCount()).toBe(1);
    first.destroy();
    second.destroy();
  });

  test("attach without a key is rejected", async () => {
    const server = await start();
    const socket = await connected(server);
    const lines = observe(socket);
    socket.write(`${JSON.stringify({ id: 1, method: "attach", params: {} })}\n`);
    expect(await lineAt(lines, 0)).toEqual({ id: 1, error: { code: "INVALID_REQUEST", message: "attach requires key" } });
    expect(server.attachedBridgeCount()).toBe(0);
    socket.destroy();
  });

  test("server close detaches every bridge", async () => {
    const key = liveKey(directories[0]!);
    const server = await start();
    const socket = await connected(server);
    const lines = observe(socket);
    socket.write(`${JSON.stringify({ id: 1, method: "attach", params: { key } })}\n`);
    await lineAt(lines, 0);
    expect(server.attachedBridgeCount()).toBe(1);
    await server.close();
    expect(server.attachedBridgeCount()).toBe(0);
    socket.destroy();
  });
});
