import type { NotifyEvent } from "./notify.ts";

/** Canonical state-change payload a bridge hands to the notifier. */
export type BridgeNotifyEvent = NotifyEvent;

/** Agent snapshot the custom-status line is derived from. */
export interface PaneStatusSnapshot {
  state: string;
  task?: string;
  cost: number;
}

/** Pane and tab display labels as the plexer reports them. */
export interface PaneLabels {
  label: string | null;
  tabLabel: string | null;
}

/** Everything the daemon may ask of the pane an agent occupies. */
export interface PaneHud {
  /** Build the per-status-write sink that keeps the pane's custom status current. */
  statusReporter: (paneId: string | null) => (snapshot: PaneStatusSnapshot) => void;
  /** Raise a desktop notification through the plexer. */
  notify: (event: BridgeNotifyEvent) => void;
  /** Pull the pane/tab labels the user set; false when unavailable. */
  readLabels: (apply: (labels: PaneLabels) => void) => Promise<boolean>;
}

export interface HerdrPane {
  pane_id: string;
  tab_id?: string;
  workspace_id?: string;
  agent_status?: string;
  name?: string;
  focused?: boolean;
  agent?: string;
  agent_session?: { kind: string; value: string } | null;
  rect?: { width: number; height: number; x: number; y: number };
}

export interface HerdrTab {
  tab_id: string;
  label?: string;
  workspace_id?: string;
  focused?: boolean;
  number?: number;
  pane_count?: number;
  agent_status?: string;
}

export interface HerdrWorkspace {
  workspace_id: string;
  label?: string;
  focused?: boolean;
  number?: number;
  tab_count?: number;
  pane_count?: number;
  agent_status?: string;
}

/** Handle owned by one herdr pane. */
export type HerdrHandle = string;

/** One tmux pane row from the shared inventory query (D1). */
export interface TmuxPane {
  readonly paneId: string;
  readonly session: string;
  readonly windowId: string;
  readonly windowIndex: string;
  readonly windowName: string;
  readonly paneTitle: string;
  readonly paneActive: boolean;
  readonly windowActive: boolean;
  readonly sessionAttached: boolean;
  readonly agentKey: string;
  readonly agent: string;
  readonly agentName: string;
}

/** One pane's id and cell geometry, for layout planning. */
export interface TmuxPaneRect {
  readonly paneId: string;
  readonly rect: { readonly width: number; readonly height: number; readonly x: number; readonly y: number };
}

/** Handle owned by one tmux pane. */
export type TmuxHandle = string;

/** Injected home command runner for hermetic provider tests. */
export interface TmuxBackendDeps {
  readonly homeExec?: (args: string[]) => string;
}

/** Handle owned by one detached headless process. */
export interface HeadlessHandle {
  /** Discriminator for the detached-process handle variant, when present. */
  readonly kind?: "headless";
  readonly pid: number;
  readonly key: string;
  /** Updated by list(); absent on a freshly spawned handle. */
  readonly alive?: boolean;
  /** Stable diagnostic rendering; avoids Object.prototype's `[object Object]`. */
  readonly toString: () => string;
}

/**
 * Detached process backend. Dead entries stay observable in the agent store,
 * while close can only signal a registered process with matching presence ownership.
 */
export interface HeadlessBackendDeps {
  /** Injected process liveness check and signaler, primarily for hermetic tests. */
  pidAlive?: (pid: number) => boolean;
  killer?: (pid: number, signal: "SIGTERM") => void;
}
