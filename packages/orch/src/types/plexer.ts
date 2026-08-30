import type { AgentState } from "../agent-state.ts";
import type { NotifyEvent } from "./notify.ts";

/** Canonical state-change payload a bridge hands to the notifier. */
export type BridgeNotifyEvent = NotifyEvent;

/**
 * Session/UI surface a HUD handler reads off the harness context. Structural on
 * purpose: the HUD never imports a harness SDK type.
 */
export interface PaneHudContext {
  hasUI?: boolean;
  isIdle?: () => boolean;
  sessionManager?: {
    getSessionFile?: () => unknown;
    getSessionId?: () => unknown;
  };
}

/**
 * Harness-neutral lifecycle registrar. The harness composition root adapts its
 * own typed event names onto these four calls.
 */
export interface PaneHudRegistrar {
  onSessionStart(handler: (ctx: PaneHudContext) => void): void;
  onAgentStart(handler: (ctx: PaneHudContext) => void): void;
  onAgentEnd(handler: (event: { messages?: unknown[] }) => void): void;
  onSessionShutdown(handler: (event: { reason?: string }) => Promise<void> | void): void;
}

/** The harness's shared event bus, used for the plexer's own out-of-band signals. */
export interface PaneHudEventBus {
  on(channel: string, handler: (data: unknown) => void): unknown;
}

export interface PaneHudOptions {
  /** Agent/harness id reported to the plexer (e.g. the harness's own adapter id). */
  agentId: string;
  /** Bridge code hash, forwarded so the plexer can detect a stale in-pane bridge. */
  extensionHash: string;
}

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

/** Everything a harness shim may ask of the pane it is running in. */
export interface PaneHud {
  /** This process's pane handle, or null when it is not in a plexer pane. */
  paneHandle: string | null;
  /** Mirror agent lifecycle state into the pane's status line. */
  registerPaneState: (registrar: PaneHudRegistrar, events: PaneHudEventBus, options: PaneHudOptions) => void;
  /** Build the per-status-write sink that keeps the pane's custom status current. */
  statusReporter: (paneId: string | null) => (snapshot: PaneStatusSnapshot) => void;
  /** Raise a desktop notification through the plexer. */
  notify: (event: BridgeNotifyEvent) => void;
  /** Pull the pane/tab labels the user set; false when unavailable. */
  readLabels: (apply: (labels: PaneLabels) => void) => Promise<boolean>;
  /** Relay the plexer's blocked-state signal into the harness. */
  registerBlockedRelay: (events: PaneHudEventBus, onBlockedChange: (blocked: boolean, label: string | undefined) => void) => void;
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

export type PaneAgentState = Extract<AgentState, "working" | "blocked" | "idle">;

export interface PaneSocketConfig {
  socketPath: string;
  paneId: string;
  source: string;
  agentId: string;
  extensionHash: string;
}

export interface PaneStateSocket {
  /** Latch the current session path/id off the harness context for later refs. */
  updateSessionRef(ctx: PaneHudContext): void;
  /** Tell herdr which agent session backs this pane (no-op without a ref). */
  reportSession(): Promise<void>;
  /** Hand herdr's full-lifecycle authority for this pane back on a real quit. */
  releaseAgent(): Promise<void>;
  /** Queue a state report; drains in seq order, one dial in flight at a time. */
  enqueueState: (state: PaneAgentState, message?: string) => void;
}

export interface PaneStateMachineConfig {
  idleDebounceMs: number;
  retryGraceMs: number;
  /** Where a resolved state (deduped) is handed for delivery. */
  enqueueState: (state: PaneAgentState, message?: string) => void;
}

export interface PaneStateMachine {
  /** Session (re)start: adopt the observed activity and force a fresh publish. */
  openSession(active: boolean): void;
  /** An agent turn began — clear any pending failure hold and go working. */
  startRun(): void;
  /** An agent turn ended; hold working on a retryable error, else debounce idle. */
  endRun(retryableMessage: string | undefined): void;
  /** herdr's out-of-band blocked signal toggled for this pane. */
  setBlocked(active: boolean, label: string | undefined): void;
  /** Cancel any pending idle/retry timers (session teardown). */
  clearTimers(): void;
}

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
