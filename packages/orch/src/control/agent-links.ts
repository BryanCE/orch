import type { OrchDir } from "../types/core.ts";
import type { BridgeAction, BridgeDelivery } from "../shared/bridge-message.ts";
import type { HereAgent } from "../types/agent-place.ts";
import { normalizeControlTarget } from "./normalize-target.ts";

/** One live link orchd can push a delivery down to an agent: a bridge's connection, or an ACP session orchd holds. */
export interface AgentLink {
  readonly takes: readonly BridgeAction[];
  push(delivery: BridgeDelivery): void;
  /** Aborts the agent's current turn, null when the link cannot. */
  readonly abort: (() => void) | null;
  /** End the link. Whoever owns it attaches again. */
  close(): void;
}

/** No link is held for the key: the row stays open and the drain retries. */
export class LinkDetachedError extends Error {
  constructor(key: string) {
    super(`no link for ${key}`);
    this.name = "LinkDetachedError";
  }
}

export function isLinkDetached(error: unknown): error is LinkDetachedError {
  return error instanceof LinkDetachedError;
}

/** Daemon-only registry: canonical target key to the link held for that agent. */
const links = new Map<string, AgentLink>();

/** Replace any link held for the key: a restarted bridge wins over the one it replaced. */
export function attachLink(orchDir: OrchDir, key: string, link: AgentLink): void {
  links.set(normalizeControlTarget(orchDir, key), link);
}

/** Remove the link only if it is still the one held, so a stale close never drops a newer attach. */
export function detachLink(orchDir: OrchDir, key: string, link: AgentLink): void {
  const canonical = normalizeControlTarget(orchDir, key);
  if (links.get(canonical) === link) links.delete(canonical);
}

/** Whether a bridge holds a link for this canonical key. A key no bridge holds,
 *  including one that names no agent, is simply not attached; nothing resolves
 *  and nothing throws. */
export function linkAttached(key: string): boolean {
  return links.has(key);
}

/** Read the attached link for an agent this orchd runs, or null when detached. */
export function attachedLink(agent: HereAgent): AgentLink | null {
  return links.get(agent.id) ?? null;
}

/** Push down the link the bridge of an agent this orchd runs holds. Throws
 *  LinkDetachedError when no link is held. */
export function pushToLink(agent: HereAgent, delivery: BridgeDelivery): void {
  const link = links.get(agent.id);
  if (link === undefined) throw new LinkDetachedError(agent.id);
  link.push(delivery);
}

/** Close every link, so each bridge attaches again to what orchd holds now. Answers how many closed. */
export function dropLinks(): number {
  const held = [...links.values()];
  links.clear();
  for (const link of held) link.close();
  return held.length;
}

export function attachedBridgeKeys(): readonly string[] {
  return [...links.keys()];
}
