import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { placementOf } from "../agent/registry.ts";

export interface WallDecision {
  allowed: boolean;
  reason?: string;
}

export function spaceOf(orchDir: string, id: string | null | undefined): string | null {
  if (id === null || id === undefined) return null;
  return placementOf(orchDir, id)?.space ?? null;
}

export type SpaceResolver =
  | Readonly<Record<string, string>>
  | ((id: string) => string | null | undefined);

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

/** The human operator of a space controls every agent keyed into it. */
export function operatorControls(
  orchDir: string,
  actor: string | null | undefined,
  agentKey: string | null | undefined,
  actorSpace: string | null | undefined,
  actorIsOperator: boolean,
): boolean {
  return actor !== null && actor !== undefined
    && actorIsOperator
    && sameSpace(actorSpace, spaceOf(orchDir, agentKey));
}

/**
 * The repo an agent's `cwd` sits in. A7: with no space set, THIS is the
 * reachability boundary — unspaced does not mean "reaches every agent on the
 * machine". A directory outside any repository is its own boundary, which is
 * the honest answer rather than widening to the filesystem.
 *
 * Walked rather than shelled out to `git rev-parse`: this runs on every peer
 * resolution, and a subprocess per check is not affordable there.
 */
function repoRootOf(cwd: string | null | undefined): string | null {
  if (cwd === null || cwd === undefined || cwd.length === 0) return null;
  let directory = resolve(cwd);
  for (;;) {
    if (existsSync(join(directory, ".git"))) return directory;
    const parent = dirname(directory);
    if (parent === directory) return resolve(cwd);
    directory = parent;
  }
}

function repoRootFor(orchDir: string, key: string | null | undefined): string | null {
  if (key === null || key === undefined) return null;
  return repoRootOf(placementOf(orchDir, key)?.cwd);
}

/** Decide whether a caller may cross the space wall. */
export function checkWall(
  orchDir: string,
  ownKey: string | null | undefined,
  targetKey: string | null | undefined,
  opts: { crossSpace: boolean },
): WallDecision {
  const ownSpace = spaceOf(orchDir, ownKey);
  const targetSpace = spaceOf(orchDir, targetKey);

  if (sameSpace(ownSpace, targetSpace)) return { allowed: true };
  if (opts.crossSpace) return { allowed: true };

  // A7: with no space on either side the boundary falls back to the repo root.
  // A space, once created, OUTRANKS it — creating one is the statement "these
  // belong together", and it is what widens the wall past a single repo.
  if (ownSpace === null && targetSpace === null) {
    const ownRepo = repoRootFor(orchDir, ownKey);
    const targetRepo = repoRootFor(orchDir, targetKey);
    if (ownRepo === null || targetRepo === null || ownRepo === targetRepo) return { allowed: true };
    return {
      allowed: false,
      reason: `space wall: no space is set, so the boundary is the repo root — ${ownRepo} cannot write to ${targetRepo} (${targetKey ?? "unknown"})`,
    };
  }

  // One side is in a space and the other is not: an unplaced target is eligible,
  // because nothing has said it belongs anywhere else.
  if (ownSpace === null || targetSpace === null) return { allowed: true };

  return {
    allowed: false,
    reason: `space wall: actor space ${ownSpace} cannot write to target space ${targetSpace} (${targetKey ?? "unknown"})`,
  };
}

/** Scope items to the caller's space unless explicitly unscoped. */
export function scopeToSpace<T>(
  orchDir: string,
  items: T[],
  keyOf: (item: T) => string | null,
  currentSpace: string | null,
  opts: { all: boolean },
): T[] {
  if (opts.all || currentSpace === null) return items;
  return items.filter((item) => sameSpace(spaceOf(orchDir, keyOf(item)), currentSpace));
}
