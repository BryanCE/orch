import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  BridgeDetachedError,
  attachBridge as daemonAttachBridge,
  attachedBridgeKeys,
  bridgeAttached as daemonBridgeAttached,
  detachBridge as daemonDetachBridge,
  isBridgeDetached,
  pushToBridge as daemonPushToBridge,
} from "../src/control/bridge-links.ts";
import type { BridgeLink } from "../src/control/bridge-links.ts";
import { isBridgeDelivery, isBridgeMessage } from "../src/control/bridge-message.ts";
import type { BridgeDelivery } from "../src/control/bridge-message.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { seedAgent } from "./helpers/agent.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const originalOrchDir = process.env.ORCH_DIR;
let directory = "";
const held: { key: string; link: BridgeLink }[] = [];

/** A link that records every delivery pushed down it. */
function recordingLink(): BridgeLink & { readonly pushed: BridgeDelivery[] } {
  const pushed: BridgeDelivery[] = [];
  return { pushed, push: (delivery) => { pushed.push(delivery); } };
}

/** Attach and remember the link, so afterEach can detach exactly what this test held. */
function attach(key: string, link: BridgeLink): void {
  attachBridge(key, link);
  held.push({ key, link });
}

/** A live agent addressable by id and by name, so the registry can canonicalize either. */
function liveAgent(name: string): string {
  const key = mintAgentId();
  seedStatus(directory, key, { agent: "pi", pid: process.pid });
  seedAgent(key, { name }, directory);
  return key;
}

const delivery: BridgeDelivery = { id: "row-1", message: { action: "steer", text: "hello" } };

function attachBridge(key: string, link: BridgeLink): void {
  daemonAttachBridge(directory, key, link);
}

function detachBridge(key: string, link: BridgeLink): void {
  daemonDetachBridge(directory, key, link);
}

function bridgeAttached(key: string): boolean {
  return daemonBridgeAttached(directory, key);
}

function pushToBridge(key: string, value: BridgeDelivery): void {
  daemonPushToBridge(directory, key, value);
}

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-bridge-links-"));
  process.env.ORCH_DIR = directory;
});

afterEach(() => {
  for (const { key, link } of held.splice(0)) detachBridge(key, link);
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  removeTempDir(directory);
});

describe("bridge links", () => {
  test("attach holds the link under the canonical key and push reaches it", () => {
    const key = liveAgent("worker-a");
    const link = recordingLink();
    attach("worker-a", link);
    expect(bridgeAttached(key)).toBe(true);
    expect(attachedBridgeKeys()).toEqual([key]);
    pushToBridge(key, delivery);
    expect(link.pushed).toEqual([delivery]);
  });

  test("a second attach for the same key replaces the first", () => {
    const key = liveAgent("worker-b");
    const first = recordingLink();
    const second = recordingLink();
    attach(key, first);
    attach("worker-b", second);
    pushToBridge(key, delivery);
    expect(first.pushed).toEqual([]);
    expect(second.pushed).toEqual([delivery]);
  });

  test("detach removes only the link still held", () => {
    const key = liveAgent("worker-c");
    const stale = recordingLink();
    const current = recordingLink();
    attach(key, stale);
    attach(key, current);
    detachBridge(key, stale);
    expect(bridgeAttached(key)).toBe(true);
    detachBridge(key, current);
    expect(bridgeAttached(key)).toBe(false);
  });

  test("push with no link throws BridgeDetachedError", () => {
    const key = liveAgent("worker-d");
    let thrown: unknown;
    try {
      pushToBridge(key, delivery);
    } catch (error) {
      thrown = error;
    }
    expect(isBridgeDetached(thrown)).toBe(true);
    expect(thrown instanceof BridgeDetachedError && thrown.code).toBe("BRIDGE_DETACHED");
  });

  test("an unknown target is refused before the registry is consulted", () => {
    expect(() => attachBridge("nobody", recordingLink())).toThrow("does not resolve");
  });
});

describe("bridge message guards", () => {
  test("accept every action shape", () => {
    expect(isBridgeMessage({ action: "dispatch", text: "t" })).toBe(true);
    expect(isBridgeMessage({ action: "steer", text: "t" })).toBe(true);
    expect(isBridgeMessage({ action: "answer", text: "t", questionId: "q" })).toBe(true);
    expect(isBridgeMessage({ action: "model", model: "m" })).toBe(true);
  });

  test("refuse a missing field, an unknown action, and a non-record", () => {
    expect(isBridgeMessage({ action: "dispatch" })).toBe(false);
    expect(isBridgeMessage({ action: "answer", text: "t" })).toBe(false);
    expect(isBridgeMessage({ action: "on_done", text: "t" })).toBe(false);
    expect(isBridgeMessage("dispatch")).toBe(false);
  });

  test("a delivery is an id plus a message", () => {
    expect(isBridgeDelivery(delivery)).toBe(true);
    expect(isBridgeDelivery({ id: 1, message: delivery.message })).toBe(false);
    expect(isBridgeDelivery({ id: "row", message: { action: "model" } })).toBe(false);
  });
});
