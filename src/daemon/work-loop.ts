import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { deliverControl } from "../control/dispatch.ts";
import { errorMessage, pidAlive } from "../util.ts";
import {
  claimTask,
  listTasks,
  nextQueuedTask,
  recordTaskDone,
  recordTaskFailure,
  requeueTask,
  taskShouldRetry,
  type TaskRec,
} from "../queue.ts";
import { emitAndNotify } from "./events.ts";
import { loadSinks } from "../notify/router.ts";
import { type NotifyEvent } from "../notify/format.ts";
import { loadPresence, statusForPresence, type PresenceEntry } from "../presence/store.ts";
import { workspaceOf } from "../policy/workspace.ts";
import { loadConfig, type OrchConfig } from "../config.ts";
import { workerHeaderFor } from "../worker-prompt.ts";
import { getAdapter } from "../adapters/registry.ts";
import { spawnedRecords } from "../presence/store.ts";
import { sweepExpiredRows } from "./retention.ts";

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

/** True when the agent's reported status speaks for THIS task's dispatch: the ids
 *  match, or the bridge reports none at all (hook-based harnesses cannot attribute
 *  one). A status carrying a DIFFERENT id is another prompt's — an orchestrator's
 *  own dispatch, say — and settling from it is how results crossed wires. */
export function statusSpeaksForTask(status: { dispatchId?: string } | null, task: TaskRec): boolean {
  if (!status) return false;
  return status.dispatchId === undefined || status.dispatchId === task.dispatchId;
}

function waitForWorking(entry: PresenceEntry, task: TaskRec, timeoutMs: number): string | null {
  const deadline = Date.now() + timeoutMs;
  let state: string | null = null;
  do {
    const status = statusForPresence(entry);
    state = status?.state ?? null;
    if (state === "working" && statusSpeaksForTask(status, task)) return state;
    if (Date.now() >= deadline) return state;
    sleepMs(250);
  } while (true);
}

async function dispatchTask(options: WorkOptions, entry: PresenceEntry, task: TaskRec): Promise<void> {
  const adapterId = spawnedRecords().get(entry.key)?.adapter ?? entry.status?.agent;
  const lockedCommands = (options.getConfig?.() ?? loadConfig(options.orchDir)).locked_commands;
  // The daemon is not this agent's spawner; the agent's own record names it. Only a
  // spawner still writing live presence can receive the reply the clause instructs.
  const spawnerKey = spawnedRecords().get(entry.key)?.spawnedBy ?? entry.status?.spawnedBy;
  const spawnerRepliable = typeof spawnerKey === "string" && pidAlive(loadPresence().get(spawnerKey)?.status?.pid);
  const header = workerHeaderFor(adapterId ? getAdapter(adapterId) : undefined, { lockedCommands, spawnerRepliable });
  const prompt = `${header}\n\n${task.text}`;
  // The claim's dispatch id rides every attempt: the bridge acks per id, so a
  // retry of the same id can never deliver the prompt twice, and the agent's
  // status/result echo the id the settle path verifies against.
  const dispatchId = task.dispatchId ?? randomUUID();
  const sendPrompt = () => deliverControl(entry.key, { kind: "run", text: prompt, id: dispatchId });
  const dispatchAckTimeoutMs = (options.getConfig?.() ?? loadConfig(options.orchDir)).timeouts.dispatch_ack_ms;
  try {
    await sendPrompt();
    let status = waitForWorking(entry, task, dispatchAckTimeoutMs);
    let retried = false;
    if (status !== "working") {
      retried = true;
      await sendPrompt();
      status = waitForWorking(entry, task, dispatchAckTimeoutMs);
    }
    if (!options.json) process.stdout.write(`Dispatched to ${entry.key} -> status: ${status ?? "unknown"}${retried ? " (retried)" : ""}\n`);
  } catch (error) {
    process.stderr.write(`Warning: cannot dispatch ${entry.key}: ${errorMessage(error)}\n`);
  }
}

async function waitForTaskState(entry: PresenceEntry, task: TaskRec, timeoutMs: number): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = statusForPresence(entry);
    const state = status?.state;
    if ((state === "working" || state === "done" || state === "error") && statusSpeaksForTask(status, task)) return state;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return "timeout";
}

function taskEvent(orchDir: string, entry: PresenceEntry, task: TaskRec, oldState: string, newState: string, lastError?: string): NotifyEvent {
  const status = statusForPresence(entry);
  return {
    key: entry.key,
    workspace: task.workspace ?? workspaceOf(orchDir, entry.key) ?? undefined,
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

/** Fail a task whose bound agent can no longer run it. NEVER a requeue: the
 *  binding is the whole point — a task freed here would land on whatever idle
 *  pane happens to exist, running a prompt its orchestrator never sent it. */
function failBoundTask(orchDir: string, task: TaskRec, reason: string, emit: (event: NotifyEvent) => void, entry?: PresenceEntry): void {
  const settled = recordTaskFailure(orchDir, task.id, reason);
  if (entry) emit(taskEvent(orchDir, entry, settled, task.state, settled.state, reason));
}

function settleClaimedTasks(orchDir: string, maxRetries: number, emit: (event: NotifyEvent) => void): void {
  const presence = loadPresence();
  for (const task of listTasks(orchDir)) {
    if ((task.state !== "claimed" && task.state !== "queued") || !task.agentKey) continue;
    const agent = presence.get(task.agentKey);
    // The bound agent is gone: the task dies with it rather than re-binding to
    // whichever new pane shows up under a matching name (the stale-task bite).
    if (!agent || !agent.alive) {
      failBoundTask(orchDir, task, `bound agent ${task.agentKey} is gone; a claimed task never re-binds`, emit, agent);
      continue;
    }
    if (task.state !== "claimed") continue;
    const status = statusForPresence(agent);
    if (!statusSpeaksForTask(status, task)) continue;
    if (status?.state === "done") {
      const settled = recordTaskDone(orchDir, task.id, agent.result);
      emit(taskEvent(orchDir, agent, settled, task.state, settled.state));
    }
    if (status?.state === "error") settleError(orchDir, task, maxRetries, typeof status?.lastError === "string" ? status.lastError : "agent reported error", agent, emit);
  }
}

function settleError(orchDir: string, task: TaskRec, maxRetries: number, error: string, entry: PresenceEntry, emit: (event: NotifyEvent) => void): void {
  const settled = taskShouldRetry(task, maxRetries)
    ? requeueTask(orchDir, task.id, error)
    : recordTaskFailure(orchDir, task.id, error);
  emit(taskEvent(orchDir, entry, settled, task.state, settled.state, error));
}

async function assignTask(options: WorkOptions, entry: PresenceEntry, task: TaskRec, maxRetries: number, emit: (event: NotifyEvent) => void): Promise<void> {
  try {
    await (options.dispatch ?? ((entry, task) => dispatchTask(options, entry, task)))(entry, task);
    const dispatchAckTimeoutMs = (options.getConfig?.() ?? loadConfig(options.orchDir)).timeouts.dispatch_ack_ms;
    const state = await waitForTaskState(entry, task, dispatchAckTimeoutMs);
    const current = listTasks(options.orchDir).find((item) => item.id === task.id) ?? task;
    if (state === "timeout") {
      const requeued = requeueTask(options.orchDir, task.id, "agent did not acknowledge working");
      emit(taskEvent(options.orchDir, entry, requeued, current.state, requeued.state, requeued.lastError));
      return;
    }
    if (state === "error") return settleError(options.orchDir, current, maxRetries, "agent reported error", entry, emit);
    if (state === "done") {
      const done = recordTaskDone(options.orchDir, task.id, loadPresence().get(entry.key)?.result);
      emit(taskEvent(options.orchDir, entry, done, current.state, done.state));
    }
  } catch (error) {
    const current = listTasks(options.orchDir).find((item) => item.id === task.id) ?? task;
    settleError(options.orchDir, current, maxRetries, String(error), entry, emit);
  }
}

/** Drive the task queue: claim queued work for idle agents and settle what they finish.
 *  It emits TASK events only — presence transitions belong to `startPresenceWatch`, and
 *  deriving them here too is what published every agent transition twice. */
export async function runWorkLoop(options: WorkOptions): Promise<void> {
  const emit = options.onEvent ?? ((event: NotifyEvent): void => {
    emitAndNotify(() => { /* noop */ }, loadSinks(options.orchDir), event);
  });
  const sweepIntervalMs = 60 * 60 * 1000;
  let lastSweepAt = Number.NEGATIVE_INFINITY;
  while (!options.signal?.aborted) {
    const config = options.getConfig?.();
    if (config !== undefined) {
      const nowMs = Date.now();
      if (nowMs - lastSweepAt >= sweepIntervalMs) {
        lastSweepAt = nowMs;
        const counts = sweepExpiredRows(options.orchDir, config, new Date(nowMs));
        if (Object.values(counts).some((count) => count > 0)) {
          process.stderr.write(`retention sweep: queue=${counts.queue} outbox=${counts.outbox} events=${counts.events} runs=${counts.runs} identities=${counts.identities} agent_dirs=${counts.agent_dirs} logs=${counts.logs}\n`);
        }
      }
    }
    const maxRetries = config?.queue.max_retries ?? options.maxRetries ?? 1;
    const presence = loadPresence();
    settleClaimedTasks(options.orchDir, maxRetries, emit);
    let assigned = 0;
    for (const entry of [...presence.values()].filter(agentIdle)) {
      // A worker claims only queued tasks stamped with its own workspace;
      // nextQueuedTask enforces that origin-workspace wall and skips
      // null-workspace rows as malformed (never claimable).
      // No placement means orch has no registry row for this agent, and
      // nextQueuedTask skips its workspace filter entirely on an absent one —
      // so an unplaced worker would claim across every workspace. Fail closed.
      const workerWorkspace = workspaceOf(options.orchDir, entry.key);
      const workerAgent = entry.status?.agent;
      if (!workerAgent || !workerWorkspace) continue;
      const task = nextQueuedTask(
        listTasks(options.orchDir),
        workerAgent,
        workerWorkspace,
        entry.key,
      );
      const dispatchId = randomUUID();
      if (!task || !claimTask(options.orchDir, task.id, entry.key, dispatchId)) continue;
      assigned++;
      const claimed = listTasks(options.orchDir).find((item) => item.id === task.id) ?? { ...task, state: "claimed" as const, agentKey: entry.key, dispatchId };
      emit(taskEvent(options.orchDir, entry, claimed, task.state, claimed.state));
      await assignTask(options, entry, claimed, maxRetries, emit);
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
