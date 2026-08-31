import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { createServer, createConnection } from "node:net";
import { isRpcResponse, readJsonMessages } from "../src/daemon/rpc/wire.ts";
import { startRpcServer } from "../src/daemon/rpc/server.ts";
import { subscribeEvents } from "../src/daemon/rpc/client.ts";
import type { EventSubscription, RpcServer } from "../src/types/daemon.ts";

function waitFor<T>(read: () => T[], length: number, timeoutMs = 5_000): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      const values = read();
      if (values.length >= length) {
        resolve(values);
      } else if (Date.now() >= deadline) {
        reject(new Error(`timed out waiting for ${length} events`));
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("RPC JSON framing", () => {
  test("rejects malformed object that only has an id", () => {
    expect(isRpcResponse({ id: 1, nope: true })).toBe(false);
  });

  test("parses split and multiple newline-delimited frames", async () => {
    const server = createServer((socket) => {
      socket.on("data", () => {
        socket.write('{"id":1,"res');
        setTimeout(() => socket.write('ult":"ok"}\n{"id":2,"result":"yes"}\n'), 5);
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (address === null || typeof address === "string") throw new Error("server did not bind TCP");
    const socket = createConnection({ host: "127.0.0.1", port: address.port });
    const messages: unknown[] = [];
    const done = new Promise<void>((resolve) => {
      readJsonMessages(socket, (message) => {
        messages.push(message);
        if (messages.length === 2) resolve();
      });
    });
    socket.write("request\n");
    await done;
    expect(messages).toEqual([{ id: 1, result: "ok" }, { id: 2, result: "yes" }]);
    socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});

describe("subscribeEvents reconnect", () => {
  test("resubscribes and receives events after the daemon restarts", async () => {
    const orchDir = mkdtempSync(join(tmpdir(), "orchd-rpc-reconnect-"));
    let server: RpcServer | undefined;
    let subscription: EventSubscription | undefined;
    const received: unknown[] = [];
    try {
      server = await startRpcServer(orchDir, {});
      subscription = subscribeEvents(orchDir, { since: 0 }, (event) => received.push(event), undefined, true);
      server.emit({ name: "before-restart" });
      await waitFor(() => received, 1);
      expect(received).toEqual([{ name: "before-restart" }]);

      // The daemon goes away with its socket, then returns on the same ORCH_DIR.
      await server.close();
      server = await startRpcServer(orchDir, {});
      // Emitted while the subscription is still redialling: it lands in the new
      // daemon's replay buffer and must be delivered once the socket is back.
      server.emit({ name: "after-restart" });

      await waitFor(() => received, 2);
      expect(received).toContainEqual({ name: "after-restart" });

      // A live event after reconnection flows too.
      server.emit({ name: "post-reconnect" });
      await waitFor(() => received, 3);
      expect(received).toContainEqual({ name: "post-reconnect" });
    } finally {
      subscription?.close();
      await server?.close();
      removeTempDir(orchDir);
    }
  });

  test("close stops the retry loop so a returning daemon delivers nothing", async () => {
    const orchDir = mkdtempSync(join(tmpdir(), "orchd-rpc-reconnect-stop-"));
    let server: RpcServer | undefined;
    const received: unknown[] = [];
    try {
      server = await startRpcServer(orchDir, {});
      const subscription = subscribeEvents(orchDir, { since: 0 }, (event) => received.push(event));
      server.emit({ name: "one" });
      await waitFor(() => received, 1);

      await server.close();
      subscription.close(); // clears the pending retry timer

      // A fresh daemon the closed subscription must never latch onto.
      server = await startRpcServer(orchDir, {});
      server.emit({ name: "two" });
      await delay(1_000);
      expect(received).toEqual([{ name: "one" }]);
    } finally {
      await server?.close();
      removeTempDir(orchDir);
    }
  });
});
