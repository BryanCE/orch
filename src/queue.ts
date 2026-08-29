import { randomUUID } from "node:crypto";
import { agentById, type AgentRow } from "./store/agent-rows.ts";
import { currentSpace } from "./store/interval-rows.ts";
import { currentLease, leasesByOrch } from "./store/lease-rows.ts";
import { isRecord } from "./util.ts";
import {
  agentsInTaskScope,
  allTasks,
  attemptsOf,
  cancelTask as insertCancellation,
  claimTask as insertAttempt,
  enqueueTask,
  openIntake,
  closeIntake,
  intakesOf,
  openTasksInScope,
  settleAttempt,
  taskById,
  taskState,
  editTask as updateTask,
  reapTask as deleteUnrunnableTask,
  takeOnTask as rescopeTask,
  type AttemptRow,
  type TaskRow,
} from "./store/task-rows.ts";

import type { TaskState } from "./store/task-rows.ts";
export type { TaskState };
export const STALE_TASK_AGE_MS = 24 * 60 * 60 * 1000;

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

export function isTaskOptions(value: unknown): value is TaskOptions {
  if (!isRecord(value)) return false;
  if ("agent" in value && typeof value.agent !== "string") return false;
  if ("model" in value && typeof value.model !== "string") return false;
  if ("cwd" in value && typeof value.cwd !== "string") return false;
  if ("worktree" in value && typeof value.worktree !== "boolean") return false;
  if ("constraints" in value && !isRecord(value.constraints)) return false;
  return true;
}

function mapTask(orchDir: string, row: TaskRow, knownState?: TaskState): TaskRec {
  if (!isTaskOptions(row.opts)) throw new Error(`Malformed task options for task ${row.id}`);
  const attempts = attemptsOf(orchDir, row.id).map(mapAttempt);
  const newest = attempts.at(-1);
  const updatedAt = newest?.until ?? newest?.since ?? row.createdAt;
  const state = knownState ?? taskState(orchDir, row.id) ?? "queued";
  return {
    id: row.id,
    text: row.text,
    opts: row.opts,
    enqueuedBy: row.enqueuedBy,
    scopeAgentId: row.scopeAgentId,
    scopePackId: row.scopePackId,
    scopeSpaceId: row.scopeSpaceId,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(updatedAt).toISOString(),
    state,
    stale: state === "queued"
      && Date.now() - row.createdAt >= STALE_TASK_AGE_MS,
    attempts,
  };
}

export function requireTask(orchDir: string, id: string): TaskRec {
  const row = taskById(orchDir, id);
  if (!row) throw new Error(`Unknown queue task: ${id}`);
  return mapTask(orchDir, row);
}

/** Packs an agent may put work into: the one it is a member of, plus every pack
 *  it currently holds a live agent in. Adoption earns the right; provenance on
 *  its own never grants it (Cq1). */
export function packsOpenTo(orchDir: string, enqueuer: AgentRow): Set<string> {
  const packs = new Set([enqueuer.rootAgentId]);
  for (const lease of leasesByOrch(orchDir, enqueuer.id)) {
    const held = agentById(orchDir, lease.agentId);
    if (held && held.ending == null) packs.add(held.rootAgentId);
  }
  return packs;
}

/** The space an agent is in right now, or null when it is in none. */
export function spaceOf(orchDir: string, agentId: string): string | null {
  const row = currentSpace(orchDir, agentId);
  return isRecord(row) && typeof row.space_id === "string" ? row.space_id : null;
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
  if (selection.packId !== undefined) {
    if (!packsOpenTo(orchDir, enqueuer).has(selection.packId)) {
      throw new Error(`Pack-scoped enqueue requires holding a live agent in pack ${selection.packId}`);
    }
    return { scopePackId: selection.packId } as const;
  }
  if (selection.spaceId !== undefined) {
    if (spaceOf(orchDir, enqueuedBy) !== selection.spaceId) {
      throw new Error(`Space-scoped enqueue requires the enqueuer to be in space ${selection.spaceId}`);
    }
    return { scopeSpaceId: selection.spaceId } as const;
  }
  return { scopePackId: enqueuer.rootAgentId } as const;
}

export interface PackIntakeRec {
  packId: string;
  spaceId: string;
  since: number;
  until: number | null;
}

/** Only the pack's own holder may speak for it. Same right as pack-scoped
 *  enqueue: membership, or a live lease on one of its members. */
function requirePackRight(orchDir: string, packId: string, byAgentId: string): void {
  const actor = agentById(orchDir, byAgentId);
  if (!actor || actor.ending != null) throw new Error(`Unknown live agent: ${byAgentId}`);
  if (!packsOpenTo(orchDir, actor).has(packId)) {
    throw new Error(`Recording intake for pack ${packId} requires holding a live agent in it`);
  }
}

/** Every intake a pack has ever recorded, open and closed, oldest first. */
export function packIntakes(orchDir: string, packId: string): PackIntakeRec[] {
  return intakesOf(orchDir, packId);
}

/** The consuming half of space scope (Cq3). Publishing into a space is only an
 *  offer; a pack takes work from that pool only once its holder opts it in. */
export function openPackIntake(
  orchDir: string,
  packId: string,
  spaceId: string,
  byAgentId: string,
  since = Date.now(),
): PackIntakeRec[] {
  requirePackRight(orchDir, packId, byAgentId);
  openIntake(orchDir, packId, spaceId, since);
  return packIntakes(orchDir, packId);
}

/** Withdraw a pack's consent. The offer stands; this pack stops consuming it. */
export function closePackIntake(
  orchDir: string,
  packId: string,
  spaceId: string,
  byAgentId: string,
  until = Date.now(),
): PackIntakeRec[] {
  requirePackRight(orchDir, packId, byAgentId);
  const open = packIntakes(orchDir, packId).find((intake) => intake.spaceId === spaceId && intake.until === null);
  if (!open) throw new Error(`Pack ${packId} has no open intake for space ${spaceId}`);
  closeIntake(orchDir, packId, spaceId, Math.max(until, open.since + 1));
  return packIntakes(orchDir, packId);
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
  const targeted = agentsInTaskScope(orchDir, id);
  const permitted = options.human === true
    || task.enqueuedBy === cancelledBy
    || targeted.some((agentId) => currentLease(orchDir, agentId)?.orchId === cancelledBy);
  if (!permitted) return { ...task, error: "Cancellation is not permitted for this caller" };
  if (task.state === "cancelled") return task;
  insertCancellation(orchDir, id, cancelledBy);
  return requireTask(orchDir, id);
}

/** Edit task text/options only as its enqueuer and only before the first claim. */
export function editTask(
  orchDir: string,
  id: string,
  editedBy: string,
  changes: { text?: string; opts?: unknown },
): TaskRec {
  const task = requireTask(orchDir, id);
  try {
    updateTask(orchDir, id, editedBy, changes);
    return requireTask(orchDir, id);
  } catch (error: unknown) {
    return { ...task, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Take an orphaned task onto the taker's existing pack. */
export function takeOnTask(orchDir: string, id: string, takerId: string): TaskRec {
  const taker = agentById(orchDir, takerId);
  if (!taker || taker.ending != null) throw new Error(`Unknown live task taker: ${takerId}`);
  rescopeTask(orchDir, id, taker.rootAgentId);
  return requireTask(orchDir, id);
}

/** Reap is an explicit resolution for an unrunnable task, never a timer. */
export function reapTask(orchDir: string, id: string, _byAgentId?: string): boolean {
  return deleteUnrunnableTask(orchDir, id);
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
export function nextQueuedTask(orchDir: string, agentId: string, maxRetries: number, knownTasks?: TaskRec[]): TaskRec | undefined {
  return (knownTasks ?? listTasks(orchDir))
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
