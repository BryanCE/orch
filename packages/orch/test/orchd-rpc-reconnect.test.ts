import { recordingLogger } from "./helpers/logger.ts";
import { describe, expect, test } from "bun:test";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { createServer, createConnection } from "node:net";
import { parseRpcLine, readJsonMessages } from "../src/daemon/client/wire.ts";
import { startRpcServer } from "../src/daemon/server/rpc.ts";
import { subscribeEvents } from "../src/daemon/client/rpc.ts";
import type { EventSubscription, RpcServer } from "../src/types/daemon.ts";
import type { OrchDir } from "../src/types/core.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { agentViews } from "../src/store/agent-view.ts";
import { stubRpcHandlers } from "./helpers/rpc-handlers.ts";

type RpcEvent = Parameters<RpcServer["emit"]>[0];
type TransitionEvent = Extract<RpcEvent, { type: "transition" }>;
const fixtureAgent = mintAgentId();

function transitionEvent(overrides: Partial<TransitionEvent> = {}): TransitionEvent {
  return {
    type: "transition",
    key: "event",
    ts: new Date(0).toISOString(),
    agent: fixtureAgent,
    tab: "tab",
    model: "model",
    oldState: "idle",
    newState: "working",
    ...overrides,
  };
}

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
    expect(parseRpcLine({ id: 1, nope: true })).toBeNull();
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
    expect(messages).toEqual([
      { kind: "reply", id: 1, result: "ok" },
      { kind: "reply", id: 2, result: "yes" },
    ]);
    socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});

describe("subscribeEvents reconnect", () => {
  test("resubscribes and receives events after the daemon restarts", async () => {
    const orchDir: OrchDir = tempOrchDir("orchd-rpc-reconnect-");
    let server: RpcServer | undefined;
    let subscription: EventSubscription | undefined;
    const received: RpcEvent[] = [];
    try {
      server = await startRpcServer(orchDir, stubRpcHandlers(), { logger: recordingLogger().logger });
      subscription = subscribeEvents(orchDir, { since: 0 }, (event) => received.push(event), undefined, true);
      server.emit(transitionEvent({ key: "before-restart" }));
      await waitFor(() => received, 1);
      expect(received.map((event) => event.key)).toEqual(["before-restart"]);

      // The daemon goes away with its socket, then returns on the same ORCH_DIR.
      await server.close();
      server = await startRpcServer(orchDir, stubRpcHandlers(), { logger: recordingLogger().logger });
      // Emitted while the subscription is still redialling: it lands in the new
      // daemon's replay buffer and must be delivered once the socket is back.
      server.emit(transitionEvent({ key: "after-restart" }));

      await waitFor(() => received, 2);
      expect(received.map((event) => event.key)).toContain("after-restart");

      // A live event after reconnection flows too.
      server.emit(transitionEvent({ key: "post-reconnect" }));
      await waitFor(() => received, 3);
      expect(received.map((event) => event.key)).toContain("post-reconnect");
    } finally {
      subscription?.close();
      await server?.close();
      removeTempDir(orchDir);
    }
  });

  test("close stops the retry loop so a returning daemon delivers nothing", async () => {
    const orchDir: OrchDir = tempOrchDir("orchd-rpc-reconnect-stop-");
    let server: RpcServer | undefined;
    const received: RpcEvent[] = [];
    try {
      server = await startRpcServer(orchDir, stubRpcHandlers(), { logger: recordingLogger().logger });
      const subscription = subscribeEvents(orchDir, { since: 0 }, (event) => received.push(event));
      server.emit(transitionEvent({ key: "one" }));
      await waitFor(() => received, 1);

      await server.close();
      subscription.close(); // clears the pending retry timer

      // A fresh daemon the closed subscription must never latch onto.
      server = await startRpcServer(orchDir, stubRpcHandlers(), { logger: recordingLogger().logger });
      server.emit(transitionEvent({ key: "two" }));
      await delay(1_000);
      expect(received.map((event) => event.key)).toEqual(["one"]);
    } finally {
      await server?.close();
      removeTempDir(orchDir);
    }
  });
});

describe("subscribeEvents identity handshake", () => {
  test("a spawned agent never registers as a session", async () => {
    const orchDir: OrchDir = tempOrchDir("orchd-rpc-identify-spawned-");
    const previous = process.env[LAUNCH_ENV];
    process.env[LAUNCH_ENV] = mintAgentId();
    let server: RpcServer | undefined;
    let subscription: EventSubscription | undefined;
    const received: RpcEvent[] = [];
    try {
      server = await startRpcServer(orchDir, stubRpcHandlers(), { logger: recordingLogger().logger });
      subscription = subscribeEvents(orchDir, { since: 0 }, (event) => received.push(event), undefined, true);
      server.emit(transitionEvent({ key: "one" }));
      await waitFor(() => received, 1);
      expect(agentViews(orchDir)).toEqual([]);
    } finally {
      if (previous === undefined) delete process.env[LAUNCH_ENV];
      else process.env[LAUNCH_ENV] = previous;
      subscription?.close();
      await server?.close();
      removeTempDir(orchDir);
    }
  });

  test("a session without a launch credential registers once", async () => {
    const orchDir: OrchDir = tempOrchDir("orchd-rpc-identify-session-");
    const previous = process.env[LAUNCH_ENV];
    delete process.env[LAUNCH_ENV];
    let server: RpcServer | undefined;
    let subscription: EventSubscription | undefined;
    const received: RpcEvent[] = [];
    try {
      server = await startRpcServer(orchDir, stubRpcHandlers(), { logger: recordingLogger().logger });
      subscription = subscribeEvents(orchDir, { since: 0 }, (event) => received.push(event), undefined, true);
      server.emit(transitionEvent({ key: "one" }));
      await waitFor(() => received, 1);
      expect(agentViews(orchDir)).toHaveLength(1);
    } finally {
      if (previous !== undefined) process.env[LAUNCH_ENV] = previous;
      subscription?.close();
      await server?.close();
      removeTempDir(orchDir);
    }
  });
});
