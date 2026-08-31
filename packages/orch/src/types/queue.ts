/**
 * The queue domain: one task, its attempts, and the scope it was filed under.
 *
 * `TaskRow`/`AttemptRow` are the STORE's shapes — what a row holds, instants as
 * epoch millis. `TaskRec`/`TaskAttemptRec` are what a command hands back. They
 * are separate on purpose and both live here, so a reader can see at a glance
 * which of the two a signature means.
 */

/** Exactly one typed scope. The union makes two-at-once unconstructible. */
export type TaskScope =
  | { scopeAgentId: string; scopePackId?: never; scopeSpaceId?: never }
  | { scopePackId: string; scopeAgentId?: never; scopeSpaceId?: never }
  | { scopeSpaceId: string; scopeAgentId?: never; scopePackId?: never };

export type NewTask = TaskScope & {
  id: string;
  text: string;
  opts: unknown;
  enqueuedBy: string;
  createdAt?: number;
};

export interface TaskRow {
  id: string;
  text: string;
  opts: unknown;
  enqueuedBy: string;
  scopeAgentId: string | null;
  scopePackId: string | null;
  scopeSpaceId: string | null;
  createdAt: number;
}

export interface AttemptRow {
  taskId: string;
  since: number;
  until: number | null;
  agentId: string;
  dispatchId: string;
  outcome: "done" | "failed" | null;
  result: unknown;
  error: string | null;
}

export type TaskState = "queued" | "claimed" | "done" | "failed" | "cancelled" | "unrunnable";

/** The same one-scope rule for a READ, phrased in the caller's vocabulary. */
export type ScopeQuery =
  | { agentId: string; packId?: never; spaceId?: never }
  | { packId: string; agentId?: never; spaceId?: never }
  | { spaceId: string; agentId?: never; packId?: never };

export interface TaskOptions {
  agent?: string;
  model?: string;
  cwd?: string;
  worktree?: boolean;
  constraints?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface TaskAttemptRec {
  since: number;
  until: number | null;
  agentId: string;
  dispatchId: string;
  outcome: "done" | "failed" | null;
  result: unknown;
  error: string | null;
}

export interface TaskRec {
  id: string;
  text: string;
  opts: TaskOptions;
  enqueuedBy: string;
  scopeAgentId: string | null;
  scopePackId: string | null;
  scopeSpaceId: string | null;
  createdAt: string;
  updatedAt: string;
  state: TaskState;
  /** Queued beyond the notification threshold, while still claimable. */
  stale: boolean;
  attempts: TaskAttemptRec[];
  /** A command error is returned without inventing another persisted state. */
  error?: string;
}

export interface TaskScopeSelection {
  agentId?: string;
  packId?: string;
  spaceId?: string;
}

export interface PackIntakeRec {
  packId: string;
  spaceId: string;
  since: number;
  until: number | null;
}
