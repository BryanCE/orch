import { tryParseIdentity } from "../backends/identity.ts";

export interface WallDecision {
  allowed: boolean;
  reason?: string;
}

export function workspaceOf(id: string | null | undefined): string | null {
  return tryParseIdentity(id)?.workspace ?? null;
}

export type WorkspaceResolver =
  | Readonly<Record<string, string>>
  | ((id: string) => string | null | undefined);

/** Resolve a raw workspace id without coupling policy to config or herdr. */
export function workspaceName(id: string | null | undefined, resolver: WorkspaceResolver): string | null {
  if (id === null || id === undefined) return null;
  const resolved = typeof resolver === "function"
    ? resolver(id)
    : Object.prototype.hasOwnProperty.call(resolver, id) ? resolver[id] : undefined;
  return typeof resolved === "string" && resolved.length > 0 ? resolved : id;
}

/** Workspace identity matches only when both keys carry the same workspace. */
export function sameWorkspace(a: string | null | undefined, b: string | null | undefined): boolean {
  return a !== null && a !== undefined && b !== null && b !== undefined && a === b;
}

/** Decide whether a caller may cross the workspace wall. */
export function checkWall(
  ownKey: string | null | undefined,
  targetKey: string | null | undefined,
  opts: { crossWorkspace: boolean },
): WallDecision {
  const ownWorkspace = workspaceOf(ownKey);
  const targetWorkspace = workspaceOf(targetKey);

  // Unscoped actors and legacy/unscoped targets are eligible by policy.
  if (ownWorkspace === null || targetWorkspace === null) return { allowed: true };
  if (sameWorkspace(ownWorkspace, targetWorkspace)) return { allowed: true };
  if (opts.crossWorkspace === true) return { allowed: true };
  return {
    allowed: false,
    reason: `workspace wall: actor workspace ${ownWorkspace} cannot write to target workspace ${targetWorkspace} (${targetKey ?? "unknown"})`,
  };
}

/** Scope items to the caller's workspace unless explicitly unscoped. */
export function scopeToWorkspace<T>(
  items: T[],
  keyOf: (item: T) => string | null,
  currentWs: string | null,
  opts: { all: boolean },
): T[] {
  if (opts.all || currentWs === null) return items;
  return items.filter((item) => sameWorkspace(workspaceOf(keyOf(item)), currentWs));
}
