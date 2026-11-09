import type { OrchDir } from "../types/core.ts";
import type { BridgeDelivery } from "../shared/bridge-message.ts";
import type { HereAgent } from "../types/agent-place.ts";
import { normalizeControlTarget } from "./normalize-target.ts";

/** One live bridge connection the daemon can push a delivery down. */
export interface BridgeLink {
  push(delivery: BridgeDelivery): void;
  /** End the connection; the bridge redials and attaches again. */
  close(): void;
}

/** No bridge holds a link for the key: the row stays open and the drain retries. */
export class BridgeDetachedError extends Error {
  constructor(key: string) {
    super(`no bridge link for ${key}`);
    this.name = "BridgeDetachedError";
  }
}

export function isBridgeDetached(error: unknown): error is BridgeDetachedError {
  return error instanceof BridgeDetachedError;
}

/** Daemon-only registry: canonical target key → the link its bridge holds. */
const links = new Map<string, BridgeLink>();

/** Replace any link held for the key: a restarted bridge wins over the one it replaced. */
export function attachBridge(orchDir: OrchDir, key: string, link: BridgeLink): void {
  links.set(normalizeControlTarget(orchDir, key), link);
}

/** Remove the link only if it is still the one held, so a stale close never drops a newer attach. */
export function detachBridge(orchDir: OrchDir, key: string, link: BridgeLink): void {
  const canonical = normalizeControlTarget(orchDir, key);
  if (links.get(canonical) === link) links.delete(canonical);
}

/** Whether a bridge holds a link for this canonical key. A key no bridge holds,
 *  including one that names no agent, is simply not attached; nothing resolves
 *  and nothing throws. */
export function bridgeAttached(key: string): boolean {
  return links.has(key);
}

/** Push down the link the bridge of an agent this orchd runs holds. Throws
 *  BridgeDetachedError when no link is held. */
export function pushToBridge(agent: HereAgent, delivery: BridgeDelivery): void {
  const link = links.get(agent.id);
  if (link === undefined) throw new BridgeDetachedError(agent.id);
  link.push(delivery);
}

/** Close every link, so each bridge attaches again to what orchd holds now. Answers how many closed. */
export function dropBridges(): number {
  const held = [...links.values()];
  links.clear();
  for (const link of held) link.close();
  return held.length;
}

export function attachedBridgeKeys(): readonly string[] {
  return [...links.keys()];
}
