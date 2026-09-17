import { recordingLogger } from "./helpers/logger.ts";
import { describe, expect, test } from "bun:test";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { startRpcServer } from "../src/daemon/server/rpc.ts";
import { subscribeEvents } from "../src/daemon/client/rpc.ts";
import type { EventSubscription, RpcServer } from "../src/types/daemon.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { NotifyEvent } from "../src/types/notify.ts";
import { stubRpcHandlers } from "./helpers/rpc-handlers.ts";

function event(name: string): NotifyEvent {
  return {
    type: "transition",
    key: name,
    ts: "2025-01-01T00:00:00.000Z",
    agent: name,
    tab: null,
    model: null,
    oldState: "idle",
    newState: "working",
    name,
  };
}

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
    const orchDir: OrchDir = tempOrchDir("orchd-rpc-subscribe-");
    let server: RpcServer | undefined;
    let first: EventSubscription | undefined;
    let second: EventSubscription | undefined;
    try {
      server = await startRpcServer(orchDir, stubRpcHandlers(), { logger: recordingLogger().logger });
      server.emit(event("one"));
      server.emit(event("two"));
      server.emit(event("three"));

      const received: { event: NotifyEvent; seq: number }[] = [];
      first = subscribeEvents(orchDir, { since: 0 }, (event, seq) => received.push({ event, seq }));
      await waitFor(() => received, 3);
      expect(received.map((entry) => entry.event.name)).toEqual(["one", "two", "three"]);
      expect(received.map((entry) => entry.seq)).toEqual([1, 2, 3]);
      expect(first.lastSeq()).toBe(3);

      first.close();
      server.emit(event("four"));
      server.emit(event("five"));

      const replayed: { event: NotifyEvent; seq: number }[] = [];
      second = subscribeEvents(orchDir, { since: first.lastSeq() }, (event, seq) => replayed.push({ event, seq }));
      await waitFor(() => replayed, 2);
      expect(replayed.map((entry) => entry.event.name)).toEqual(["four", "five"]);
      expect(replayed.map((entry) => entry.seq)).toEqual([4, 5]);
      expect(second.lastSeq()).toBe(5);
    } finally {
      first?.close();
      second?.close();
      await server?.close();
      removeTempDir(orchDir);
    }
  });
});
