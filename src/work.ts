import { execFileSync } from "node:child_process";
import { herdrBestEffort } from "./herdr.ts";
import {
  claimTask,
  listTasks,
  nextQueuedTask,
  recordTaskDone,
  recordTaskFailure,
  requeueTask,
  taskShouldRetry,
  type TaskRec,
} from "./queue.ts";
import { emitAndNotify, derivePresenceTransition, type PresenceMetadata } from "./daemon/events.ts";
import { loadSinks, type NotifyEvent } from "./notify.ts";
import { loadPresence, statusForPresence, type PresenceEntry } from "./store.ts";
import { workspaceOf } from "./policy/workspace.ts";
import type { OrchConfig } from "./config.ts";

const WORKER_PROMPT_HEADER = "[orch worker] No human watches this pane. For any decision you cannot make yourself, call orch_ask and wait for the orchestrator. NEVER use ask-user/question tools.";

export interface WorkOptions {
  orchDir: string;
  pollIntervalMs: number;
  signal?: AbortSignal;
  once?: boolean;
  continuous?: boolean;
  /** Suppress human progress output for machine-readable callers. */
  json?: boolean;
  maxRetries?: number;
  /** Return the latest config for each loop iteration. */
  getConfig?: () => OrchConfig;
  dispatch?: (entry: PresenceEntry, task: TaskRec) => Promise<void>;
  /** Emit canonical work lifecycle events through the daemon fan-out. */
  onEvent?: (event: NotifyEvent) => void;
}

function agentIdle(entry: PresenceEntry): boolean {
  const state = entry.status?.state;
  return entry.alive && (state === "idle" || state === "done");
}

function sleepMs(ms: number): void {
  try { execFileSync("sleep", [String(ms / 1000)], { stdio: "ignore" }); } catch {}
}

function waitForWorking(entry: PresenceEntry, timeoutMs: number): string | null {
  const deadline = Date.now() + timeoutMs;
  let state: string | null = null;
  do {
    state = statusForPresence(entry)?.state ?? null;
    if (state === "working") return state;
    if (Date.now() >= deadline) return state;
    sleepMs(250);
  } while (true);
}

async function dispatchTask(options: WorkOptions, entry: PresenceEntry, task: TaskRec): Promise<void> {
  await Promise.resolve();
  const prompt = `${WORKER_PROMPT_HEADER}\n\n${task.text}`;
  herdrBestEffort(["pane", "run", entry.key, prompt]);
  let status = waitForWorking(entry, 10_000);
  let retried = false;
  if (status !== "working") {
    retried = true;
    herdrBestEffort(["pane", "run", entry.key, prompt]);
    status = waitForWorking(entry, 10_000);
  }
  if (!options.json) process.stdout.write(`Dispatched to ${entry.key} → status: ${status ?? "unknown"}${retried ? " (retried)" : ""}\n`);
}

async function waitForTaskState(entry: PresenceEntry, timeoutMs: number): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = statusForPresence(entry)?.state;
    if (state === "working" || state === "done" || state === "error") return state;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return "timeout";
}

function taskEvent(entry: PresenceEntry, task: TaskRec, oldState: string, newState: string, lastError?: string): NotifyEvent {
  const status = statusForPresence(entry);
  return {
    key: entry.key,
    workspace: task.workspace ?? workspaceOf(entry.key) ?? entry.key.split(":", 1)[0],
    agent: status?.label ?? status?.agent ?? task.agentKey ?? null,
    tab: status?.tabLabel ?? null,
    model: null,
    oldState,
    newState,
    task: task.text,
    ts: task.updatedAt,
    lastError,
  };
}

function settleClaimedTasks(orchDir: string, maxRetries: number, emit: (event: NotifyEvent) => void): void {
  const presence = loadPresence();
  for (const task of listTasks(orchDir)) {
    if (task.state !== "claimed" || !task.agentKey) continue;
    const agent = presence.get(task.agentKey);
    const status = agent ? statusForPresence(agent) : null;
    if (status?.state === "done" && agent) {
      const settled = recordTaskDone(orchDir, task.id, agent.result);
      emit(taskEvent(agent, settled, task.state, settled.state));
    }
    if (status?.state === "error" && agent) settleError(orchDir, task, maxRetries, typeof status.lastError === "string" ? status.lastError : "agent reported error", agent, emit);
  }
}

function settleError(orchDir: string, task: TaskRec, maxRetries: number, error: string, entry: PresenceEntry, emit: (event: NotifyEvent) => void): void {
  const settled = taskShouldRetry(task, maxRetries)
    ? requeueTask(orchDir, task.id, error)
    : recordTaskFailure(orchDir, task.id, error);
  emit(taskEvent(entry, settled, task.state, settled.state, error));
}

async function assignTask(options: WorkOptions, entry: PresenceEntry, task: TaskRec, maxRetries: number, emit: (event: NotifyEvent) => void): Promise<void> {
  try {
    await (options.dispatch ?? ((entry, task) => dispatchTask(options, entry, task)))(entry, task);
    const state = await waitForTaskState(entry, 10_000);
    const current = listTasks(options.orchDir).find((item) => item.id === task.id) ?? task;
    if (state === "timeout") {
      const requeued = requeueTask(options.orchDir, task.id, "agent did not acknowledge working");
      emit(taskEvent(entry, requeued, current.state, requeued.state, requeued.lastError));
      return;
    }
    if (state === "error") return settleError(options.orchDir, current, maxRetries, "agent reported error", entry, emit);
    if (state === "done") {
      const done = recordTaskDone(options.orchDir, task.id, loadPresence().get(entry.key)?.result);
      emit(taskEvent(entry, done, current.state, done.state));
    }
  } catch (error) {
    const current = listTasks(options.orchDir).find((item) => item.id === task.id) ?? task;
    settleError(options.orchDir, current, maxRetries, String(error), entry, emit);
  }
}

export async function runWorkLoop(options: WorkOptions): Promise<void> {
  const emit = options.onEvent ?? ((event: NotifyEvent): void => {
    emitAndNotify(() => { /* noop */ }, loadSinks(options.orchDir), event);
  });
  const states = new Map<string, string>();
  while (!options.signal?.aborted) {
    const config = options.getConfig?.();
    const maxRetries = config?.queue.max_retries ?? options.maxRetries ?? 1;
    const presence = loadPresence();
    for (const entry of presence.values()) {
      const status = entry.status;
      const metadata: PresenceMetadata = {
        name: status?.label ?? status?.agent ?? null,
        tab: status?.tabLabel ?? null,
        pid: status?.pid,
      };
      const event = derivePresenceTransition(entry.key, status, metadata, states);
      if (event) emit(event);
    }
    settleClaimedTasks(options.orchDir, maxRetries, emit);
    let assigned = 0;
    for (const entry of [...presence.values()].filter(agentIdle)) {
      // A worker may claim tasks from its own workspace and legacy unscoped
      // tasks only; nextQueuedTask enforces this origin-workspace wall.
      const workerWorkspace = workspaceOf(entry.key) ?? entry.key.split(":", 1)[0];
      const task = nextQueuedTask(
        listTasks(options.orchDir),
        entry.status?.agent ?? "pi",
        workerWorkspace,
      );
      if (!task || !claimTask(options.orchDir, task.id, entry.key)) continue;
      assigned++;
      const claimed = listTasks(options.orchDir).find((item) => item.id === task.id) ?? { ...task, state: "claimed" as const, agentKey: entry.key };
      emit(taskEvent(entry, claimed, task.state, claimed.state));
      await assignTask(options, entry, task, maxRetries, emit);
      if (options.once || options.signal?.aborted) break;
    }
    if (options.once) {
      settleClaimedTasks(options.orchDir, maxRetries, emit);
      return;
    }
    const claimed = listTasks(options.orchDir).some((task) => task.state === "claimed");
    if (assigned === 0 && !claimed && !options.continuous) return;
    await abortableDelay(options.pollIntervalMs, options.signal);
  }
}

function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}
