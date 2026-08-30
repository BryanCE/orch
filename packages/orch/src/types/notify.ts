export interface NotifyEvent {
  host?: string;
  key: string;
  /** Origin space, for display only; absent when the agent has no placement. */
  space?: string;
  /** Human-assigned agent name. */
  agent: string | null;
  /** Human/registry display name. */
  name?: string | null;
  /** Dispatch id associated with this transition. */
  dispatchId?: string;
  /** Identity of the session that spawned this agent. */
  spawnedBy?: string;
  /** Human label of the session that spawned this agent. */
  spawnedByLabel?: string;
  tab: string | null;
  /** Model id plus thinking level, e.g. terra:medium. */
  model: string | null;
  oldState: string;
  newState: string;
  /** This agent's transition ordinal, stamped once as the event is published.
   *  `(key, seq)` is the event's identity: a consumer that has already acted on
   *  a seq can drop a redelivery instead of collecting the same result twice. */
  seq?: number;
  task?: string;
  cost?: number;
  ts: string;
  lastError?: string;
  /** Final assistant text reported when the agent is done. */
  lastText?: string;
  result?: string;
  /** Why the agent stopped, or the question blocking it. */
  reason?: string;
  /** Context-window usage percentage. */
  ctxPercent?: number;
  /** Token usage counters reported by the agent. */
  tokens?: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number };
  /** Files touched by the agent during this run. */
  filesTouched?: string[];
};

/** A required configuration value collected for a notifier. */
export interface NotifierConfigField {
  /** Config key used by the notifier. */
  name: string;
  /** Human-readable prompt/label for the key. */
  label: string;
  description?: string;
  /** Whether setup and doctor should redact this value. */
  secret?: boolean;
};

/** Host-integration metadata kept separate from delivery behavior. */
export interface NotifierMetadata {
  requiredConfig: readonly NotifierConfigField[];
  description?: string;
};

/** Canonical host-integration contract. */
export interface Notifier {
  id: string;
  label: string;
  remediation?: string;
  metadata: NotifierMetadata;
  /** A rejected availability probe is treated as unavailable by the registry. */
  available(config?: Record<string, unknown>): boolean | Promise<boolean>;
  deliver(event: NotifyEvent, config: Record<string, unknown>): Promise<boolean>;
};

export interface NotifierChoice {
  id: string;
  label: string;
  available: boolean;
  remediation: string;
  requiredFields: readonly NotifierConfigField[];
}

/** The transport a delivery needs, injected so the retry loop is testable without
 *  a running herdr and without sleeping on the real clock. */
export interface NotificationIo {
  send: (args: readonly string[]) => string;
  wait: (ms: number) => void;
}
