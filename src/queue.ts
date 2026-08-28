import { randomUUID } from "node:crypto";
import { agentById } from "./store/agent-rows.ts";
import { currentLease } from "./store/lease-rows.ts";
import {
  allTasks,
  attemptsOf,
  cancelTask as insertCancellation,
  claimTask as insertAttempt,
  enqueueTask,
  openTasksInScope,
  settleAttempt,
  taskById,
  taskState,
  type AttemptRow,
  type TaskRow,
} from "./store/task-rows.ts";

export type TaskState = "queued" | "claimed" | "done" | "failed" | "cancelled";

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
  attempts: TaskAttemptRec[];
  /** A command error is returned without inventing another persisted state. */
  error?: string;
}

export interface TaskScopeSelection {
  agentId?: string;
  packId?: string;
  spaceId?: string;
}

function mapAttempt(row: AttemptRow): TaskAttemptRec {
  return {
    since: row.since,
    until: row.until,
    agentId: row.agentId,
    dispatchId: row.dispatchId,
    outcome: row.outcome,
    result: row.result,
    error: row.error,
  };
}

function mapTask(orchDir: string, row: TaskRow, knownState?: TaskState): TaskRec {
  const attempts = attemptsOf(orchDir, row.id).map(mapAttempt);
  const newest = attempts.at(-1);
  const updatedAt = newest?.until ?? newest?.since ?? row.createdAt;
  return {
    id: row.id,
    text: row.text,
    opts: row.opts as TaskOptions,
    enqueuedBy: row.enqueuedBy,
    scopeAgentId: row.scopeAgentId,
    scopePackId: row.scopePackId,
    scopeSpaceId: row.scopeSpaceId,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(updatedAt).toISOString(),
    state: knownState ?? taskState(orchDir, row.id) ?? "queued",
    attempts,
  };
}

function requireTask(orchDir: string, id: string): TaskRec {
  const row = taskById(orchDir, id);
  if (!row) throw new Error(`Unknown queue task: ${id}`);
  return mapTask(orchDir, row);
}

function selectedScope(orchDir: string, enqueuedBy: string, selection: TaskScopeSelection) {
  const enqueuer = agentById(orchDir, enqueuedBy);
  if (!enqueuer) throw new Error(`Unknown task enqueuer: ${enqueuedBy}`);
  const chosen = [selection.agentId, selection.packId, selection.spaceId].filter((value) => value !== undefined);
  if (chosen.length > 1) throw new Error("A task must select exactly one scope");
  if (selection.agentId !== undefined) {
    const lease = currentLease(orchDir, selection.agentId);
    if (selection.agentId !== enqueuedBy && lease?.orchId !== enqueuedBy) {
      throw new Error(`Agent-scoped enqueue requires the lease for ${selection.agentId}`);
    }
    return { scopeAgentId: selection.agentId } as const;
  }
  if (selection.packId !== undefined) return { scopePackId: selection.packId } as const;
  if (selection.spaceId !== undefined) return { scopeSpaceId: selection.spaceId } as const;
  return { scopePackId: enqueuer.rootAgentId } as const;
}

/** Enqueue into one typed scope. No explicit scope means the enqueuer's pack. */
export function addTask(
  orchDir: string,
  text: string,
  opts: TaskOptions = {},
  enqueuedBy: string,
  scope: TaskScopeSelection = {},
): TaskRec {
  const id = randomUUID();
  enqueueTask(orchDir, { id, text, opts, enqueuedBy, ...selectedScope(orchDir, enqueuedBy, scope) });
  return requireTask(orchDir, id);
}

export function listTasks(orchDir: string): TaskRec[] {
  return allTasks(orchDir).map((row) => mapTask(orchDir, row, row.state));
}

export function history(orchDir: string): TaskRec[] {
  return listTasks(orchDir).filter((task) => task.state === "done" || task.state === "failed" || task.state === "cancelled");
}

export function cancelTask(
  orchDir: string,
  id: string,
  cancelledBy: string,
  options: { human?: boolean } = {},
): TaskRec {
  const task = requireTask(orchDir, id);
  const targetedLease = task.scopeAgentId ? currentLease(orchDir, task.scopeAgentId) : null;
  const permitted = options.human === true || task.enqueuedBy === cancelledBy || targetedLease?.orchId === cancelledBy;
  if (!permitted) return { ...task, error: "Cancellation is not permitted for this caller" };
  if (task.state === "cancelled") return task;
  insertCancellation(orchDir, id, cancelledBy);
  return requireTask(orchDir, id);
}

function agentMayClaim(task: TaskRec, agentId: string): boolean {
  return task.scopeAgentId === agentId
    || task.scopePackId !== null
    || task.scopeSpaceId !== null;
}

/** A claim is the attempt INSERT. A unique-index collision is the expected lost race. */
export function claimTask(orchDir: string, id: string, agentId: string, dispatchId: string): boolean {
  const task = requireTask(orchDir, id);
  if ((task.state !== "queued" && task.state !== "failed") || !agentMayClaim(task, agentId)) return false;
  const eligible = openTasksInScope(orchDir, { agentId }).some((row) => row.id === id)
    || (task.state === "failed" && scopeIncludesAgent(orchDir, task, agentId));
  if (!eligible) return false;
  const since = Math.max(Date.now(), (task.attempts.at(-1)?.since ?? 0) + 1);
  try {
    insertAttempt(orchDir, id, agentId, dispatchId, since);
    return true;
  } catch (error) {
    if (/one_open_attempt|UNIQUE constraint failed: task_attempts\.task_id/i.test(String(error))) return false;
    throw error;
  }
}

function scopeIncludesAgent(orchDir: string, task: TaskRec, agentId: string): boolean {
  const agent = agentById(orchDir, agentId);
  if (!agent || agent.ending) return false;
  if (task.scopeAgentId !== null) return task.scopeAgentId === agentId;
  if (task.scopePackId !== null) return task.scopePackId === agent.rootAgentId;
  if (task.scopeSpaceId !== null) {
    return openTasksInScope(orchDir, { agentId }).some((row) => row.id === task.id);
  }
  return false;
}

/** FIFO selection among tasks claimable by this agent under scope and retry policy. */
export function nextQueuedTask(orchDir: string, agentId: string, maxRetries: number): TaskRec | undefined {
  return listTasks(orchDir)
    .filter((task) => (task.state === "queued" || task.state === "failed") && scopeIncludesAgent(orchDir, task, agentId))
    .filter((task) => task.attempts.length < maxRetries + 1)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0];
}

export function taskShouldRetry(task: TaskRec, maxRetries: number): boolean {
  return task.attempts.length < maxRetries + 1;
}

function openAttempt(task: TaskRec): TaskAttemptRec {
  const attempt = task.attempts.at(-1);
  if (attempt?.until !== null) throw new Error(`Task ${task.id} has no open attempt`);
  return attempt;
}

export function recordTaskDone(orchDir: string, id: string, result?: unknown): TaskRec {
  const task = requireTask(orchDir, id);
  const attempt = openAttempt(task);
  settleAttempt(orchDir, id, attempt.since, Math.max(Date.now(), attempt.since + 1), "done", { result });
  return requireTask(orchDir, id);
}

export function recordTaskFailure(orchDir: string, id: string, error: string): TaskRec {
  const task = requireTask(orchDir, id);
  const attempt = openAttempt(task);
  settleAttempt(orchDir, id, attempt.since, Math.max(Date.now(), attempt.since + 1), "failed", { error });
  return requireTask(orchDir, id);
}
