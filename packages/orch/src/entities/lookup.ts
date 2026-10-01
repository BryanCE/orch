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

export function indexPresenceById(presence: Iterable<PresenceEntry>): Map<string, PresenceEntry> {
  const byId = new Map<string, PresenceEntry>();
  for (const entry of presence) {
    byId.set(entry.key, entry);
  }
  return byId;
}

