import { spaceName } from "./space.ts";
import type { AgentView } from "../types/store.ts";
import type { PresenceEntry } from "../types/presence.ts";
import type { OrchSettings } from "../types/settings.ts";

export interface CapacityHolder {
  readonly id: string;
  readonly name: string;
  readonly count: number;
}

export interface CapacityPack {
  readonly used: number;
  readonly cap: number | null;
  readonly holders: readonly CapacityHolder[];
}

export interface CapacitySpace {
  readonly name: string;
  readonly used: number;
  readonly cap: number | null;
}

export interface FleetCapacity {
  readonly pack: CapacityPack;
  readonly spaces: readonly CapacitySpace[];
  readonly total: { readonly used: number; readonly cap: number | null };
}

type CapacitySettings = Pick<OrchSettings, "fleet"> & Partial<Pick<OrchSettings, "spaces">>;

/** The one liveness join used by spawn admission and capacity reporting. */
export function liveAgentViews(
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
  for (const view of liveAgentViews(views, presence)) {
    const space = view.environment.space;
    if (space === null) continue;
    counts.set(space, (counts.get(space) ?? 0) + 1);
  }
  return counts;
}

function rootAgent(view: AgentView, views: ReadonlyMap<string, AgentView>): { id: string; name: string } {
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

function selectedPack(
  live: readonly AgentView[],
  views: ReadonlyMap<string, AgentView>,
  packRootId: string | null | undefined,
  packSpace: string | null | undefined,
): readonly AgentView[] {
  if (packRootId !== undefined && packRootId !== null) {
    return live.filter((view) => rootAgent(view, views).id === packRootId);
  }
  if (packSpace !== undefined) return live.filter((view) => view.environment.space === packSpace);
  return live;
}

/** Compute fleet usage without reading process or filesystem state. */
export function computeFleetCapacity(
  views: ReadonlyMap<string, AgentView>,
  presence: ReadonlyMap<string, PresenceEntry>,
  settings: CapacitySettings,
  options: { readonly packRootId?: string | null; readonly packSpace?: string | null } = {},
): FleetCapacity {
  const live = liveAgentViews(views, presence);
  const pack = selectedPack(live, views, options.packRootId, options.packSpace);
  const holderCounts = new Map<string, CapacityHolder>();
  for (const view of pack) {
    const root = rootAgent(view, views);
    const previous = holderCounts.get(root.id);
    holderCounts.set(root.id, { id: root.id, name: root.name, count: (previous?.count ?? 0) + 1 });
  }

  const spaces = [...liveSpawnCounts(views, presence).entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, used]) => ({
      name: spaceName(id, settings.spaces ?? {} ) ?? id,
      used,
      cap: settings.fleet.max_agents_per_space[id] ?? null,
    }));
  const holders = [...holderCounts.values()].sort((left, right) => left.id.localeCompare(right.id));
  return {
    pack: { used: pack.length, cap: settings.fleet.max_agents_per_pack, holders },
    spaces,
    total: { used: live.length, cap: settings.fleet.max_agents_total ?? null },
  };
}

/** Render the compact capacity summary used by command output. */
export function formatCapacityLine(capacity: FleetCapacity, selfId: string | undefined): string {
  const holders = [...capacity.pack.holders];
  holders.sort((left, right) => {
    const leftSelf = left.id === selfId;
    const rightSelf = right.id === selfId;
    if (leftSelf !== rightSelf) return leftSelf ? -1 : 1;
    return left.id.localeCompare(right.id);
  });
  const holderText = holders.map((holder) => `${holder.id === selfId ? "you" : holder.name} ${holder.count}`).join(", ");
  const pack = `pack ${capacity.pack.used}/${capacity.pack.cap ?? "unlimited"}${holderText ? ` (${holderText})` : ""}`;
  const spaces = capacity.spaces.map((entry) => `space ${entry.name} ${entry.used}/${entry.cap ?? "unlimited"}`);
  const total = `machine ${capacity.total.used}/${capacity.total.cap ?? "unlimited"}`;
  return [pack, ...spaces, total].join(" - ");
}
