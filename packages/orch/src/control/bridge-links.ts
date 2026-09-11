import type { BridgeDelivery } from "./bridge-message.ts";
import { normalizeControlTarget } from "./normalize-target.ts";

/** One live bridge connection the daemon can push a delivery down. */
export interface BridgeLink {
  push(delivery: BridgeDelivery): void;
}

/** No bridge holds a link for the key: the row stays open and the drain retries. */
export class BridgeDetachedError extends Error {
  readonly code = "BRIDGE_DETACHED";

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
export function attachBridge(key: string, link: BridgeLink): void {
  links.set(normalizeControlTarget(key), link);
}

/** Remove the link only if it is still the one held, so a stale close never drops a newer attach. */
export function detachBridge(key: string, link: BridgeLink): void {
  const canonical = normalizeControlTarget(key);
  if (links.get(canonical) === link) links.delete(canonical);
}

export function bridgeAttached(key: string): boolean {
  return links.has(normalizeControlTarget(key));
}

/** Throws BridgeDetachedError when no link is held. */
export function pushToBridge(key: string, delivery: BridgeDelivery): void {
  const canonical = normalizeControlTarget(key);
  const link = links.get(canonical);
  if (link === undefined) throw new BridgeDetachedError(canonical);
  link.push(delivery);
}

export function attachedBridgeKeys(): readonly string[] {
  return [...links.keys()];
}
