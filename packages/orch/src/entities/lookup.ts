import type { OrchDir, Recipient } from "../types/core.ts";
import { agentById } from "../store/agent-rows.ts";
import { spaceOf } from "../policy/space.ts";
import { abstractAgentLabel } from "../notify/format.ts";
import { agentViewIndex } from "../store/agent-view.ts";
import type { AgentView } from "../types/store.ts";
import type { PresenceEntry } from "../types/presence.ts";

/** Join a presence/pane key to its agent through the minted id alone. Reading
 *  the whole key as an identity is what made a MOVED agent look like a new one. */
export function viewForKey(views: ReadonlyMap<string, AgentView>, key: string): AgentView | undefined {
  return views.get(key);
}

/** The address that reaches an agent: the presence key it actually has, else
 *  its bare id. Never rebuilt from environment — an axis it happens to be
 *  missing must not silently rename it. */
export function addressOf(view: AgentView, presenceById: ReadonlyMap<string, PresenceEntry>): string {
  return presenceById.get(view.id)?.key ?? view.id;
}

export function indexPresenceById(presence: ReadonlyMap<string, PresenceEntry>): Map<string, PresenceEntry> {
  const byId = new Map<string, PresenceEntry>();
  for (const entry of presence.values()) {
    byId.set(entry.key, entry);
  }
  return byId;
}

/** Resolve an identity key to the agent an operator knows. */
export function normalizedAgentName(root: OrchDir, key: string): string | null {
  try { return agentById(root, key)?.name ?? null; } catch { return null; }
}

function recipientName(view: AgentView | undefined, space: string, key: string): string {
  return view?.label ?? view?.name ?? abstractAgentLabel(space, key);
}

export function recipientFor(root: OrchDir, key: string, views = agentViewIndex(root)): Recipient {
  const view = viewForKey(views, key);
  const space = view?.environment.space ?? spaceOf(root, key) ?? "space";
  return {
    name: recipientName(view, space, key),
    // The harness is the agent's own, never the plexer it happens to sit in.
    harness: view?.harnessId ?? null,
    multiplexer: view?.environment.plexer ?? null,
    // A missing handle is a missing shortcut, not an unreachable agent: orch's
    // own link is addressed by the key either way.
    transportId: view?.environment.handle ?? key,
  };
}
