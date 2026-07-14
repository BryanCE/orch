import { randomUUID } from "node:crypto";
import {
  insertQueueTask,
  selectQueueTask,
  selectQueueTasks,
  writeTaskCancel,
  writeTaskClaim,
  writeTaskDone,
  writeTaskFailure,
  writeTaskRequeue,
} from "./store/sqlite.ts";

export type TaskState = "queued" | "claimed" | "done" | "failed" | "cancelled";

export interface TaskOptions {
  agent?: string;
  model?: string;
  cwd?: string;
  worktree?: boolean;
  constraints?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface TaskRec {
  id: string;
  text: string;
  /** Workspace this task was enqueued from; absent for legacy/unscoped tasks. */
  workspace?: string;
  opts: TaskOptions;
  createdAt: string;
  updatedAt: string;
  state: TaskState;
  retries: number;
  lastError?: string;
  agentKey?: string;
  result?: unknown;
  error?: string;
}

function requireTask(orchDir: string, id: string): TaskRec {
  const task = selectQueueTask(orchDir, id);
  if (!task) {
    throw new Error(`Unknown queue task: ${id}`);
  }
  return task;
}

export function addTask(orchDir: string, text: string, opts: TaskOptions = {}, workspace?: string): TaskRec {
  const id = randomUUID();
  const ts = new Date().toISOString();
  const task: TaskRec = {
    id,
    text,
    opts,
    createdAt: ts,
    updatedAt: ts,
    state: "queued",
    retries: 0,
  };
  if (workspace !== undefined) task.workspace = workspace;
  insertQueueTask(orchDir, task);
  return task;
}

export function listTasks(orchDir: string): TaskRec[] {
  return selectQueueTasks(orchDir);
}

export function history(orchDir: string): TaskRec[] {
  return selectQueueTasks(orchDir).filter((task) => task.state === "done" || task.state === "failed" || task.state === "cancelled");
}

export function cancelTask(orchDir: string, id: string): TaskRec {
  const task = requireTask(orchDir, id);
  if (task.state !== "queued") {
    return { ...task, error: `Cannot cancel ${task.state} task` };
  }

  writeTaskCancel(orchDir, id, new Date().toISOString());
  return requireTask(orchDir, id);
}

export function claimTask(orchDir: string, id: string, agentKey: string): boolean {
  if (requireTask(orchDir, id).state !== "queued") {
    return false;
  }
  return writeTaskClaim(orchDir, id, agentKey, new Date().toISOString());
}

export function unclaimTask(orchDir: string, id: string): void {
  writeTaskRequeue(orchDir, id, new Date().toISOString());
}

// FIFO pick among queued tasks whose constraints the candidate agent satisfies.
// Constraint matching is by task.opts.agent (exact adapter/agent name) only for
// now; richer constraints ride in opts.constraints once adapters land.
export function nextQueuedTask(tasks: TaskRec[], agentName?: string, workspace?: string): TaskRec | undefined {
  return tasks
    .filter((task) => task.state === "queued")
    .filter((task) => !task.opts.agent || task.opts.agent === agentName)
    // Legacy tasks without a workspace remain eligible everywhere. When a
    // workspace is supplied, pinned tasks must stay within that workspace.
    .filter((task) => workspace === undefined || task.workspace === undefined || task.workspace === workspace)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
}

export function taskShouldRetry(task: TaskRec, maxRetries: number): boolean {
  return task.retries < maxRetries;
}

export function requeueTask(orchDir: string, id: string, error: string): TaskRec {
  writeTaskRequeue(orchDir, id, new Date().toISOString(), error);
  return requireTask(orchDir, id);
}

export function recordTaskDone(orchDir: string, id: string, result?: unknown): TaskRec {
  writeTaskDone(orchDir, id, new Date().toISOString(), result);
  return requireTask(orchDir, id);
}

export function recordTaskFailure(orchDir: string, id: string, error: string): TaskRec {
  writeTaskFailure(orchDir, id, new Date().toISOString(), error);
  return requireTask(orchDir, id);
}
