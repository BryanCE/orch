/**
 * The queue domain: one task, its attempts, and the scope it was filed under.
 *
 * `TaskRow`/`AttemptRow` are the STORE's shapes — what a row holds, instants as
 * epoch millis. `TaskRec`/`TaskAttemptRec` are what a command hands back. They
 * are separate on purpose and both live here, so a reader can see at a glance
 * which of the two a signature means.
 */

import { isRecord } from "../util.ts";

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

export const TASK_STATES = ["queued", "claimed", "done", "failed", "cancelled", "unrunnable"] as const;
export type TaskState = (typeof TASK_STATES)[number];

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

export function isTaskOptions(value: unknown): value is TaskOptions {
  if (!isRecord(value)) return false;
  if ("agent" in value && typeof value.agent !== "string") return false;
  if ("model" in value && typeof value.model !== "string") return false;
  if ("cwd" in value && typeof value.cwd !== "string") return false;
  if ("worktree" in value && typeof value.worktree !== "boolean") return false;
  if ("constraints" in value && !isRecord(value.constraints)) return false;
  return true;
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

function isTaskState(value: unknown): value is TaskState {
  return typeof value === "string" && TASK_STATES.some((state) => state === value);
}

function isTaskAttemptRec(value: unknown): value is TaskAttemptRec {
  if (!isRecord(value)) return false;
  if (typeof value.since !== "number") return false;
  if (typeof value.until !== "number" && value.until !== null) return false;
  if (typeof value.agentId !== "string") return false;
  if (typeof value.dispatchId !== "string") return false;
  if (value.outcome !== null && value.outcome !== "done" && value.outcome !== "failed") return false;
  if (value.error !== null && typeof value.error !== "string") return false;
  return true;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function hasTaskIdentity(value: { id?: unknown; text?: unknown; enqueuedBy?: unknown }): boolean {
  return typeof value.id === "string" && typeof value.text === "string" && typeof value.enqueuedBy === "string";
}

function hasTaskScope(value: { scopeAgentId?: unknown; scopePackId?: unknown; scopeSpaceId?: unknown }): boolean {
  return isNullableString(value.scopeAgentId) && isNullableString(value.scopePackId) && isNullableString(value.scopeSpaceId);
}

function hasTaskLifecycle(value: { createdAt?: unknown; updatedAt?: unknown; state?: unknown; stale?: unknown; attempts?: unknown }): boolean {
  return typeof value.createdAt === "string"
    && typeof value.updatedAt === "string"
    && isTaskState(value.state)
    && typeof value.stale === "boolean"
    && Array.isArray(value.attempts)
    && value.attempts.every(isTaskAttemptRec);
}

export function isTaskRec(value: unknown): value is TaskRec {
  if (!isRecord(value)) return false;
  return hasTaskIdentity(value)
    && isTaskOptions(value.opts)
    && hasTaskScope(value)
    && hasTaskLifecycle(value)
    && (!("error" in value) || typeof value.error === "string");
}

export function isPackIntakeRec(value: unknown): value is PackIntakeRec {
  if (!isRecord(value)) return false;
  return typeof value.packId === "string" && typeof value.spaceId === "string"
    && typeof value.since === "number" && (typeof value.until === "number" || value.until === null);
}
