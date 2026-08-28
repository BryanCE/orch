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

export const NO_CAPABILITIES: AgentCapabilities = {
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

export interface FleetAgent {
  /** full presence key `<backend>~<workspace>~<handle>` */
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
  /** herdr workspace id embedded in the presence key (e.g. "wD") */
  id: string;
  /** human name from herdr if reachable, else the id */
  name: string;
  /** url slug — the workspace id */
  slug: string;
  agents: FleetAgent[];
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
