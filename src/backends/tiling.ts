import type { BackendGroupLayout, BackendRect, BackendSplit, GroupLayoutRole, TileFirstSplit, TilePlacement } from "../types/backend.ts";

/** A terminal cell is about twice as tall as it is wide, so geometry is compared
 *  in cell-widths: a pane looks square when its columns double its rows. */
const CELL_ASPECT = 2;

/** One pane of a group layout, as the port reports it. */
type LayoutPane = BackendGroupLayout["panes"][number];

function visualHeight(rect: BackendRect): number {
  return rect.height * CELL_ASPECT;
}

function visualArea(rect: BackendRect): number {
  return rect.width * visualHeight(rect);
}

/** The split a tab opens with, or null when the policy defers to pane shape. */
function openingSplit(policy: TileFirstSplit): BackendSplit | null {
  if (policy === "rows") return "down";
  return policy === "columns" ? "right" : null;
}

/** Halve the pane's longer visual side so both halves come out nearer square. */
function halvingSplit(rect: BackendRect): BackendSplit {
  return rect.width > visualHeight(rect) ? "right" : "down";
}

/** Biggest pane first, then top-most, left-most, then by handle — a total order,
 *  so equal-sized panes never let enumeration order decide the grid. */
function biggestFirst(a: LayoutPane, b: LayoutPane): number {
  return visualArea(b.rect) - visualArea(a.rect)
    || a.rect.y - b.rect.y
    || a.rect.x - b.rect.x
    || String(a.handle).localeCompare(String(b.handle));
}

/** Split the group's biggest pane across its longer visual side, once the tab's
 *  opening split has been spent. Reading the whole group means the same pane
 *  count yields the same grid whatever pane the caller started from, on any plexer. */
export function planTilePlacement(layout: BackendGroupLayout, policy: TileFirstSplit): TilePlacement {
  const biggest = [...layout.panes].sort(biggestFirst)[0];
  if (!biggest) return openingPlacement(policy);
  if (layout.panes.length === 1) return { targetPane: biggest.handle, split: openingSplit(policy) ?? halvingSplit(biggest.rect) };
  return { targetPane: biggest.handle, split: halvingSplit(biggest.rect) };
}

/** Where an agent goes when there is no geometry to plan against: the policy's
 *  own opening split, or a column when it has none to state. */
export function openingPlacement(policy: TileFirstSplit): TilePlacement {
  return { split: openingSplit(policy) ?? "right" };
}

/** Group geometry, or null when the backend cannot report it. */
export function readGroupLayout(role: GroupLayoutRole, group: string): BackendGroupLayout {
  return role.read(group);
}

/** Placement for the next agent in a group; a backend with no geometry to read
 *  falls back to the policy's opening split. */
export function nextTilePlacement(role: GroupLayoutRole, group: string, policy: TileFirstSplit): TilePlacement {
  return planTilePlacement(readGroupLayout(role, group), policy);
}
