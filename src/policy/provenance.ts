import type { ProvenanceLookup } from "../types/policy.ts";

/**
 * The ONE walk up the provenance tree.
 *
 * Provenance (`spawnedBy`) is immutable (Rule 11), so an answer read off this
 * chain can never be changed by a lease moving or an agent changing environment.
 * Three copies of this loop used to live in the spawn policy (depth, then again
 * for the pack root of every agent) and in close authority (descendant check);
 * every question below is derived from this one traversal.
 *
 * Parent-first, root last. Cycle-safe. Stops at the first id the lookup does
 * not know — an unknown parent ends the chain rather than throwing, because a
 * self-registered orch may have no row of its own.
 */
export function ancestorsOf(lookup: ProvenanceLookup, id: string): readonly string[] {
  const chain: string[] = [];
  const seen = new Set<string>([id]);
  let parent = lookup(id)?.spawnedBy ?? null;
  while (parent !== null && !seen.has(parent)) {
    chain.push(parent);
    seen.add(parent);
    parent = lookup(parent)?.spawnedBy ?? null;
  }
  return chain;
}

/** Hops from `id` up to its root: a root is depth 0, its children depth 1. */
export function depthOf(lookup: ProvenanceLookup, id: string): number {
  return ancestorsOf(lookup, id).length;
}

/** True when `ancestorId` appears anywhere above `id`. Never true of `id` itself. */
export function isDescendantOf(lookup: ProvenanceLookup, id: string, ancestorId: string): boolean {
  return ancestorsOf(lookup, id).includes(ancestorId);
}
