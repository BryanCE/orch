import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  emitAndNotify,
  startPreferredEvents,
  startPresenceWatch,
  type PresenceWatch,
  type PreferredEvents,
} from "../src/daemon/events.ts";
import { rpcSubscribe, startRpcServer, type RpcServer } from "../src/daemon/rpc.ts";
import type { NotifyEvent, Sink } from "../src/notify.ts";

const directories: string[] = [];
const servers: RpcServer[] = [];
const presenceWatches: PresenceWatch[] = [];
const preferredStreams: PreferredEvents[] = [];

function tempOrchDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-events-"));
  directories.push(directory);
  return directory;
}

function writeStatus(orchDir: string, key: string, state: string, extra: object = {}): void {
  const directory = join(orchDir, "agents", key);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "status.json"), `${JSON.stringify({ pid: process.pid, state, ...extra })}\n`);
}

async function waitFor(check: () => boolean, timeoutMs = 2_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error("timed out waiting for event");
    await Bun.sleep(10);
  }
}

function eventState(value: unknown): string | undefined {
  return value && typeof value === "object" && typeof Reflect.get(value, "newState") === "string"
    ? Reflect.get(value, "newState")
    : undefined;
}

afterEach(async () => {
  for (const stream of preferredStreams.splice(0)) stream.stop();
  for (const watcher of presenceWatches.splice(0)) watcher.stop();
  for (const server of servers.splice(0)) await server.close();
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("daemon presence events", () => {
  test("an RPC subscriber receives a presence transition", async () => {
    const orchDir = tempOrchDir();
    writeStatus(orchDir, "workspace:p1", "working");
    const server = await startRpcServer(orchDir, {
      "subscribe-events": () => ({ subscribed: true }),
    });
    servers.push(server);
    const watcher = startPresenceWatch({ orchDir, onEvent: server.emit });
    presenceWatches.push(watcher);
    const received: unknown[] = [];
    const stop = await rpcSubscribe(orchDir, "subscribe-events", (event) => received.push(event));

    writeStatus(orchDir, "workspace:p1", "idle");
    await waitFor(() => received.some((event) => eventState(event) === "idle"));
    stop();
    expect(eventState(received[0])).toBe("idle");
  });

  test("a blocked transition drives command sink delivery", async () => {
    const orchDir = tempOrchDir();
    const output = join(orchDir, "notification.json");
    writeStatus(orchDir, "workspace:p2", "working");
    const sink: Sink = { type: "command", on: ["blocked"], command: ["sh", "-c", `cat > '${output}'`] };
    const watcher = startPresenceWatch({
      orchDir,
      onEvent: (event) => emitAndNotify(() => {}, [sink], event),
    });
    presenceWatches.push(watcher);

    writeStatus(orchDir, "workspace:p2", "working", { asking: { question: "Need input" } });
    await waitFor(() => {
      try {
        return JSON.parse(readFileSync(output, "utf8")).newState === "blocked";
      } catch {
        return false;
      }
    });
    expect(JSON.parse(readFileSync(output, "utf8")).title).toStartWith("BLOCKED");
  });

  test("a dead daemon falls back once and diffs the switch snapshot", async () => {
    const orchDir = tempOrchDir();
    const key = "workspace:p3";
    writeStatus(orchDir, key, "working");
    const server = await startRpcServer(orchDir, {
      "subscribe-events": () => ({ subscribed: true }),
      "daemon-status": () => ({ ok: true }),
    });
    servers.push(server);
    const states = new Map([[key, "working"]]);
    const received: NotifyEvent[] = [];
    let notices = 0;
    let fallbackStarts = 0;
    const stream = await startPreferredEvents({
      orchDir,
      probeIntervalMs: 20,
      onEvent: (value) => {
        if (!value || typeof value !== "object") return;
        const newState = Reflect.get(value, "newState");
        if (typeof newState === "string") states.set(key, newState);
      },
      onDisconnect: () => { notices++; },
      onFallback: () => {
        fallbackStarts++;
        const watcher = startPresenceWatch({ orchDir, initialStates: states, onEvent: (event) => received.push(event), pollIntervalMs: 20 });
        presenceWatches.push(watcher);
      },
    });
    preferredStreams.push(stream);

    writeStatus(orchDir, key, "blocked");
    await server.close();
    servers.splice(servers.indexOf(server), 1);
    await waitFor(() => received.some((event) => event.newState === "blocked"));
    expect(received[0]).toMatchObject({ oldState: "working", newState: "blocked" });
    expect(notices).toBe(1);
    expect(fallbackStarts).toBe(1);
  });
});
