import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  derivePresenceTransition,
  emitAndNotify,
  isRepeatTransition,
  startPresenceWatch,
  type PresenceWatch,
} from "../src/daemon/events.ts";
import { rpcSubscribe, startRpcServer, type RpcServer } from "../src/daemon/rpc.ts";
import type { Sink } from "../src/notify/router.ts";
import { seedStatus } from "./helpers/presence.ts";

const directories: string[] = [];
const servers: RpcServer[] = [];
const presenceWatches: PresenceWatch[] = [];

function tempOrchDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-events-"));
  directories.push(directory);
  return directory;
}

function storageKey(key: string): string {
  // Windows forbids ':' in directory names; the event state assertions do not depend on the key text.
  return process.platform === "win32" ? key.replaceAll(":", "_") : key;
}

function nodeCommand(script: string): string[] {
  return [process.execPath, "-e", script];
}

function writeStatus(orchDir: string, key: string, state: string, extra: object = {}): void {
  seedStatus(orchDir, storageKey(key), { pid: process.pid, state, ...extra });
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
    ? Reflect.get(value, "newState") as string
    : undefined;
}

afterEach(async () => {
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
    const watcher = startPresenceWatch({ orchDir, onEvent: (event) => server.emit(event) });
    presenceWatches.push(watcher);
    const received: unknown[] = [];
    const stop = await rpcSubscribe(orchDir, "subscribe-events", (event) => received.push(event));

    writeStatus(orchDir, "workspace:p1", "idle");
    await waitFor(() => received.some((event) => eventState(event) === "idle"));
    stop();
    expect(eventState(received[0])).toBe("idle");
  });

  test("a flapping status file cannot storm the stream with repeat transitions", () => {
    const flap = { key: "w9:flap", agent: "pi", tab: null, model: null, oldState: "aborted", newState: "done", task: "same task", ts: "t" };
    const emitted: unknown[] = [];
    emitAndNotify((event) => emitted.push(event), [], { ...flap });
    emitAndNotify((event) => emitted.push(event), [], { ...flap });
    emitAndNotify((event) => emitted.push(event), [], { ...flap, oldState: "done", newState: "aborted" });
    emitAndNotify((event) => emitted.push(event), [], { ...flap, oldState: "done", newState: "aborted" });
    expect(emitted.length).toBe(2);
  });

  test("a genuine repeat of the same transition for new work still publishes", () => {
    const done = { key: "w9:redo", agent: "pi", tab: null, model: null, oldState: "working", newState: "done", ts: "t" };
    const emitted: unknown[] = [];
    emitAndNotify((event) => emitted.push(event), [], { ...done, task: "first dispatch", dispatchId: "d1" });
    emitAndNotify((event) => emitted.push(event), [], { ...done, task: "second dispatch", dispatchId: "d2" });
    expect(emitted.length).toBe(2);
  });

  test("a repeat transition publishes again once the suppression window passes", () => {
    const event = { key: "w9:window", agent: "pi", tab: null, model: null, oldState: "working", newState: "done", task: "t", ts: "t" };
    expect(isRepeatTransition(event, 1_000)).toBe(false);
    expect(isRepeatTransition(event, 2_000)).toBe(true);
    expect(isRepeatTransition(event, 2_000 + 121_000)).toBe(false);
  });

  test("presence transitions resolve the human name before emission", () => {
    const key = "w6:p-name";
    const states = new Map([[key, "working"]]);
    const event = derivePresenceTransition(
      key,
      { pid: process.pid, state: "done", agent: "Ada" },
      { name: null, tab: null },
      states,
    );
    expect(event?.agent).toBe("Ada");
    expect(event?.agent).not.toContain(key);
  });

  test("a blocked transition drives command sink delivery", async () => {
    const orchDir = tempOrchDir();
    const output = join(orchDir, "notification.json");
    writeStatus(orchDir, "workspace:p2", "working");
    const sink: Sink = {
      type: "command",
      on: ["blocked"],
      command: nodeCommand(`const fs = require("node:fs"); fs.writeFileSync(${JSON.stringify(output)}, fs.readFileSync(0, "utf8"));`),
    };
    const watcher = startPresenceWatch({
      orchDir,
      onEvent: (event) => emitAndNotify(() => { /* noop */ }, [sink], event),
    });
    presenceWatches.push(watcher);

    writeStatus(orchDir, "workspace:p2", "working", { asking: { question: "Need input" } });
    await waitFor(() => {
      try {
        const payload = JSON.parse(readFileSync(output, "utf8")) as { newState?: string };
        return payload.newState === "blocked";
      } catch {
        return false;
      }
    });
    const payload = JSON.parse(readFileSync(output, "utf8")) as { title?: string };
    expect(payload.title).toStartWith("BLOCKED");
  });

  test("a dead daemon closes the subscription instead of falling back to files", async () => {
    const orchDir = tempOrchDir();
    const server = await startRpcServer(orchDir, {
      "subscribe-events": () => ({ subscribed: true }),
    });
    servers.push(server);
    let closes = 0;
    const stop = await rpcSubscribe(orchDir, "subscribe-events", () => { /* noop */ }, () => { closes++; });

    await server.close();
    servers.splice(servers.indexOf(server), 1);
    await waitFor(() => closes > 0);
    expect(closes).toBe(1);
    stop();
  });

  test("a caller-initiated stop is not reported as a disconnect", async () => {
    const orchDir = tempOrchDir();
    const server = await startRpcServer(orchDir, {
      "subscribe-events": () => ({ subscribed: true }),
    });
    servers.push(server);
    let closes = 0;
    const stop = await rpcSubscribe(orchDir, "subscribe-events", () => { /* noop */ }, () => { closes++; });

    stop();
    await Bun.sleep(50);
    expect(closes).toBe(0);
  });
});
