// Fleet types shared by the god-view, sidebar, and space detail. Data comes
// from the real daemon via getFleet (src/server/orch.ts) — NO mock source.
//
// The row shape below is the subset of orchd's one status row this UI consumes.
// There is exactly one shape (Rule 8): no legacy coordinate fields, no second
// spelling of a field the daemon already sends.

/**
 * Where an agent is, reduced to what a renderer may show. A pane is a plexer
 * COORDINATE orch stores and hands back — it is never a name and never a bucket.
 * Its absence means "no shortcut to watch this agent", never "unreachable":
 * delivery is orch's own inbox mechanism and needs no screen.
 */
export interface AgentEnvironment {
  pane: string | null;
}

export interface FleetLease {
  holderId: string;
  holderName: string;
  holderAlive: boolean;
}

/** The daemon's status row, narrowed to the fields this UI reads. */
export interface FleetProjectionRow {
  key: string;
  /** Orch's minted id. Opaque: routing and keying only, never a display name. */
  agentId?: string | null;
  /** The plexer's coordinate for this agent's pane, when it has one. */
  paneId: string | null;
  /** The name orch holds for this agent. Spawning requires one (C4e). */
  name: string | null;
  state: string;
  exited: boolean;
  model: string;
  lastText: string | null;
  cost: number;
  ctxPercent: number | null;
  tokens: unknown;
  lease: FleetLease | null;
  leaseKnown: boolean;
  /** Orch's own grouping. A space is user-created and always carries a name;
   *  a row with no `spaceName` is in no space, whatever coordinate `spaceId` holds. */
  spaceId?: string | null;
  spaceName?: string | null;
  /** Immutable provenance: the agent that spawned this one, and its name. */
  spawnedBy?: string | null;
  spawnedByLabel?: string | null;
}

export interface FleetAgent {
  key: string;
  /** Orch's opaque identity; never a plexer coordinate and never used as a display name. */
  id: string | null;
  environment: AgentEnvironment;
  name: string;
  state: string;
  model?: { provider?: string; id?: string };
  currentFile?: string;
  lastText?: string;
  cost?: number;
  tokens?: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number };
  context?: { percent?: number };
  alive: boolean;
  lease: FleetLease | null;
  leaseKnown: boolean;
}

/** One rendered group of agents — a space in the live view, a spawner in history. */
export interface AgentGroup {
  id: string;
  name: string;
  slug: string;
  agents: FleetAgent[];
}

/** The live view's grouping is orch's space; "workspace" is a plexer's word (adr/0001). */
export type Space = AgentGroup;

/** Shown when an agent is in no space of the user's. Not a place — a missing value. */
const UNSCOPED_ID = "unscoped";
const UNSCOPED_NAME = "No space";
/** Shown for an ended agent that reported no spawner (a self-registered session). */
const UNSPAWNED_ID = "unspawned";
const UNSPAWNED_NAME = "No spawner";
/** A spawner orch known only by its id: an id is not a name, so it is not printed as one. */
const UNNAMED_SPAWNER = "Unnamed orch";

function trimmed(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

function environmentFor(row: FleetProjectionRow): AgentEnvironment {
  return { pane: row.paneId };
}

function numberField(value: object, key: string): number | undefined {
  const item: unknown = Reflect.get(value, key);
  return typeof item === "number" ? item : undefined;
}

function tokenFields(value: unknown): FleetAgent["tokens"] | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const fields: NonNullable<FleetAgent["tokens"]> = {};
  const keys: readonly ("input" | "output" | "cacheRead" | "cacheWrite")[] = ["input", "output", "cacheRead", "cacheWrite"];
  for (const key of keys) {
    const item = numberField(value, key);
    if (item !== undefined) fields[key] = item;
  }
  return fields;
}

function projectAgent(row: FleetProjectionRow): FleetAgent {
  const tokens = tokenFields(row.tokens);
  return {
    key: row.key,
    id: row.agentId ?? null,
    environment: environmentFor(row),
    // orch names its agents; falling back to the minted id is the last resort,
    // and a plexer coordinate is never a candidate (adr/0001).
    name: trimmed(row.name) ?? row.agentId ?? "unnamed",
    state: row.state,
    ...(row.model ? { model: { id: row.model } } : {}),
    ...(row.lastText ? { lastText: row.lastText } : {}),
    cost: row.cost,
    ...(tokens ? { tokens } : {}),
    ...(row.ctxPercent !== null ? { context: { percent: row.ctxPercent } } : {}),
    alive: !row.exited,
    lease: row.lease ?? null,
    leaseKnown: row.leaseKnown,
  };
}

/**
 * Live work is grouped by orch's own space. A space is user-created and named;
 * when orch reports no space NAME the agent is in no space, and it is filed
 * under that fact — never under the plexer coordinate `spaceId` may be carrying,
 * which is exactly how `wF` once got printed as a name the user had chosen.
 */
function liveGroup(row: FleetProjectionRow): { id: string; name: string } {
  const name = trimmed(row.spaceName);
  if (name === null) return { id: UNSCOPED_ID, name: UNSCOPED_NAME };
  return { id: trimmed(row.spaceId) ?? name, name };
}

/**
 * History is grouped by immutable provenance — the agent that spawned each
 * record — never by a lease, which moves (C7).
 */
function historyGroup(row: FleetProjectionRow): { id: string; name: string } {
  const spawner = trimmed(row.spawnedBy);
  if (spawner === null) return { id: UNSPAWNED_ID, name: UNSPAWNED_NAME };
  return { id: spawner, name: trimmed(row.spawnedByLabel) ?? UNNAMED_SPAWNER };
}

function groupedRows(
  rows: readonly FleetProjectionRow[],
  historical: boolean,
  groupFor: (row: FleetProjectionRow) => { id: string; name: string },
): AgentGroup[] {
  const groups = new Map<string, AgentGroup>();
  for (const row of rows) {
    if (row.exited !== historical) continue;
    const { id, name } = groupFor(row);
    const group = groups.get(id) ?? { id, name, slug: id, agents: [] };
    group.agents.push(projectAgent(row));
    groups.set(id, group);
  }
  return [...groups.values()];
}

export function projectFleet(rows: readonly FleetProjectionRow[]): Space[] {
  return groupedRows(rows, false, liveGroup);
}

export function projectHistory(rows: readonly FleetProjectionRow[]): AgentGroup[] {
  return groupedRows(rows, true, historyGroup);
}

/** Keep unleased work out of the live list so it is visibly adoptable/reapable. */
export function partitionAgents(agents: readonly FleetAgent[]): [FleetAgent[], FleetAgent[]] {
  const live: FleetAgent[] = [];
  const orphans: FleetAgent[] = [];
  for (const agent of agents) {
    // A null lease means no orch is driving this agent. leaseKnown only tells us
    // whether the daemon had a corresponding registry row; it must not hide
    // presence-only agents from the adoptable bucket.
    if (agent.lease === null) orphans.push(agent);
    else live.push(agent);
  }
  return [live, orphans];
}

export function findSpace(list: readonly Space[], slug: string): Space | undefined {
  return list.find((space) => space.slug === slug);
}

export function stateGlow(state: string): string {
  switch (state) {
    case "working": return "border-chart-2 shadow-[0_0_28px_-2px_var(--color-chart-2)]";
    case "review":
    case "blocked": return "border-chart-4 shadow-[0_0_28px_-2px_var(--color-chart-4)]";
    case "done": return "border-primary shadow-[0_0_28px_-2px_var(--color-primary)]";
    case "error":
    case "aborted": return "border-destructive shadow-[0_0_28px_-2px_var(--color-destructive)]";
    default: return "border-foreground/40 shadow-[0_0_22px_-4px_var(--color-foreground)]";
  }
}

export function stateColor(state: string): string {
  switch (state) {
    case "working": return "text-chart-2";
    case "review":
    case "blocked": return "text-chart-4";
    case "done": return "text-primary";
    case "error":
    case "aborted": return "text-destructive";
    default: return "text-muted-foreground";
  }
}
