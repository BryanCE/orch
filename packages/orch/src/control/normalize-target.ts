import { loadPresence } from "../presence/store.ts";
import { orchDir } from "../presence/writer.ts";
import { agentViews } from "../store/agent-view.ts";

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
 * This lives beside the control plane rather than in `backends/identity.ts`
 * because resolving a target is a LOOKUP over presence and the agent views, not
 * part of the id vocabulary. Keeping it there made `identity.ts` import
 * `presence/store.ts`, which imports `identity.ts` straight back — an
 * initialization cycle around the one module everything else parses ids with.
 */
export function normalizeControlTarget(target: string): string {
  if (typeof target !== "string" || target.trim().length === 0) {
    throw new Error(`control target must be a non-empty string: ${JSON.stringify(target)}`);
  }

  const presence = loadPresence();
  if (presence.has(target)) return target;

  const matches = agentViews(orchDir()).filter((view) =>
    view.id === target || view.name === target || view.environment.handle === target);

  const live = matches.filter((view) => presence.get(view.id)?.alive);
  const resolved = live.length > 0 ? live : matches;
  const keys = new Set(resolved.map((view) => view.id));

  if (keys.size === 1) return [...keys][0]!;
  if (keys.size > 1) throw new Error(`control target ${target} is ambiguous: ${[...keys].join(", ")}`);

  // Not in the registry: an agent whose bridge stamped presence before its row
  // landed is still reachable through the pane id it reported.
  const stamped = [...presence].filter(([, entry]) => entry.status?.paneId === target).map(([key]) => key);
  if (stamped.length === 1) return stamped[0]!;
  if (stamped.length > 1) throw new Error(`control target ${target} is ambiguous: ${stamped.join(", ")}`);
  throw new Error(`control target ${target} does not resolve to a presence identity`);
}
