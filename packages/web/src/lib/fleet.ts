// Fleet types shared by the god-view, sidebar, and workspace detail. Data comes
// from the real daemon via getFleet (src/server/orch.ts) — NO mock source.

/** Mirrors the daemon's BackendCapabilities. A backend that declares none offers no
 *  pane to watch, nothing to focus, and no input to type into. */
export interface AgentCapabilities {
  panes: boolean;
  focusable: boolean;
  canSendKeys: boolean;
  canPruneLogs: boolean;
}

const NO_CAPABILITIES: AgentCapabilities = {
  panes: false,
  focusable: false,
  canSendKeys: false,
  canPruneLogs: false,
};

export interface FleetLease {
  holderId: string;
  holderName: string;
  holderAlive: boolean;
}

export interface FleetProjectionRow {
  key: string;
  /** Orch-minted agent id, distinct from any plexer handle in the key. */
  agentId?: string | null;
  paneId: string | null;
  name: string | null;
  agent: string | null;
  state: string;
  exited: boolean;
  model: string;
  lastText: string | null;
  cost: number;
  ctxPercent: number | null;
  tokens: unknown;
  capabilities: Partial<AgentCapabilities> | null;
  lease: FleetLease | null;
  leaseKnown: boolean;
  /** Legacy plexer coordinate; retained on the wire only for routing. */
  workspace?: string | null;
  workspaceName?: string | null;
  /** Orch space identity/name. These are the only values suitable for display. */
  spaceId?: string | null;
  spaceName?: string | null;
  /** Immutable provenance root (pack) identity/name. */
  rootAgentId?: string | null;
  rootAgentName?: string | null;
}

export interface FleetAgent {
  /** Full orch identity key; never used as the agent's display name. */
  key: string;
  /** backend-native handle (herdr pane id) */
  handle: string;
  /** The pane this agent occupies, when its backend has panes at all. */
  pane: string | null;
  /** What the owning backend can do with this agent. The UI branches on these and
   *  never on which backend it is, so a new plexer changes no component here. */
  capabilities: AgentCapabilities;
  /** assigned agent label */
  name: string;
  /** presence state (idle/working/blocked/done/exited/error/…) */
  state: string;
  model?: { provider?: string; id?: string };
  currentFile?: string;
  lastText?: string;
  cost?: number;
  tokens?: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number };
  context?: { percent?: number };
  alive: boolean;
  /** Current lease facts from orchd; null means known unleased. */
  lease: FleetLease | null;
  /** False when orchd has no agents row for this key yet. */
  leaseKnown: boolean;
}

export interface Workspace {
  /** Orch space id used for routing; never rendered as a plexer coordinate. */
  id: string;
  /** Orch-owned space name, or "unscoped" when no space is assigned. */
  name: string;
  /** URL slug for the orch space id. */
  slug: string;
  agents: FleetAgent[];
}

/** Normalize daemon capabilities defensively; absent declarations mean no capability. */
function agentCapabilities(reported: Partial<AgentCapabilities> | null): AgentCapabilities {
  if (!reported) return NO_CAPABILITIES;
  return {
    panes: reported.panes === true,
    focusable: reported.focusable === true,
    canSendKeys: reported.canSendKeys === true,
    canPruneLogs: reported.canPruneLogs === true,
  };
}

/** Project one daemon row into the display-safe agent shape. Plexer coordinates are
 * routing facts only: names come from orch's name columns, with the minted agent id
 * as the sole agent fallback. */
function projectAgent(row: FleetProjectionRow): FleetAgent {
  const name = row.name?.trim() || row.agentId || "unnamed";
  return {
    key: row.key,
    handle: row.paneId ?? row.key,
    pane: row.paneId,
    capabilities: agentCapabilities(row.capabilities),
    name,
    state: row.state,
    ...(row.model ? { model: { id: row.model } } : {}),
    ...(row.lastText ? { lastText: row.lastText } : {}),
    cost: row.cost,
    ...(row.tokens && typeof row.tokens === "object" ? { tokens: row.tokens as FleetAgent["tokens"] } : {}),
    ...(row.ctxPercent !== null ? { context: { percent: row.ctxPercent } } : {}),
    alive: !row.exited,
    lease: row.lease && typeof row.lease === "object" ? row.lease : null,
    leaseKnown: row.leaseKnown === true,
  };
}

/** Build the live web fleet payload from daemon rows. Ended rows belong only to
 * history; lease state still controls the live view's orphan bucket. */
export function projectFleet(rows: readonly FleetProjectionRow[]): Workspace[] {
  const spaces = new Map<string, Workspace>();
  for (const row of rows) {
    if (row.exited) continue;
    const id = row.spaceId ?? "unscoped";
    const space = spaces.get(id) ?? {
      id,
      name: row.spaceName?.trim() || (row.spaceId ?? "unscoped"),
      slug: id,
      agents: [],
    };
    space.agents.push(projectAgent(row));
    spaces.set(id, space);
  }
  return [...spaces.values()];
}

/** Build the separate history view. Historical agents are grouped by their
 * immutable provenance root (the pack), never by whichever lease they held. */
export function projectHistory(rows: readonly FleetProjectionRow[]): Workspace[] {
  const packs = new Map<string, Workspace>();
  for (const row of rows) {
    if (!row.exited) continue;
    const id = row.rootAgentId ?? row.agentId ?? "unknown";
    const pack = packs.get(id) ?? {
      id,
      name: row.rootAgentName?.trim() || (row.rootAgentId ? row.rootAgentId : "unknown"),
      slug: id,
      agents: [],
    };
    pack.agents.push(projectAgent(row));
    packs.set(id, pack);
  }
  return [...packs.values()];
}

export function findWorkspace(list: Workspace[], slug: string): Workspace | undefined {
  return list.find((w) => w.slug === slug);
}

/**
 * The lit half of a state-change pulse. The card snaps to this ring the moment a
 * transition lands, then decays out of it — the dim is a slow transition back to
 * `shadow-none`, not a second keyframe.
 */
export function stateGlow(state: string): string {
  switch (state) {
    case "working":
      return "border-chart-2 shadow-[0_0_28px_-2px_var(--color-chart-2)]";
    case "review":
    case "blocked":
      return "border-chart-4 shadow-[0_0_28px_-2px_var(--color-chart-4)]";
    case "done":
      return "border-primary shadow-[0_0_28px_-2px_var(--color-primary)]";
    case "error":
    case "aborted":
      return "border-destructive shadow-[0_0_28px_-2px_var(--color-destructive)]";
    default:
      return "border-foreground/40 shadow-[0_0_22px_-4px_var(--color-foreground)]";
  }
}

export function stateColor(state: string): string {
  switch (state) {
    case "working":
      return "text-chart-2";
    case "review":
    case "blocked":
      return "text-chart-4";
    case "done":
      return "text-primary";
    case "error":
    case "aborted":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}
