import { spaceName } from "./space.ts";
import type { AgentView } from "../types/store.ts";
import type { PresenceEntry } from "../types/presence.ts";
import type { OrchSettings } from "../types/settings.ts";

export interface CapacityRoot {
  readonly id: string;
  readonly name: string;
}

/** One pack: every live agent under one root, measured against the per-pack cap. */
export interface CapacityPack {
  readonly root: CapacityRoot;
  readonly used: number;
  readonly cap: number;
}

export interface CapacitySpace {
  readonly name: string;
  readonly used: number;
  readonly cap: number | null;
}

export interface FleetCapacity {
  /** The packs in scope: one when a root or space was selected, every root on the machine otherwise. */
  readonly packs: readonly CapacityPack[];
  readonly spaces: readonly CapacitySpace[];
  readonly total: { readonly used: number; readonly cap: number | null };
}

/** The whole fleet's capacity plus each pack's live members by space (null = no space). */
export interface HeldCapacity extends FleetCapacity {
  readonly membersBySpace: ReadonlyMap<string, ReadonlyMap<string | null, number>>;
}

/** Live members across every pack in scope. */
export function packsUsed(capacity: FleetCapacity): number {
  return capacity.packs.reduce((used, pack) => used + pack.used, 0);
}

type CapacitySettings = Pick<OrchSettings, "fleet"> & Partial<Pick<OrchSettings, "spaces">>;

/** Views whose agents are alive per presence, used by spawn admission and capacity reporting. */
function presenceAliveViews(
  views: ReadonlyMap<string, AgentView>,
  presence: ReadonlyMap<string, PresenceEntry>,
): readonly AgentView[] {
  return [...views.values()].filter((view) => presence.get(view.id)?.alive === true);
}

/** Live agents grouped by orch space. Agents without a space are not in a space. */
export function liveSpawnCounts(
  views: ReadonlyMap<string, AgentView>,
  presence: ReadonlyMap<string, PresenceEntry>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const view of presenceAliveViews(views, presence)) {
    const space = view.environment.space;
    if (space === null) continue;
    counts.set(space, (counts.get(space) ?? 0) + 1);
  }
  return counts;
}

function rootAgent(view: AgentView, views: ReadonlyMap<string, AgentView>): CapacityRoot {
  const declared = views.get(view.rootAgentId);
  if (declared) return { id: declared.id, name: declared.name };

  const seen = new Set<string>([view.id]);
  let current = view;
  while (current.spawnedBy !== null && !seen.has(current.spawnedBy)) {
    seen.add(current.spawnedBy);
    const parent = views.get(current.spawnedBy);
    if (!parent) break;
    current = parent;
  }
  return { id: view.rootAgentId, name: current.id === view.id ? view.name : current.name };
}

/** Every pack on the machine, from views and presence, without process or filesystem reads. */
export function fleetCapacity(
  views: ReadonlyMap<string, AgentView>,
  presence: ReadonlyMap<string, PresenceEntry>,
  settings: CapacitySettings,
): HeldCapacity {
  const live = presenceAliveViews(views, presence);
  const cap = settings.fleet.max_agents_per_pack;
  const packsByRoot = new Map<string, CapacityPack>();
  const membersBySpace = new Map<string, Map<string | null, number>>();
  for (const view of live) {
    const root = rootAgent(view, views);
    const used = (packsByRoot.get(root.id)?.used ?? 0) + 1;
    packsByRoot.set(root.id, { root, used, cap });
    const bySpace = membersBySpace.get(root.id) ?? new Map<string | null, number>();
    bySpace.set(view.environment.space, (bySpace.get(view.environment.space) ?? 0) + 1);
    membersBySpace.set(root.id, bySpace);
  }
  const spaces = [...liveSpawnCounts(views, presence).entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, used]) => ({
      name: spaceName(id, settings.spaces ?? {}) ?? id,
      used,
      cap: settings.fleet.max_agents_per_space[id] ?? null,
    }));
  const packs = [...packsByRoot.values()].sort((left, right) => left.root.id.localeCompare(right.root.id));
  return { packs, spaces, total: { used: live.length, cap: settings.fleet.max_agents_total ?? null }, membersBySpace };
}

export interface CapacityScope {
  readonly packRootId?: string | null;
  readonly packSpace?: string | null;
}

/** The packs in scope: one root, the roots with members in one space, or every root. Spaces and total are fleet-wide. */
export function scopeCapacity(held: HeldCapacity, scope: CapacityScope): FleetCapacity {
  const { packs, spaces, total } = held;
  if (scope.packRootId !== undefined && scope.packRootId !== null) {
    return { packs: packs.filter((pack) => pack.root.id === scope.packRootId), spaces, total };
  }
  if (scope.packSpace === undefined) return { packs, spaces, total };
  const inSpace = packs.flatMap((pack) => {
    const used = held.membersBySpace.get(pack.root.id)?.get(scope.packSpace ?? null) ?? 0;
    return used === 0 ? [] : [{ ...pack, used }];
  });
  return { packs: inSpace, spaces, total };
}

/** Compute fleet usage without reading process or filesystem state. */
export function computeFleetCapacity(
  views: ReadonlyMap<string, AgentView>,
  presence: ReadonlyMap<string, PresenceEntry>,
  settings: CapacitySettings,
  options: CapacityScope = {},
): FleetCapacity {
  return scopeCapacity(fleetCapacity(views, presence, settings), options);
}

/** Render the compact capacity summary used by command output: one entry per pack, the caller's first. */
export function formatCapacityLine(capacity: FleetCapacity, selfId: string | undefined): string {
  const packs = [...capacity.packs];
  packs.sort((left, right) => {
    const leftSelf = left.root.id === selfId;
    const rightSelf = right.root.id === selfId;
    if (leftSelf !== rightSelf) return leftSelf ? -1 : 1;
    return left.root.id.localeCompare(right.root.id);
  });
  const packLines = packs.map((pack) => `pack ${pack.root.id === selfId ? "you" : pack.root.name} ${pack.used}/${pack.cap}`);
  const spaces = capacity.spaces.map((entry) => `space ${entry.name} ${entry.used}/${entry.cap ?? "unlimited"}`);
  const total = `machine ${capacity.total.used}/${capacity.total.cap ?? "unlimited"}`;
  return [...packLines, ...spaces, total].join(" - ");
}
