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

/** Halve the pane's longer visual side so both halves come out nearer square.
 *  A square pane splits down, which is what turns 4 agents into a 2x2 grid
 *  instead of four columns. */
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

/** Split the group's biggest pane across its longer visual side. Reading the
 *  whole group means the same pane count yields the same grid whatever pane the
 *  caller started from, on any plexer. */
export function planTilePlacement(layout: BackendGroupLayout): TilePlacement {
  const biggest = [...layout.panes].sort(biggestFirst)[0];
  if (!biggest) return { split: "right" };
  const split = halvingSplit(biggest.rect);
  return layout.panes.length === 1 ? { split } : { targetPane: biggest.handle, split };
}

/** Group geometry, or null when the backend cannot report it. */
export function readGroupLayout(backend: Backend, group: string): BackendGroupLayout | null {
  try {
    return backend.groupLayout?.(group) ?? null;
  } catch {
    return null;
  }
}

/** Placement for the next agent in a group; a backend with no geometry to read
 *  falls back to a right-split. */
export function nextTilePlacement(backend: Backend, group: string): TilePlacement {
  const layout = readGroupLayout(backend, group);
  return layout ? planTilePlacement(layout) : { split: "right" };
}
