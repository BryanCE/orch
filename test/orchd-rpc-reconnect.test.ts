import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { startRpcServer, subscribeEvents, type EventSubscription, type RpcServer } from "../src/daemon/rpc";

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

describe("subscribeEvents reconnect", () => {
  test("resubscribes and receives events after the daemon restarts", async () => {
    const orchDir = mkdtempSync(join(tmpdir(), "orchd-rpc-reconnect-"));
    let server: RpcServer | undefined;
    let subscription: EventSubscription | undefined;
    const received: unknown[] = [];
    try {
      server = await startRpcServer(orchDir, {});
      subscription = subscribeEvents(orchDir, { since: 0 }, (event) => received.push(event));
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
      rmSync(orchDir, { recursive: true, force: true });
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
      rmSync(orchDir, { recursive: true, force: true });
    }
  });
});
