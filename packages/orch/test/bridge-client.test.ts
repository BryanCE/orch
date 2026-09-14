import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { createServer, type Server, type Socket } from "node:net";
import { join } from "node:path";
import { createDaemonClient } from "../src/agent/daemon-client.ts";
import { openJsonLineLink } from "../src/presence/socket-client.ts";
import { daemonRuntimeFiles } from "../src/daemon/client/runtime-files.ts";
import { removeTempDir, tempOrchDir as mintTempOrchDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { isRecord } from "../src/util.ts";
import { testServices } from "./helpers/services.ts";
import type { BridgeDelivery } from "../src/control/bridge-message.ts";

interface Connection {
  readonly socket: Socket;
  readonly lines: Record<string, unknown>[];
}

const directories: OrchDir[] = [];
const servers: Server[] = [];
const sockets: Socket[] = [];
const connections: Connection[] = [];

function tempOrchDir(): OrchDir {
  const directory = mintTempOrchDir("orch-bridge-client-");
  directories.push(directory);
  return directory;
}

async function listen(server: Server, path: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(path, resolve);
  });
  servers.push(server);
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!predicate() && Date.now() < deadline) await Bun.sleep(5);
  if (!predicate()) throw new Error("timed out waiting for bridge activity");
}

function parseConnections(server: Server): void {
  server.on("connection", (socket) => {
    sockets.push(socket);
    const connection: Connection = { socket, lines: [] };
    connections.push(connection);
    let buffer = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const parsed: unknown = JSON.parse(buffer.slice(0, newline));
        if (isRecord(parsed)) {
          connection.lines.push(parsed);
          if (typeof parsed.id === "number") {
            socket.write(`${JSON.stringify({ id: parsed.id, result: { attached: true, open: 0, ok: true } })}\n`);
          }
        }
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
    });
  });
}

async function closeServer(server: Server): Promise<void> {
  for (const socket of sockets) socket.destroy();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

afterEach(async () => {
  while (servers.length) await closeServer(servers.pop()!);
  sockets.length = 0;
  connections.length = 0;
  while (directories.length) removeTempDir(directories.pop()!);
});

describe("bridge daemon client", () => {
  test("attaches, receives deliveries, acks on the link, and reconnects", async () => {
    const directory = tempOrchDir();
    writeSettingsFixture(directory, { daemon: { bridge_reconnect_ms: 10 } });
    const socketPath = daemonRuntimeFiles(directory).socket;
    const server = createServer();
    parseConnections(server);
    await listen(server, socketPath);

    const deliveries: BridgeDelivery[] = [];
    const client = createDaemonClient(directory, testServices({ orchDir: directory, settings: null }).settings);
    client.attach("agent-key", (delivery) => deliveries.push(delivery));
    await waitFor(() => connections.length === 1 && connections[0]!.lines.length === 1);
    await waitFor(() => client.attached());
    expect(connections[0]!.lines[0]).toMatchObject({ method: "attach", params: { key: "agent-key" } });

    const first = connections[0]!;
    const deliveryLine = `${JSON.stringify({ delivery: { id: "m1", message: { action: "steer", text: "hello" } } })}\n`;
    first.socket.write(deliveryLine.slice(0, 12));
    first.socket.write(deliveryLine.slice(12));
    first.socket.write(`${JSON.stringify({ delivery: { id: "m2", message: { action: "nope" } } })}\n`);
    await waitFor(() => deliveries.length === 1);
    expect(deliveries[0]).toEqual({ id: "m1", message: { action: "steer", text: "hello" } });

    expect(await client.postAck("m1")).toBe(true);
    await waitFor(() => first.lines.length === 2);
    expect(first.lines[1]).toMatchObject({ method: "ack", params: { id: "m1" } });
    expect(connections[0]).toBe(first);

    first.socket.destroy();
    await waitFor(() => connections.length === 2 && connections[1]!.lines.length === 1);
    expect(connections[1]!.lines[0]).toMatchObject({ method: "attach", params: { key: "agent-key" } });

    connections[1]!.socket.destroy();
    client.detach();
    const connectionCount = connections.length;
    await Bun.sleep(40);
    expect(connections).toHaveLength(connectionCount);
  });

  test("dead endpoints resolve undefined without invoking handlers", async () => {
    const endpoint = join(tempOrchDir(), "missing.sock");
    let lines = 0;
    let closed = 0;
    const link = await openJsonLineLink(endpoint, {
      onLine: () => { lines += 1; },
      onClose: () => { closed += 1; },
    });
    expect(link).toBeUndefined();
    expect(lines).toBe(0);
    expect(closed).toBe(0);
    expect(existsSync(endpoint)).toBe(false);
  });
});
