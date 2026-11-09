import type { OrchDir } from "../types/core.ts";
import { loadPresence } from "../presence/store.ts";
import { agentView, agentViews } from "../store/agent-view.ts";
import { notDead } from "../types/presence.ts";
import { hereAgentIfAny } from "../process-place.ts";

/**
 * Resolve any spelling of a target to the one canonical identity key.
 *
 * An agent is addressable three ways — its id, its mutable name, or its
 * environment's handle for the pane it happens to occupy. Only the first is
 * identity; the other two are looked up through the composer, never parsed out
 * of the key, because both of them move.
 *
 * A dead agent still resolves (close and cleanup need it), but a live one wins:
 * reusing a name whose previous holder exited must never be ambiguous.
 *
 * This lives beside the control plane rather than in `shared/agent-id.ts`
 * because resolving a target is a LOOKUP over presence and the agent views, not
 * part of the id vocabulary. Keeping it there made `identity.ts` import
 * `presence/store.ts`, which imports `identity.ts` straight back — an
 * initialization cycle around the one module everything else parses ids with.
 */
export function normalizeControlTarget(orchDir: OrchDir, target: string): string {
  if (typeof target !== "string" || target.trim().length === 0) {
    throw new Error(`control target must be a non-empty string: ${JSON.stringify(target)}`);
  }

  // The id itself is the common spelling and is one lookup in the held fleet.
  if (agentView(orchDir, target) !== null) return target;

  // A pane handle addresses only an agent here: a handle names a pane in a plexer on this
  // machine, and an agent on another host has none here.
  const matches = agentViews(orchDir).filter((view) =>
    view.name === target || (view.environment.handle === target && hereAgentIfAny(orchDir, view.id) !== null));

  const presence = loadPresence(orchDir);
  const live = matches.filter((view) => notDead(presence.get(view.id)));
  const resolved = live.length > 0 ? live : matches;
  const keys = new Set(resolved.map((view) => view.id));

  if (keys.size === 1) return [...keys][0]!;
  if (keys.size > 1) throw new Error(`control target ${target} is ambiguous: ${[...keys].join(", ")}`);
  throw new Error(`control target ${target} does not resolve to a presence identity`);
}
