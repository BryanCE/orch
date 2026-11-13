import type { OrchDir } from "../src/types/core.ts";
import { placeHere } from "../src/process-place.ts";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  LinkDetachedError,
  attachLink as daemonAttachBridge,
  attachedBridgeKeys,
  linkAttached as daemonLinkAttached,
  detachLink as daemonDetachBridge,
  isLinkDetached,
  pushToLink as daemonPushToBridge,
} from "../src/control/agent-links.ts";
import type { AgentLink } from "../src/control/agent-links.ts";
import { isBridgeDelivery, isBridgeMessage } from "../src/shared/bridge-message.ts";
import type { BridgeDelivery } from "../src/shared/bridge-message.ts";
import { mintAgentId } from "../src/shared/agent-id.ts";
import { seedAgent } from "./helpers/agent.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const originalOrchDir = process.env.ORCH_DIR;
let directory!: OrchDir;
const held: { key: string; link: AgentLink }[] = [];

/** A link that records every delivery pushed down it. */
function recordingLink(): AgentLink & { readonly pushed: BridgeDelivery[] } {
  const pushed: BridgeDelivery[] = [];
  return { pushed, takes: [], abort: null, reset: null, push: (delivery) => { pushed.push(delivery); }, close: () => undefined };
}

/** Attach and remember the link, so afterEach can detach exactly what this test held. */
function attach(key: string, link: AgentLink): void {
  attachLink(key, link);
  held.push({ key, link });
}

/** A live agent addressable by id and by name, so the registry can canonicalize either. */
function liveAgent(name: string): string {
  const key = mintAgentId();
  seedAgent(key, { name }, directory);
  seedStatus(directory, key, { agent: "pi", pid: process.pid });
  return key;
}

const delivery: BridgeDelivery = { id: "row-1", message: { action: "steer", text: "hello" } };

function attachLink(key: string, link: AgentLink): void {
  daemonAttachBridge(directory, key, link);
}

function detachLink(key: string, link: AgentLink): void {
  daemonDetachBridge(directory, key, link);
}

function linkAttached(key: string): boolean {
  return daemonLinkAttached(key);
}

function pushToLink(key: string, value: BridgeDelivery): void {
  daemonPushToBridge(placeHere(directory, key), value);
}

beforeEach(() => {
  directory = tempOrchDir("orch-agent-links-");
  process.env.ORCH_DIR = directory;
});

afterEach(() => {
  for (const { key, link } of held.splice(0)) detachLink(key, link);
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  removeTempDir(directory);
});

describe("bridge links", () => {
  test("attach holds the link under the canonical key and push reaches it", () => {
    const key = liveAgent("worker-a");
    const link = recordingLink();
    attach("worker-a", link);
    expect(linkAttached(key)).toBe(true);
    expect(attachedBridgeKeys()).toEqual([key]);
    pushToLink(key, delivery);
    expect(link.pushed).toEqual([delivery]);
  });

  test("a second attach for the same key replaces the first", () => {
    const key = liveAgent("worker-b");
    const first = recordingLink();
    const second = recordingLink();
    attach(key, first);
    attach("worker-b", second);
    pushToLink(key, delivery);
    expect(first.pushed).toEqual([]);
    expect(second.pushed).toEqual([delivery]);
  });

  test("detach removes only the link still held", () => {
    const key = liveAgent("worker-c");
    const stale = recordingLink();
    const current = recordingLink();
    attach(key, stale);
    attach(key, current);
    detachLink(key, stale);
    expect(linkAttached(key)).toBe(true);
    detachLink(key, current);
    expect(linkAttached(key)).toBe(false);
  });

  test("push with no link throws LinkDetachedError", () => {
    const key = liveAgent("worker-d");
    let thrown: unknown;
    try {
      pushToLink(key, delivery);
    } catch (error) {
      thrown = error;
    }
    expect(isLinkDetached(thrown)).toBe(true);
    expect(thrown).toBeInstanceOf(LinkDetachedError);
  });

  test("an unknown target is refused before the registry is consulted", () => {
    expect(() => attachLink("nobody", recordingLink())).toThrow("does not resolve");
  });
});

describe("bridge message guards", () => {
  test("accept every action shape", () => {
    expect(isBridgeMessage({ action: "dispatch", text: "t" })).toBe(true);
    expect(isBridgeMessage({ action: "steer", text: "t" })).toBe(true);
    expect(isBridgeMessage({ action: "answer", text: "t", questionId: "q", optionId: null })).toBe(true);
    expect(isBridgeMessage({ action: "model", model: "m" })).toBe(true);
  });

  test("refuse a missing field, an unknown action, and a non-record", () => {
    expect(isBridgeMessage({ action: "dispatch" })).toBe(false);
    expect(isBridgeMessage({ action: "answer", text: "t" })).toBe(false);
    expect(isBridgeMessage({ action: "answer", text: "t", questionId: "q" })).toBe(false);
    expect(isBridgeMessage({ action: "answer", text: "t", questionId: "q", optionId: 1 })).toBe(false);
    expect(isBridgeMessage({ action: "answer", text: "t", questionId: "q", optionId: "allow" })).toBe(true);
    expect(isBridgeMessage({ action: "on_done", text: "t" })).toBe(false);
    expect(isBridgeMessage("dispatch")).toBe(false);
  });

  test("a delivery is an id plus a message", () => {
    expect(isBridgeDelivery(delivery)).toBe(true);
    expect(isBridgeDelivery({ id: 1, message: delivery.message })).toBe(false);
    expect(isBridgeDelivery({ id: "row", message: { action: "model" } })).toBe(false);
  });
});
