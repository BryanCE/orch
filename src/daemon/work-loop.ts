import { randomUUID } from "node:crypto";
import { deliverControl } from "../control/dispatch.ts";
import { errorMessage, pidAlive } from "../util.ts";
import {
  claimTask,
  listTasks,
  nextQueuedTask,
  requireTask,
  recordTaskDone,
  recordTaskFailure,
  type TaskRec,
} from "../queue.ts";
import { emitAndNotify } from "./events.ts";
import { deliverTaskResult } from "./result-delivery.ts";
import { loadPresence, statusForPresence } from "../presence/store.ts";
import { loadConfig } from "../config.ts";
import { workerHeaderFor } from "../worker-prompt.ts";
import { getAdapter } from "../adapters/registry.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import { agentById } from "../store/agent-rows.ts";
import { agentView } from "../store/agent-view.ts";
import { sweepExpiredRows } from "./retention.ts";
import { decisionLogger } from "./decision-log.ts";
import type { PresenceEntry } from "../types/presence.ts";
import type { NotifyEvent } from "../types/notify.ts";
import type { OrchConfig } from "../types/config.ts";

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

/** One idle process, and the agent orch minted for it. */
interface Runner {
  entry: PresenceEntry;
  agentId: string;
}

/** A presence key IS the minted id and carries nothing else — the plexer and the
 *  space are environment, read through the composer (`src/store/agent-view.ts`)
 *  and never parsed back out of an address.
 *
 *  Cq8: an idle process whose id names no live registered agent is precisely the
 *  foreign runner the old code handed work to. It has no row, so it has no pack,
 *  so no scope contains it. */
function runnerOf(orchDir: string, entry: PresenceEntry): Runner | null {
  const agentId = tryParseIdentity(entry.key)?.id;
  if (agentId === undefined) return null;
  const agent = agentById(orchDir, agentId);
  if (!agent || agent.ending != null) return null;
  return { entry, agentId };
}

/** Every live process orch has a row for, addressable by the id its attempts carry. */
function runnersByAgent(orchDir: string, presence: Map<string, PresenceEntry>): Map<string, Runner> {
  const runners = new Map<string, Runner>();
  for (const entry of presence.values()) {
    const runner = runnerOf(orchDir, entry);
    if (runner) runners.set(runner.agentId, runner);
  }
  return runners;
}


/** True when the agent's reported status speaks for THIS task's dispatch: the ids
 *  match, or the bridge reports none at all (hook-based harnesses cannot attribute
 *  one). A status carrying a DIFFERENT id is another prompt's — an orchestrator's
 *  own dispatch, say — and settling from it is how results crossed wires. */
function currentAttempt(task: TaskRec) {
  return task.attempts.at(-1);
}

export function statusSpeaksForTask(status: { dispatchId?: string } | null, task: TaskRec): boolean {
  if (!status) return false;
  return status.dispatchId === undefined || status.dispatchId === currentAttempt(task)?.dispatchId;
}

async function waitForWorking(entry: PresenceEntry, task: TaskRec, timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  let state: string | null = null;
  do {
    const status = statusForPresence(entry);
    state = status?.state ?? null;
    if (state === "working" && statusSpeaksForTask(status, task)) return state;
    if (Date.now() >= deadline) return state;
    await abortableDelay(250);
  } while (true);
}

async function dispatchTask(options: WorkOptions, entry: PresenceEntry, task: TaskRec): Promise<void> {
  // The key is the identity; everything else about the agent is COMPOSED from
  // the tables that own each fact, never decoded out of the address.
  const runnerId = currentAttempt(task)?.agentId ?? tryParseIdentity(entry.key)?.id;
  const view = runnerId === undefined ? null : agentView(options.orchDir, runnerId);
  const adapterId = view?.harnessId ?? entry.status?.agent;
  const lockedCommands = (options.getConfig?.() ?? loadConfig(options.orchDir)).locked_commands;
  // The daemon is not this agent's spawner; provenance names it. Only a spawner
  // still writing live presence can receive the reply the clause instructs, and
  // a presence key is that spawner's minted id.
  const spawnerKey = view?.spawnedBy ?? entry.status?.spawnedBy;
  const spawnerRepliable = typeof spawnerKey === "string" && pidAlive(loadPresence().get(spawnerKey)?.status?.pid);
  const header = workerHeaderFor(adapterId ? getAdapter(adapterId) : undefined, { lockedCommands, spawnerRepliable });
  const prompt = `${header}\n\n${task.text}`;
  // The claim's dispatch id rides every attempt: the bridge acks per id, so a
  // retry of the same id can never deliver the prompt twice, and the agent's
  // status/result echo the id the settle path verifies against.
  const dispatchId = currentAttempt(task)?.dispatchId ?? randomUUID();
  const correlated = decisionLogger(options.orchDir).forCorrelation(dispatchId);
  const log = runnerId === undefined ? correlated : correlated.forAgent(runnerId);
  const sendPrompt = async (): Promise<void> => {
    log.info("dispatch.delivering", { target: entry.key, handle: entry.key });
    const outcome = await deliverControl(entry.key, { kind: "run", text: prompt, id: dispatchId });
    if (outcome.outcome === "answer") {
      log.debug("boundary.answer", { target: entry.key, reason: outcome.reason });
    }
  };
  const dispatchAckTimeoutMs = (options.getConfig?.() ?? loadConfig(options.orchDir)).timeouts.dispatch_ack_ms;
  try {
    await sendPrompt();
    let status = await waitForWorking(entry, task, dispatchAckTimeoutMs);
    let retried = false;
    if (status !== "working") {
      retried = true;
      log.debug("retry.attempt", { target: entry.key, attempt: 2, delay: 0 });
      await sendPrompt();
      status = await waitForWorking(entry, task, dispatchAckTimeoutMs);
    }
    if (!options.json) process.stdout.write(`Dispatched to ${entry.key} -> status: ${status ?? "unknown"}${retried ? " (retried)" : ""}\n`);
  } catch (error) {
    log.error("dispatch.failed", { target: entry.key, error: errorMessage(error) });
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

function taskEvent(entry: PresenceEntry, task: TaskRec, oldState: string, newState: string, lastError?: string): NotifyEvent {
  const status = statusForPresence(entry);
  return {
    // Cq4: the lifecycle/result event belongs to the enqueuer, not the runner.
    key: task.enqueuedBy,
    space: task.scopeSpaceId ?? undefined,
    agent: status?.label ?? status?.agent ?? currentAttempt(task)?.agentId ?? null,
    tab: status?.tabLabel ?? null,
    model: null,
    oldState,
    newState,
    task: task.text,
    ts: task.updatedAt,
    lastError,
  };
}

function settleClaimedTasks(orchDir: string, emit: (event: NotifyEvent) => void): void {
  const runners = runnersByAgent(orchDir, loadPresence());
  for (const task of listTasks(orchDir)) {
    if (task.state !== "claimed") continue;
    const attempt = currentAttempt(task);
    if (!attempt) continue;
    const agent = runners.get(attempt.agentId)?.entry;
    // Failure closes this attempt. Scope, not the former runner, decides where
    // a retry may land; pack work therefore survives one member disappearing.
    if (!agent || !agent.alive) {
      const settled = recordTaskFailure(orchDir, task.id, `claiming agent ${attempt.agentId} is gone`);
      if (agent) emit(taskEvent(agent, settled, task.state, settled.state, attempt.error ?? undefined));
      continue;
    }
    const status = statusForPresence(agent);
    if (!statusSpeaksForTask(status, task)) continue;
    if (status?.state === "done") {
      const settled = recordTaskDone(orchDir, task.id, agent.result);
      deliverTaskResult(orchDir, task.id);
      emit(taskEvent(agent, settled, task.state, settled.state));
    }
    if (status?.state === "error") settleError(orchDir, task, typeof status?.lastError === "string" ? status.lastError : "agent reported error", agent, emit);
  }
}

function settleError(orchDir: string, task: TaskRec, error: string, entry: PresenceEntry, emit: (event: NotifyEvent) => void): void {
  // A failed attempt remains derived as failed until the next attempt INSERT.
  // Selection policy below enforces max_retries + 1 total attempts.
  const settled = recordTaskFailure(orchDir, task.id, error);
  // Cq4: a failure reports back too — silence is the worst outcome for the
  // orch that asked, and it may be in another pack with nothing else to read.
  deliverTaskResult(orchDir, task.id);
  emit(taskEvent(entry, settled, task.state, settled.state, error));
}

async function assignTask(options: WorkOptions, entry: PresenceEntry, task: TaskRec, emit: (event: NotifyEvent) => void): Promise<void> {
  try {
    await (options.dispatch ?? ((entry, task) => dispatchTask(options, entry, task)))(entry, task);
    const dispatchAckTimeoutMs = (options.getConfig?.() ?? loadConfig(options.orchDir)).timeouts.dispatch_ack_ms;
    const state = await waitForTaskState(entry, task, dispatchAckTimeoutMs);
    const current = requireTask(options.orchDir, task.id);
    if (state === "timeout") {
      const failed = recordTaskFailure(options.orchDir, task.id, "agent did not acknowledge working");
      emit(taskEvent(entry, failed, current.state, failed.state, "agent did not acknowledge working"));
      return;
    }
    if (state === "error") return settleError(options.orchDir, current, "agent reported error", entry, emit);
    if (state === "done") {
      const done = recordTaskDone(options.orchDir, task.id, loadPresence().get(entry.key)?.result);
      deliverTaskResult(options.orchDir, task.id);
      emit(taskEvent(entry, done, current.state, done.state));
    }
  } catch (error) {
    const current = requireTask(options.orchDir, task.id);
    settleError(options.orchDir, current, String(error), entry, emit);
  }
}

/** Drive the task queue: claim queued work for idle agents and settle what they finish.
 *  It emits TASK events only — presence transitions belong to `startPresenceWatch`, and
 *  deriving them here too is what published every agent transition twice. */
export async function runWorkLoop(options: WorkOptions): Promise<void> {
  const emit = options.onEvent ?? ((event: NotifyEvent): void => {
    emitAndNotify(() => { /* noop */ }, loadConfig(options.orchDir).notify, event);
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
          process.stderr.write(`retention sweep: queue=${counts.queue} outbox=${counts.outbox} events=${counts.events} runs=${counts.runs} ended_agents=${counts.ended_agents} logs=${counts.logs}\n`);
        }
      }
    }
    const maxRetries = config?.queue.max_retries ?? options.maxRetries ?? 1;
    const presence = loadPresence();
    settleClaimedTasks(options.orchDir, emit);
    let assigned = 0;
    const tasks = listTasks(options.orchDir);
    const idle = [...presence.values()].filter(agentIdle)
      .map((entry) => runnerOf(options.orchDir, entry))
      .filter((runner): runner is Runner => runner !== null);
    for (const { entry, agentId } of idle) {
      // The facade resolves agent/pack/space eligibility from the registered
      // agent id and open pack intake. A foreign pack never sees this task.
      const task = nextQueuedTask(options.orchDir, agentId, maxRetries, tasks);
      const dispatchId = randomUUID();
      if (!task || !claimTask(options.orchDir, task.id, agentId, dispatchId)) continue;
      assigned++;
      const claimed = requireTask(options.orchDir, task.id);
      emit(taskEvent(entry, claimed, task.state, claimed.state));
      await assignTask(options, entry, claimed, emit);
      if (options.once || options.signal?.aborted) break;
    }
    if (options.once) {
      settleClaimedTasks(options.orchDir, emit);
      return;
    }
    const claimed = tasks.some((task) => task.state === "claimed");
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
