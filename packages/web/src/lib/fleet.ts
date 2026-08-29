// Fleet types shared by the god-view, sidebar, and space detail. Data comes
// from the real daemon via getFleet (src/server/orch.ts) — NO mock source.

/** Composed environment facts safe for renderers: coordinates and answers, never provider ids. */
export interface AgentEnvironment {
  pane: string | null;
  home: string | null;
  answers: readonly string[];
}

export interface FleetLease {
  holderId: string;
  holderName: string;
  holderAlive: boolean;
}

export interface FleetProjectionRow {
  key: string;
  plexer?: string | null;
  environment?: { pane?: string | null; home?: string | null; answers?: readonly string[] } | null;
  agentId?: string | null;
  paneId: string | null;
  name: string | null;
  agent: string | null;
  /** Immutable provenance, supplied by orch for historical grouping. */
  spawnedBy?: string | null;
  spawnedByLabel?: string | null;
  state: string;
  exited: boolean;
  model: string;
  lastText: string | null;
  cost: number;
  ctxPercent: number | null;
  tokens: unknown;
  capabilities?: {
    panes?: boolean;
    focusable?: boolean;
    canSendKeys?: boolean;
    canPruneLogs?: boolean;
  } | null;
  lease: FleetLease | null;
  leaseKnown: boolean;
  /** Legacy coordinate fields retained for routing input, never rendered. */
  space?: string | null;
  spaceName?: string | null;
  spaceId?: string | null;
  rootAgentId?: string | null;
  rootAgentName?: string | null;
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

export interface Space {
  id: string;
  name: string;
  slug: string;
  agents: FleetAgent[];
}

function environmentFor(row: FleetProjectionRow): AgentEnvironment {
  if (row.environment) {
    return {
      pane: row.environment.pane ?? null,
      home: row.environment.home ?? null,
      answers: row.environment.answers ?? [],
    };
  }
  const reported = row.capabilities;
  const answers: string[] = [];
  if (reported?.focusable === true) answers.push("focus");
  if (reported?.canSendKeys === true) answers.push("message", "steer");
  if (reported?.canPruneLogs === true) answers.push("pruneLogs");
  return { pane: reported?.panes === true ? row.paneId : null, home: null, answers };
}

function tokenFields(value: unknown): FleetAgent["tokens"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const fields: NonNullable<FleetAgent["tokens"]> = {};
  const keys: readonly ("input" | "output" | "cacheRead" | "cacheWrite")[] = ["input", "output", "cacheRead", "cacheWrite"];
  for (const key of keys) {
    const item = Reflect.get(value, key);
    if (item !== undefined && typeof item !== "number") return undefined;
    if (typeof item === "number") fields[key] = item;
  }
  return fields;
}

function projectAgent(row: FleetProjectionRow): FleetAgent {
  const name = row.name?.trim() || row.agentId || "unnamed";
  return {
    key: row.key,
    id: row.agentId ?? null,
    environment: environmentFor(row),
    name,
    state: row.state,
    ...(row.model ? { model: { id: row.model } } : {}),
    ...(row.lastText ? { lastText: row.lastText } : {}),
    cost: row.cost,
    ...(tokenFields(row.tokens) ? { tokens: tokenFields(row.tokens) } : {}),
    ...(row.ctxPercent !== null ? { context: { percent: row.ctxPercent } } : {}),
    alive: !row.exited,
    lease: row.lease && typeof row.lease === "object" ? row.lease : null,
    leaseKnown: row.leaseKnown === true,
  };
}

function groupedRows(rows: readonly FleetProjectionRow[], historical: boolean): Space[] {
  const groups = new Map<string, Space>();
  for (const row of rows) {
    if (row.exited !== historical) continue;
    // Live work is grouped by its optional orch-owned space. History is grouped
    // by immutable provenance: the agent that spawned each record, never lease.
    const id = historical
      ? row.spawnedBy ?? row.rootAgentId ?? row.agentId ?? "unknown-spawner"
      : row.spaceId ?? "unscoped";
    const name = historical
      ? row.spawnedByLabel?.trim() || row.rootAgentName?.trim() || row.spawnedBy || row.rootAgentId || "unknown spawner"
      : row.spaceName?.trim() || row.spaceId || "unscoped";
    const group = groups.get(id) ?? { id, name, slug: id, agents: [] };
    group.agents.push(projectAgent(row));
    groups.set(id, group);
  }
  return [...groups.values()];
}

export function projectFleet(rows: readonly FleetProjectionRow[]): Space[] {
  return groupedRows(rows, false);
}

export function projectHistory(rows: readonly FleetProjectionRow[]): Space[] {
  return groupedRows(rows, true);
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

export function findSpace(list: Space[], slug: string): Space | undefined {
  return list.find((w) => w.slug === slug);
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
