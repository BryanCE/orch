import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { isRecord } from "./store.ts";

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

type QueueEvent = {
  ev: "add" | "claim" | "done" | "fail" | "retry" | "cancel";
  id: string;
  ts: string;
  text?: string;
  opts?: TaskOptions;
  agentKey?: string;
  error?: string;
  result?: unknown;
};

function queueDir(orchDir: string): string {
  return join(orchDir, "queue");
}

function queuePath(orchDir: string): string {
  return join(queueDir(orchDir), "queue.jsonl");
}

function claimsDir(orchDir: string): string {
  return join(queueDir(orchDir), "claims");
}

function ensureQueueDirs(orchDir: string): void {
  mkdirSync(claimsDir(orchDir), { recursive: true });
}

function appendEvent(orchDir: string, event: QueueEvent): void {
  ensureQueueDirs(orchDir);
  appendFileSync(queuePath(orchDir), `${JSON.stringify(event)}\n`);
}

function isQueueEvent(value: unknown): value is QueueEvent {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.ts === "string" &&
    (value.ev === "add" ||
      value.ev === "claim" ||
      value.ev === "done" ||
      value.ev === "fail" ||
      value.ev === "retry" ||
      value.ev === "cancel")
  );
}

function warnSkippedEvent(line: number): void {
  console.error(`Warning: skipping corrupt queue event at line ${line}`);
}

function replay(orchDir: string): TaskRec[] {
  const path = queuePath(orchDir);
  if (!existsSync(path)) {
    return [];
  }

  const tasks = new Map<string, TaskRec>();
  const lines = readFileSync(path, "utf8").split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }

    let event: QueueEvent;
    try {
      const parsed: unknown = JSON.parse(line);
      if (!isQueueEvent(parsed)) {
        warnSkippedEvent(index + 1);
        continue;
      }
      event = parsed;
    } catch {
      warnSkippedEvent(index + 1);
      continue;
    }

    if (event.ev === "add") {
      if (!tasks.has(event.id) && typeof event.text === "string") {
        tasks.set(event.id, {
          id: event.id,
          text: event.text,
          opts: event.opts ?? {},
          createdAt: event.ts,
          updatedAt: event.ts,
          state: "queued",
          retries: 0,
        });
      }
      continue;
    }

    const task = tasks.get(event.id);
    if (!task) {
      continue;
    }

    if (event.ev === "claim" && task.state === "queued" && typeof event.agentKey === "string") {
      task.state = "claimed";
      task.agentKey = event.agentKey;
      task.updatedAt = event.ts;
      continue;
    }

    if (event.ev === "done" && task.state === "claimed") {
      task.state = "done";
      task.result = event.result;
      task.updatedAt = event.ts;
      continue;
    }

    if (event.ev === "fail" && task.state === "claimed") {
      task.state = "failed";
      task.lastError = typeof event.error === "string" ? event.error : "Unknown error";
      task.updatedAt = event.ts;
      continue;
    }

    if (event.ev === "retry" && (task.state === "claimed" || task.state === "failed")) {
      task.state = "queued";
      task.retries += 1;
      if (typeof event.error === "string") {
        task.lastError = event.error;
      }
      task.updatedAt = event.ts;
      continue;
    }

    if (event.ev === "cancel" && task.state === "queued") {
      task.state = "cancelled";
      task.updatedAt = event.ts;
    }
  }

  return [...tasks.values()];
}

function requireTask(orchDir: string, id: string): TaskRec {
  const task = replay(orchDir).find((candidate) => candidate.id === id);
  if (!task) {
    throw new Error(`Unknown queue task: ${id}`);
  }
  return task;
}

export function addTask(orchDir: string, text: string, opts: TaskOptions = {}): TaskRec {
  const id = randomUUID();
  const ts = new Date().toISOString();
  appendEvent(orchDir, { ev: "add", id, ts, text, opts });
  return {
    id,
    text,
    opts,
    createdAt: ts,
    updatedAt: ts,
    state: "queued",
    retries: 0,
  };
}

export function listTasks(orchDir: string): TaskRec[] {
  return replay(orchDir);
}

export function history(orchDir: string): TaskRec[] {
  return replay(orchDir).filter((task) => task.state === "done" || task.state === "failed" || task.state === "cancelled");
}

export function cancelTask(orchDir: string, id: string): TaskRec {
  const task = requireTask(orchDir, id);
  if (task.state !== "queued") {
    return { ...task, error: `Cannot cancel ${task.state} task` };
  }

  appendEvent(orchDir, { ev: "cancel", id, ts: new Date().toISOString() });
  return requireTask(orchDir, id);
}

export function claimTask(orchDir: string, id: string, agentKey: string): boolean {
  if (requireTask(orchDir, id).state !== "queued") {
    return false;
  }

  ensureQueueDirs(orchDir);
  const claimPath = join(claimsDir(orchDir), id);
  let handle: number;
  try {
    handle = openSync(claimPath, "wx");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return false;
    }
    throw error;
  }

  try {
    writeFileSync(handle, `${agentKey}\n`);
    appendEvent(orchDir, { ev: "claim", id, ts: new Date().toISOString(), agentKey });
    return true;
  } catch (error) {
    unlinkSync(claimPath);
    throw error;
  } finally {
    closeSync(handle);
  }
}

export function releaseClaim(orchDir: string, id: string): void {
  const claimPath = join(claimsDir(orchDir), id);
  if (existsSync(claimPath)) {
    unlinkSync(claimPath);
  }
}

function settleTaskEvent(orchDir: string, id: string, event: Omit<QueueEvent, "id" | "ts">, returnTask: true): TaskRec;
function settleTaskEvent(orchDir: string, id: string, event: Omit<QueueEvent, "id" | "ts">, returnTask?: false): void;
function settleTaskEvent(orchDir: string, id: string, event: Omit<QueueEvent, "id" | "ts">, returnTask = false): TaskRec | void {
  releaseClaim(orchDir, id);
  appendEvent(orchDir, { ...event, id, ts: new Date().toISOString() });
  if (returnTask) {
    return requireTask(orchDir, id);
  }
}

export function unclaimTask(orchDir: string, id: string): void { settleTaskEvent(orchDir, id, { ev: "retry" }); }

// FIFO pick among queued tasks whose constraints the candidate agent satisfies.
// Constraint matching is by task.opts.agent (exact adapter/agent name) only for
// now; richer constraints ride in opts.constraints once adapters land.
export function nextQueuedTask(tasks: TaskRec[], agentName?: string): TaskRec | undefined {
  return tasks
    .filter((task) => task.state === "queued")
    .filter((task) => !task.opts.agent || task.opts.agent === agentName)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
}

export function taskShouldRetry(task: TaskRec, maxRetries: number): boolean {
  return task.retries < maxRetries;
}

export function requeueTask(orchDir: string, id: string, error: string): TaskRec { return settleTaskEvent(orchDir, id, { ev: "retry", error }, true); }

export function recordTaskDone(orchDir: string, id: string, result?: unknown): TaskRec { return settleTaskEvent(orchDir, id, { ev: "done", result }, true); }

export function recordTaskFailure(orchDir: string, id: string, error: string): TaskRec { return settleTaskEvent(orchDir, id, { ev: "fail", error }, true); }
