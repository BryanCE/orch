import type { Backend, BackendGroupLayout, BackendHandle, BackendRect, BackendSplit } from "./backend.ts";

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

/**
 * How a tab's FIRST split runs, from `tiling.first_split` in settings.json.
 * Every split after it halves the biggest pane's longer visual side whichever
 * one is set — the opening split is all that differs, and it is what decides
 * whether four agents land as a 2x2 grid or as four of one shape.
 *
 * - `rows` stacks: the new pane goes under the old one (a horizontal divider).
 * - `columns` sits side by side (a vertical divider).
 * - `longest-edge` lets the tab's own shape pick, which on a wide monitor keeps
 *   choosing columns until the fleet is a row of thin strips.
 */
export const TILE_FIRST_SPLITS = ["rows", "columns", "longest-edge"] as const;
export type TileFirstSplit = (typeof TILE_FIRST_SPLITS)[number];

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

/** Where the next agent lands in a group. */
export interface TilePlacement {
  /** Pane to split. Absent on a single-pane group, where every backend's own
   *  default already splits the one pane there is. */
  readonly targetPane?: BackendHandle;
  readonly split: BackendSplit;
}

/** Split the group's biggest pane across its longer visual side, once the tab's
 *  opening split has been spent. Reading the whole group means the same pane
 *  count yields the same grid whatever pane the caller started from, on any plexer. */
export function planTilePlacement(layout: BackendGroupLayout, policy: TileFirstSplit): TilePlacement {
  const biggest = [...layout.panes].sort(biggestFirst)[0];
  if (!biggest) return openingPlacement(policy);
  if (layout.panes.length === 1) return { split: openingSplit(policy) ?? halvingSplit(biggest.rect) };
  return { targetPane: biggest.handle, split: halvingSplit(biggest.rect) };
}

/** Where an agent goes when there is no geometry to plan against: the policy's
 *  own opening split, or a column when it has none to state. */
export function openingPlacement(policy: TileFirstSplit): TilePlacement {
  return { split: openingSplit(policy) ?? "right" };
}

/** Group geometry, or null when the backend cannot report it. */
export function readGroupLayout(backend: Backend, group: string): BackendGroupLayout | null {
  return backend.groupLayout?.read(group) ?? null;
}

/** Placement for the next agent in a group; a backend with no geometry to read
 *  falls back to the policy's opening split. */
export function nextTilePlacement(backend: Backend, group: string, policy: TileFirstSplit): TilePlacement {
  const layout = readGroupLayout(backend, group);
  return layout ? planTilePlacement(layout, policy) : openingPlacement(policy);
}
