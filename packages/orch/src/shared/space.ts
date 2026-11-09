// Space rules over data already in hand: no store read, safe for the CLI and orchd alike.
import type { SpaceResolver } from "../types/policy.ts";
import type { AgentView } from "../types/store.ts";

/** The space of an agent id, answered from a fleet already in hand. */
export type SpaceLookup = (id: string | null | undefined) => string | null;

/** An agent's space over the composed fleet: no store read per id. */
export function spaceOfIn(views: ReadonlyMap<string, AgentView>): SpaceLookup {
  return (id) => (id === null || id === undefined ? null : views.get(id)?.environment.space ?? null);
}

/** Resolve a raw space id without coupling policy to config or a plexer. */
export function spaceName(id: string | null | undefined, resolver: SpaceResolver): string | null {
  if (id === null || id === undefined) return null;
  const resolved = typeof resolver === "function"
    ? resolver(id)
    : Object.prototype.hasOwnProperty.call(resolver, id) ? resolver[id] : undefined;
  return typeof resolved === "string" && resolved.length > 0 ? resolved : id;
}

/** Space identity matches only when both keys carry the same space. */
export function sameSpace(a: string | null | undefined, b: string | null | undefined): boolean {
  return a !== null && a !== undefined && b !== null && b !== undefined && a === b;
}

/**
 * The wall, for every listing: an agent placed in a space never sees past it, and
 * no flag widens it. A ceiling of null is the human at a raw terminal — orch minted
 * them no id, so they sit in no space and the wall has nothing to stand on.
 *
 * `orch status` and `orch events` both ask this, and two copies of it disagreed:
 * status let the human through and events matched spaces both ways, which silenced
 * the human's stream entirely.
 */
export function withinSpaceCeiling(agentSpace: string | null | undefined, ceiling: string | null): boolean {
  return ceiling === null || sameSpace(agentSpace, ceiling);
}

/** Scope items to the caller's space unless explicitly unscoped. */
export function scopeToSpace<T>(
  spaceOfKey: SpaceLookup,
  items: T[],
  keyOf: (item: T) => string | null,
  currentSpace: string | null,
  opts: { all: boolean },
): T[] {
  if (opts.all || currentSpace === null) return items;
  return items.filter((item) => sameSpace(spaceOfKey(keyOf(item)), currentSpace));
}
