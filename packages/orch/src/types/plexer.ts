import type { NotifyEvent } from "./notify.ts";
import type { NotificationSettings } from "./settings.ts";

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
  notify: (event: BridgeNotifyEvent, display: NotificationSettings) => void;
  /** Pull the pane/tab labels the user set; false when unavailable. */
  readLabels: (apply: (labels: PaneLabels) => void) => Promise<boolean>;
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
