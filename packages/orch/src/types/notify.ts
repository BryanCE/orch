import type { AgentState } from "../agent-state.ts";
import type { OrchSettings } from "./settings.ts";
import type { TaskState } from "./queue.ts";

/** What every event says about who it is about. */
export interface EventIdentity {
  readonly key: string;
  readonly ts: string;
  /** Stamped once by the daemon as the event is published; `(key, seq)` is the event's identity. */
  readonly seq?: number;
  readonly agent: string | null;
  readonly name?: string | null;
  readonly space?: string;
  readonly tab: string | null;
  readonly model: string | null;
  readonly host?: string;
  readonly spawnedBy?: string;
  /** The orch id holding the open lease when the event was published; absent when nothing holds the agent. */
  readonly holder?: string;
  readonly spawnedByLabel?: string;
}

/** What a live agent reports about its run; present on transition and asking events only. */
export interface AgentActivity {
  readonly dispatchId?: string;
  readonly task?: string;
  readonly cost?: number;
  readonly lastError?: string;
  readonly lastText?: string;
  readonly reason?: string;
  readonly ctxPercent?: number;
  readonly tokens?: { readonly input?: number; readonly output?: number; readonly cacheRead?: number; readonly cacheWrite?: number };
  readonly filesTouched?: readonly string[];
  readonly capacity?: { readonly packUsed: number; readonly packCap: number };
}

export type NotifyEvent =
  | (EventIdentity & AgentActivity & { readonly type: "transition"; readonly oldState: AgentState; readonly newState: Exclude<AgentState, "asking"> })
  | (EventIdentity & AgentActivity & { readonly type: "asking"; readonly oldState: AgentState; readonly newState: "asking"; readonly askCount: number; readonly gaveUp: boolean })
  | (EventIdentity & { readonly type: "message"; readonly newState: "message"; readonly dispatchId: string; readonly mail: { readonly id: string; readonly text: string } })
  | (EventIdentity & { readonly type: "closed"; readonly oldState: AgentState; readonly newState: "closed" })
  | (EventIdentity & { readonly type: "task"; readonly oldState: TaskState; readonly newState: TaskState; readonly task: string; readonly lastError?: string });

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
  available(settings: OrchSettings | null): boolean | Promise<boolean>;
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
