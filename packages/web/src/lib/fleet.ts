// Fleet types shared by the god-view, sidebar, and space detail. Data comes
// from the real daemon via getFleet (src/server/orch.ts) — NO mock source.
//
import type { LeasePayload, StatusRow } from "@orch/types/command.ts";
import type { FleetNames, FleetStatus } from "@orch/types/daemon.ts";
import type { TokenTotals } from "@orch/types/core.ts";
import { isAgentState, type AgentState } from "@orch/agent-state.ts";
import { modelShort } from "@orch/policy/thinking.ts";


/**
 * Where an agent is, reduced to what a renderer may show. A pane is a plexer
 * COORDINATE orch stores and hands back — it is never a name and never a bucket.
 * Its absence means "no shortcut to watch this agent", never "unreachable":
 * delivery is orchd's push down the agent's bridge link and needs no screen.
 */
export interface AgentEnvironment {
  pane: string | null;
}

export interface FleetAgent {
  key: string;
  /** Orch's opaque identity; never a plexer coordinate and never used as a display name. */
  id: string | null;
  environment: AgentEnvironment;
  name: string;
  state: AgentState;
  stateFallback: boolean;
  model?: { provider?: string; id?: string };
  modelShort?: string;
  lastText?: string;
  task?: string;
  dispatchId?: string;
  backendStatus?: string;
  bridgeAttached: boolean | null;
  cost?: number;
  tokens?: TokenTotals;
  context?: { percent?: number };
  alive: boolean;
  lease: LeasePayload | null;
  leaseKnown: boolean;
}

/** One rendered group of agents — a space in the live view, a spawner in history. */
export interface AgentGroup {
  id: string;
  name: string;
  slug: string;
  agents: FleetAgent[];
}

/** One orch's slice of a space: the agents it HOLDS right now. C7 - live views
 *  group by lease, so this level is keyed by the lease holder and by nothing
 *  else. Provenance never appears here; it is history's grouping. */
export type OrchGroup = AgentGroup;

/**
 * The live view's grouping is orch's space; a space is a plexer's word
 * (adr/0001). A space encompasses the orchs working in it, and each orch
 * encompasses the agents it holds — `agents` stays the flat membership of the
 * space so the lease level ADDS depth without hiding anything.
 */
export interface Space extends AgentGroup {
  orchs: OrchGroup[];
}

/** Shown when an agent is in no space of the user's. Not a place — a missing value. */
const UNSCOPED_ID = "unscoped";
const UNSCOPED_NAME = "unscoped";
/** Shown for an ended agent that reported no spawner (a self-registered session). */
const UNSPAWNED_ID = "unspawned";
const UNSPAWNED_NAME = "No spawner";
/** Held by no orch. Adoptable, never gone — orch does not invent a holder. */
const UNHELD_ID = "unheld";
const UNHELD_NAME = "unheld";
/** A spawner orch known only by its id: an id is not a name, so it is not printed as one. */
const UNNAMED_SPAWNER = "Unnamed orch";

function trimmed(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

function environmentFor(row: StatusRow): AgentEnvironment {
  return { pane: row.paneId };
}

function projectAgent(row: StatusRow): FleetAgent {
  const slash = row.model.indexOf("/");
  const model = slash === -1 ? { id: row.model } : { provider: row.model.slice(0, slash), id: row.model.slice(slash + 1) };
  const short = modelShort(row.model);
  return {
    key: row.key,
    id: row.agentId ?? null,
    environment: environmentFor(row),
    name: trimmed(row.name) ?? row.agentId ?? "unnamed",
    state: isAgentState(row.state) ? row.state : "unknown",
    stateFallback: row.stateFallback,
    ...(row.model ? { model } : {}),
    ...(short ? { modelShort: short } : {}),
    ...(row.lastText ? { lastText: row.lastText } : {}),
    ...(row.task ? { task: row.task } : {}),
    ...(row.dispatchId ? { dispatchId: row.dispatchId } : {}),
    ...(row.backendStatus ? { backendStatus: row.backendStatus } : {}),
    bridgeAttached: row.bridgeAttached,
    cost: row.cost,
    ...(row.tokens ? { tokens: row.tokens } : {}),
    ...(row.ctxPercent !== null ? { context: { percent: row.ctxPercent } } : {}),
    alive: row.alive,
    lease: row.lease,
    leaseKnown: row.leaseKnown,
  };
}

/**
 * Live work is grouped by orch's own space. A space is user-created and named;
 * when orch reports no space NAME the agent is in no space, and it is filed
 * under that fact — never under the plexer coordinate `spaceId` may be carrying,
 * which is exactly how `wF` once got printed as a name the user had chosen.
 */
function liveGroup(row: StatusRow, names: FleetNames): { id: string; name: string } {
  const id = trimmed(row.spaceId);
  const name = id === null ? null : trimmed(names.spaces[id]);
  if (id === null || name === null) return { id: UNSCOPED_ID, name: UNSCOPED_NAME };
  return { id, name };
}

/** A11: a pack is its provenance ROOT. Ownership never groups anything - a lease
 *  says who is driving right now, and a pack outlives every lease in it. */
function historyGroup(row: StatusRow, names: FleetNames): { id: string; name: string } {
  const root = trimmed(row.rootAgentId) ?? trimmed(row.spawnedBy);
  if (root === null) return { id: UNSPAWNED_ID, name: UNSPAWNED_NAME };
  return { id: root, name: trimmed(names.agents[root]) ?? UNNAMED_SPAWNER };
}

/** C7: inside a space, live work groups by its LEASE HOLDER. An unheld agent is
 *  filed as unheld — it is adoptable, not gone, and orch never invents a holder
 *  for it (Rule 11: work survives its spawner). */
function leaseGroup(row: StatusRow, names: FleetNames): { id: string; name: string } {
  const lease = row.lease;
  // A dead holder is not a holder (G9): it must not appear as an orch with a
  // fleet under it, or the view claims work is being driven when none is.
  if (lease === null || !lease.holderAlive) return { id: UNHELD_ID, name: UNHELD_NAME };
  return { id: lease.holderId, name: trimmed(names.agents[lease.holderId]) ?? lease.holderId };
}

function groupedRows(
  fleet: FleetStatus,
  historical: boolean,
  groupFor: (row: StatusRow, names: FleetNames) => { id: string; name: string },
): AgentGroup[] {
  const groups = new Map<string, AgentGroup>();
  for (const row of fleet.rows) {
    if (row.exited !== historical) continue;
    const { id, name } = groupFor(row, fleet.names);
    const group = groups.get(id) ?? { id, name, slug: id, agents: [] };
    group.agents.push(projectAgent(row));
    groups.set(id, group);
  }
  return [...groups.values()];
}

export function projectFleet(fleet: FleetStatus): Space[] {
  const spaces: Space[] = [];
  for (const group of groupedRows(fleet, false, liveGroup)) {
    const members = new Set(group.agents.map((agent) => agent.key));
    const orchs = groupedRows({ names: fleet.names, rows: fleet.rows.filter((row) => members.has(row.key)) }, false, leaseGroup);
    spaces.push({ ...group, orchs });
  }
  return spaces;
}

export function projectHistory(fleet: FleetStatus): AgentGroup[] {
  return groupedRows(fleet, true, historyGroup);
}

/**
 * Is any orch actually DRIVING this agent right now?
 *
 * G9: a lease whose holder process is gone is not ownership — it is a stale
 * row, and Rule 11 is explicit that a dead holder is not a collision. The CLI
 * has always said so ("no orch driving it (holder gone)"); this is the same
 * question asked in the same way, so the two surfaces cannot disagree.
 */
function isDriven(agent: FleetAgent): boolean {
  return agent.lease?.holderAlive === true;
}

/** Keep undriven work out of the live list so it is visibly adoptable/reapable. */
export function partitionAgents(agents: readonly FleetAgent[]): [FleetAgent[], FleetAgent[]] {
  const live: FleetAgent[] = [];
  const orphans: FleetAgent[] = [];
  for (const agent of agents) {
    // A null lease means no orch is driving this agent, and neither does a lease
    // whose holder has died. leaseKnown only tells us whether the daemon had a
    // corresponding registry row; it must not hide presence-only agents from the
    // adoptable bucket.
    if (isDriven(agent)) live.push(agent);
    else orphans.push(agent);
  }
  return [live, orphans];
}

export function findSpace(list: readonly Space[], slug: string): Space | undefined {
  return list.find((space) => space.slug === slug);
}

export function stateGlow(state: AgentState): string {
  switch (state) {
    case "idle": return "border-foreground/40 shadow-[0_0_22px_-4px_var(--color-foreground)]";
    case "working": return "border-chart-2 shadow-[0_0_28px_-2px_var(--color-chart-2)]";
    case "blocked": return "border-chart-4 shadow-[0_0_28px_-2px_var(--color-chart-4)]";
    case "waiting": return "border-chart-4 shadow-[0_0_28px_-2px_var(--color-chart-4)]";
    case "asking": return "border-destructive shadow-[0_0_28px_-2px_var(--color-destructive)]";
    case "done": return "border-primary shadow-[0_0_28px_-2px_var(--color-primary)]";
    case "error": return "border-destructive shadow-[0_0_28px_-2px_var(--color-destructive)]";
    case "aborted": return "border-destructive shadow-[0_0_28px_-2px_var(--color-destructive)]";
    case "exited": return "border-foreground/40 shadow-[0_0_22px_-4px_var(--color-foreground)]";
    case "unknown": return "border-foreground/40 shadow-[0_0_22px_-4px_var(--color-foreground)]";
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

export function stateColor(state: AgentState): string {
  switch (state) {
    case "idle": return "text-muted-foreground";
    case "working": return "text-chart-2";
    case "blocked": return "text-chart-4";
    case "waiting": return "text-chart-4";
    case "asking": return "text-destructive";
    case "done": return "text-primary";
    case "error": return "text-destructive";
    case "aborted": return "text-destructive";
    case "exited": return "text-muted-foreground";
    case "unknown": return "text-muted-foreground";
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}
