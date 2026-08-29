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

/** Decide whether a caller may cross the space wall. */
export function checkWall(
  orchDir: string,
  ownKey: string | null | undefined,
  targetKey: string | null | undefined,
  opts: { crossSpace: boolean },
): WallDecision {
  const ownSpace = spaceOf(orchDir, ownKey);
  const targetSpace = spaceOf(orchDir, targetKey);

  // Unscoped actors and unplaced targets are eligible by policy.
  if (ownSpace === null || targetSpace === null) return { allowed: true };
  if (sameSpace(ownSpace, targetSpace)) return { allowed: true };
  if (opts.crossSpace) return { allowed: true };
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
