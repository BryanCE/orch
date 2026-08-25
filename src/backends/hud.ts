/**
 * The plexer-neutral pane-HUD port.
 *
 * A harness shim (extensions/pi, extensions/claude, extensions/codex) wants to
 * surface agent state in whatever pane it is running in. It must not know WHICH
 * plexer that is: naming `backends/herdr/` from a harness module is the
 * harness×plexer pair code CLAUDE.md Rule 9 forbids, and Rule 10 keeps
 * plexer-gated behaviour under `src/backends/<plexer>/`.
 *
 * So shims depend on this port, and providers register themselves below. The
 * active provider is chosen by capability probe — "am I inside a live session of
 * this plexer?" — never by comparing a backend id. When no provider claims the
 * process (plain terminal, CI, a plexer with no HUD such as tmux today), the
 * no-op HUD is returned and every call is inert.
 *
 * Adding a HUD for another plexer means appending a provider here. It must never
 * mean editing a harness module.
 */
import {
  createPaneStatusReporter,
  herdrHudActive,
  herdrPaneHandle,
  notifyHerdr,
  readPaneLabels,
  registerBlockedSignalRelay,
  registerPaneStateHud,
} from "./herdr/hud.ts";

/** Canonical state-change payload a bridge hands to the notifier. */
import type { NotifyEvent } from "../notify/format.ts";
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

const NO_HUD: PaneHud = {
  paneHandle: null,
  registerPaneState: () => { /* no plexer to mirror into */ },
  statusReporter: () => () => { /* no pane status line */ },
  notify: () => { /* no plexer notifier */ },
  readLabels: () => Promise.resolve(false),
  registerBlockedRelay: () => { /* no plexer signal */ },
};

interface PaneHudProvider {
  /** True when this process is inside a live session of this provider's plexer. */
  isActive: () => boolean;
  hud: () => PaneHud;
}

const PROVIDERS: readonly PaneHudProvider[] = [
  {
    isActive: herdrHudActive,
    hud: () => ({
      paneHandle: herdrPaneHandle(),
      registerPaneState: registerPaneStateHud,
      statusReporter: createPaneStatusReporter,
      notify: notifyHerdr,
      readLabels: readPaneLabels,
      registerBlockedRelay: registerBlockedSignalRelay,
    }),
  },
];

/** The HUD for the plexer this process is running under, or an inert one. */
export function activePaneHud(): PaneHud {
  return PROVIDERS.find((provider) => provider.isActive())?.hud() ?? NO_HUD;
}
