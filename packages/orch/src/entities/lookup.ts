import type { Recipient } from "../types/core.ts";
import { abstractAgentLabel } from "../notify/format.ts";
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

function recipientName(view: AgentView | undefined, space: string, key: string): string {
  return view?.label ?? view?.name ?? abstractAgentLabel(space, key);
}

export function recipientOf(view: AgentView | undefined, space: string, key: string): Recipient {
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
