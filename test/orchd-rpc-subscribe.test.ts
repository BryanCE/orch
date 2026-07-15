import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { startRpcServer, subscribeEvents, type EventSubscription, type RpcServer } from "../src/daemon/rpc";

function waitFor<T>(read: () => T[], length: number): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 2_000;
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

describe("orchd event subscription", () => {
  test("replays only events missed between subscriptions", async () => {
    const orchDir = mkdtempSync(join(tmpdir(), "orchd-rpc-subscribe-"));
    let server: RpcServer | undefined;
    let first: EventSubscription | undefined;
    let second: EventSubscription | undefined;
    try {
      server = await startRpcServer(orchDir, {});
      server.emit({ name: "one" });
      server.emit({ name: "two" });
      server.emit({ name: "three" });

      const received: { event: unknown; seq: number }[] = [];
      first = subscribeEvents(orchDir, { since: 0 }, (event, seq) => received.push({ event, seq }));
      await waitFor(() => received, 3);
      expect(received.map((entry) => entry.event)).toEqual([
        { name: "one" },
        { name: "two" },
        { name: "three" },
      ]);
      expect(received.map((entry) => entry.seq)).toEqual([1, 2, 3]);
      expect(first.lastSeq()).toBe(3);

      first.close();
      server.emit({ name: "four" });
      server.emit({ name: "five" });

      const replayed: { event: unknown; seq: number }[] = [];
      second = subscribeEvents(orchDir, { since: first.lastSeq() }, (event, seq) => replayed.push({ event, seq }));
      await waitFor(() => replayed, 2);
      expect(replayed.map((entry) => entry.event)).toEqual([
        { name: "four" },
        { name: "five" },
      ]);
      expect(replayed.map((entry) => entry.seq)).toEqual([4, 5]);
      expect(second.lastSeq()).toBe(5);
    } finally {
      first?.close();
      second?.close();
      await server?.close();
      rmSync(orchDir, { recursive: true, force: true });
    }
  });
});
