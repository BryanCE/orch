import type { BackendGroupLayout, GroupLayoutRole, TileFirstSplit, TilePlacement } from "../types/backend.ts";
import { planTilePlacement } from "../shared/tiling.ts";

/** Group geometry, or null when the backend cannot report it. */
export function readGroupLayout(role: GroupLayoutRole, group: string): BackendGroupLayout {
  return role.read(group);
}

/** Placement for the next agent in a group; a backend with no geometry to read
 *  falls back to the policy's opening split. */
export function nextTilePlacement(role: GroupLayoutRole, group: string, policy: TileFirstSplit): TilePlacement {
  return planTilePlacement(readGroupLayout(role, group), policy);
}
