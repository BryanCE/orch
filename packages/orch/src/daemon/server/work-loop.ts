import type { OrchDir } from "../../types/core.ts";
import { randomUUID } from "node:crypto";
import { deliverControl } from "../../control/dispatch.ts";
import { errorMessage, mapWithLimit } from "../../util.ts";
import {
  claimTask,
  listTasks,
  nextQueuedTask,
  requireTask,
  recordTaskDone,
  recordTaskFailure,
  type TaskRec,
} from "../../queue.ts";
import { emitAndNotify } from "./events.ts";
import { askingEventFromRow } from "./status-events.ts";
import { deliverTaskResult } from "./result-delivery.ts";
import { loadPresence } from "../../presence/store.ts";
import { pendingQuestions, type QuestionRow } from "../../store/question-rows.ts";
import { selectAgentStatus } from "../../store/status-rows.ts";
import { workerHeaderFor, workerRules } from "../../worker-prompt.ts";
import { abstractAgentLabel } from "../../notify/format.ts";
import { getAdapter } from "../../adapters/registry.ts";
import { isAgentId } from "../../backends/identity.ts";
import { agentById } from "../../store/agent-rows.ts";
import { agentProcessLive } from "../../store/interval-rows.ts";
import { agentView } from "../../store/agent-view.ts";
import { sweepExpiredRows } from "./retention.ts";
import { decisionLogger } from "../client/decision-log.ts";
import type { PresenceEntry } from "../../types/presence.ts";
import type { NotifyEvent } from "../../types/notify.ts";
import type { TaskState } from "../../types/queue.ts";
import type { WorkOptions } from "../../types/daemon.ts";
import { orchDirAt } from "../../services.ts";
export type { WorkOptions };

function agentIdle(entry: PresenceEntry): boolean {
  const state = entry.status?.state;
  return entry.alive && (state === "idle" || state === "done");
}

/** One idle process, and the agent orch minted for it. */
interface Runner {
  entry: PresenceEntry;
  agentId: string;
}

/** The agent behind an idle process, or null when orch has no live row for it.
 *  A process with no row belongs to no pack, so no scope reaches it and no
 *  queued task may go to it. */
function runnerOf(orchDir: OrchDir, entry: PresenceEntry): Runner | null {
  const agentId = isAgentId(entry.key) ? entry.key : undefined;
  if (agentId === undefined) return null;
  const agent = agentById(orchDir, agentId);
  if (!agent || agent.ending != null) return null;
  return { entry, agentId };
}

/** Every live process orch has a row for, addressable by the id its attempts carry. */
function runnersByAgent(orchDir: OrchDir, presence: Map<string, PresenceEntry>): Map<string, Runner> {
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

export function statusSpeaksForTask(status: { dispatchId?: string | null } | null, task: TaskRec): boolean {
  if (!status) return false;
  return status.dispatchId === null || status.dispatchId === undefined || status.dispatchId === currentAttempt(task)?.dispatchId;
}

/** The agent's status as the store holds it NOW. A presence entry is a snapshot
 *  taken before the dispatch; the report that answers it lands after. */
async function waitForWorking(options: WorkOptions, entry: PresenceEntry, task: TaskRec, timeoutMs: number): Promise<string | null> {
  const orchDir = orchDirAt(options.orchDir);
  const deadline = Date.now() + timeoutMs;
  let state: string | null = null;
  do {
    const status = selectAgentStatus(orchDir, entry.key) ?? null;
    state = status?.state ?? null;
    if (state === "working" && statusSpeaksForTask(status, task)) return state;
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) return state;
    await options.wake.next(remainingMs, options.signal);
  } while (true);
}

async function dispatchTask(options: WorkOptions, entry: PresenceEntry, task: TaskRec): Promise<void> {
  const orchDir = orchDirAt(options.orchDir);
  // The key is the identity; everything else about the agent is COMPOSED from
  // the tables that own each fact, never decoded out of the address.
  const runnerId = currentAttempt(task)?.agentId ?? (isAgentId(entry.key) ? entry.key : undefined);
  const view = runnerId === undefined ? null : agentView(orchDir, runnerId);
  const adapterId = view?.harnessId;
  const rules = workerRules(options.settings.current());
  // The daemon is not this agent's spawner; provenance names it. Only a spawner
  // still writing live presence can receive the reply the clause instructs, and
  // a presence key is that spawner's minted id.
  const spawnerKey = view?.spawnedBy;
  const spawnerRepliable = typeof spawnerKey === "string" && agentProcessLive(orchDir, spawnerKey);
  const header = workerHeaderFor(adapterId ? getAdapter(adapterId) : undefined, { spawnerRepliable, ...rules });
  const prompt = `${header}\n\n${task.text}`;
  // The claim's dispatch id rides every attempt: the bridge acks per id, so a
  // retry of the same id can never deliver the prompt twice, and the agent's
  // status/result echo the id the settle path verifies against.
  const dispatchId = currentAttempt(task)?.dispatchId ?? randomUUID();
  const correlated = decisionLogger(orchDir, options.settings.current()).forCorrelation(dispatchId);
  const log = runnerId === undefined ? correlated : correlated.forAgent(runnerId);
  const sendPrompt = async (): Promise<void> => {
    log.info("dispatch.delivering", { target: entry.key, handle: entry.key });
    const outcome = await deliverControl(orchDir, options.settings.current(), options.models, entry.key, { kind: "run", text: prompt, id: dispatchId });
    if (outcome.outcome === "answer") {
      log.debug("boundary.answer", { target: entry.key, reason: outcome.reason });
    }
  };
  const dispatchAckTimeoutMs = options.settings.current().timeouts.dispatch_ack_ms;
  try {
    await sendPrompt();
    let status = await waitForWorking(options, entry, task, dispatchAckTimeoutMs);
    let retried = false;
    if (status !== "working") {
      retried = true;
      log.debug("retry.attempt", { target: entry.key, attempt: 2, delay: 0 });
      await sendPrompt();
      status = await waitForWorking(options, entry, task, dispatchAckTimeoutMs);
    }
    if (!options.json) process.stdout.write(`Dispatched to ${entry.key} -> status: ${status ?? "unknown"}${retried ? " (retried)" : ""}\n`);
  } catch (error) {
    log.error("dispatch.failed", { target: entry.key, error: errorMessage(error) });
  }
}

async function waitForTaskState(options: WorkOptions, entry: PresenceEntry, task: TaskRec, timeoutMs: number): Promise<string> {
  const orchDir = orchDirAt(options.orchDir);
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const status = selectAgentStatus(orchDir, entry.key) ?? null;
    const state = status?.state;
    if ((state === "working" || state === "done" || state === "error") && statusSpeaksForTask(status, task)) return state;
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) return "timeout";
    await options.wake.next(remainingMs, options.signal);
  }
}

function taskEvent(orchDir: OrchDir, entry: PresenceEntry, task: TaskRec, oldState: TaskState, newState: TaskState, lastError?: string): NotifyEvent {
  const view = agentView(orchDir, entry.key);
  const space = task.scopeSpaceId ?? undefined;
  const name = view?.name ?? null;
  return {
    type: "task",
    // Cq4: the lifecycle/result event belongs to the enqueuer, not the runner.
    key: task.enqueuedBy,
    space,
    agent: name ?? abstractAgentLabel(space ?? "space", entry.key),
    name,
    tab: null,
    model: null,
    oldState,
    newState,
    task: task.text,
    ts: task.updatedAt,
    lastError,
  };
}

function settleClaimedTasks(orchDir: OrchDir, settings: ReturnType<WorkOptions["settings"]["current"]>, emit: (event: NotifyEvent) => void): void {
  const runners = runnersByAgent(orchDir, loadPresence(orchDir));
  for (const task of listTasks(orchDir)) {
    if (task.state !== "claimed") continue;
    const attempt = currentAttempt(task);
    if (!attempt) continue;
    const agent = runners.get(attempt.agentId)?.entry;
    // Failure closes this attempt. Scope, not the former runner, decides where
    // a retry may land; pack work therefore survives one member disappearing.
    if (!agent || !agent.alive) {
      const settled = recordTaskFailure(orchDir, task.id, `claiming agent ${attempt.agentId} is gone`);
      if (agent) emit(taskEvent(orchDir, agent, settled, task.state, settled.state, attempt.error ?? undefined));
      continue;
    }
    const status = agent.status;
    if (!statusSpeaksForTask(status, task)) continue;
    if (status?.state === "done") {
      const settled = recordTaskDone(orchDir, task.id, agent.result);
      deliverTaskResult(orchDir, settings, task.id);
      emit(taskEvent(orchDir, agent, settled, task.state, settled.state));
    }
    if (status?.state === "error") settleError(orchDir, settings, task, status.lastError ?? "agent reported error", agent, emit);
  }
}

export interface QuestionReaskState {
  lastAskedAt: number;
  askCount: number;
  gaveUp: boolean;
}

export interface ReaskQuestionsOptions {
  questions: readonly QuestionRow[];
  nowMs: number;
  intervalMs: number;
  limit: number;
  state: Map<string, QuestionReaskState>;
  emit: (question: QuestionRow, askCount: number, gaveUp: boolean) => void;
}

/** Decide which open questions need another asking event. The store and clock are
 * injected so this policy remains deterministic and does not sleep in its tests. */
export function reaskQuestions(options: ReaskQuestionsOptions): void {
  const pendingIds = new Set(options.questions.map((question) => question.id));
  for (const id of options.state.keys()) {
    if (!pendingIds.has(id)) options.state.delete(id);
  }
  for (const question of options.questions) {
    const previous = options.state.get(question.id);
    const current = previous ?? { lastAskedAt: question.askedAt, askCount: 1, gaveUp: false };
    options.state.set(question.id, current);
    if (current.gaveUp || options.nowMs - current.lastAskedAt < options.intervalMs) continue;
    const askCount = Math.min(current.askCount + 1, options.limit);
    const gaveUp = askCount >= options.limit;
    options.state.set(question.id, { lastAskedAt: options.nowMs, askCount, gaveUp });
    options.emit(question, askCount, gaveUp);
  }
}

function reaskEvent(orchDir: OrchDir, question: QuestionRow, nowMs: number, askCount: number, gaveUp: boolean): NotifyEvent | null {
  const status = selectAgentStatus(orchDir, question.agentId);
  if (status === undefined) return null;
  const event = askingEventFromRow(
    orchDir,
    status,
    "asking",
    askCount,
    gaveUp,
    new Date(nowMs),
  );
  return { ...event, task: `Q: ${question.question}` };
}

function settleError(orchDir: OrchDir, settings: ReturnType<WorkOptions["settings"]["current"]>, task: TaskRec, error: string, entry: PresenceEntry, emit: (event: NotifyEvent) => void): void {
  // A failed attempt remains derived as failed until the next attempt INSERT.
  // Selection policy below enforces max_retries + 1 total attempts.
  const settled = recordTaskFailure(orchDir, task.id, error);
  // Cq4: a failure reports back too — silence is the worst outcome for the
  // orch that asked, and it may be in another pack with nothing else to read.
  deliverTaskResult(orchDir, settings, task.id);
  emit(taskEvent(orchDir, entry, settled, task.state, settled.state, error));
}

async function assignTask(options: WorkOptions, entry: PresenceEntry, task: TaskRec, emit: (event: NotifyEvent) => void): Promise<void> {
  const orchDir = orchDirAt(options.orchDir);
  try {
    await (options.dispatch ?? ((entry, task) => dispatchTask(options, entry, task)))(entry, task);
    const dispatchAckTimeoutMs = options.settings.current().timeouts.dispatch_ack_ms;
    const state = await waitForTaskState(options, entry, task, dispatchAckTimeoutMs);
    const current = requireTask(orchDir, task.id);
    if (state === "timeout") {
      const failed = recordTaskFailure(orchDir, task.id, "agent did not acknowledge working");
      emit(taskEvent(orchDir, entry, failed, current.state, failed.state, "agent did not acknowledge working"));
      return;
    }
    if (state === "error") return settleError(orchDir, options.settings.current(), current, "agent reported error", entry, emit);
    if (state === "done") {
      const done = recordTaskDone(orchDir, task.id, loadPresence(orchDir).get(entry.key)?.result);
      deliverTaskResult(orchDir, options.settings.current(), task.id);
      emit(taskEvent(orchDir, entry, done, current.state, done.state));
    }
  } catch (error) {
    const current = requireTask(orchDir, task.id);
    settleError(orchDir, options.settings.current(), current, String(error), entry, emit);
  }
}

/** Drive the task queue: claim queued work for idle agents and settle what they finish.
 *  It emits TASK events only — presence transitions belong to `startPresenceWatch`, and
 *  deriving them here too is what published every agent transition twice. */
export async function runWorkLoop(options: WorkOptions): Promise<void> {
  const orchDir = orchDirAt(options.orchDir);
  const emit = options.onEvent ?? ((event: NotifyEvent): void => {
    emitAndNotify(() => { /* noop */ }, options.settings.current().notify, event, orchDir, options.settings);
  });
  const questionState = new Map<string, QuestionReaskState>();
  let lastSweepAt = Number.NEGATIVE_INFINITY;
  while (!options.signal?.aborted) {
    const settings = options.settings.current();
    if (settings !== undefined) {
      const nowMs = Date.now();
      const sweepIntervalMs = settings.retention.sweep_interval_ms;
      if (sweepIntervalMs !== undefined && nowMs - lastSweepAt >= sweepIntervalMs) {
        lastSweepAt = nowMs;
        const counts = sweepExpiredRows(orchDir, settings, new Date(nowMs));
        if (Object.values(counts).some((count) => count > 0)) {
          decisionLogger(orchDir, settings).info("retention.swept", { ...counts });
        }
      }
      const questionSettings = settings.questions;
      if (questionSettings !== undefined) reaskQuestions({
        questions: pendingQuestions(orchDir),
        nowMs,
        intervalMs: questionSettings.renag_ms,
        limit: questionSettings.renag_limit,
        state: questionState,
        emit: (question, askCount, gaveUp) => {
          const event = reaskEvent(orchDir, question, nowMs, askCount, gaveUp);
          if (event !== null) emit(event);
        },
      });
    }
    const maxRetries = settings?.queue.max_retries ?? options.maxRetries ?? 1;
    const presence = loadPresence(orchDir);
    settleClaimedTasks(orchDir, settings, emit);
    const tasks = listTasks(orchDir);
    const idle = [...presence.values()].filter(agentIdle)
      .map((entry) => runnerOf(orchDir, entry))
      .filter((runner): runner is Runner => runner !== null);
    const claims: { entry: PresenceEntry; claimed: TaskRec }[] = [];
    for (const { entry, agentId } of idle) {
      // The facade resolves agent/pack/space eligibility from the registered
      // agent id and open pack intake. A foreign pack never sees this task.
      const task = nextQueuedTask(orchDir, agentId, maxRetries, tasks);
      const dispatchId = randomUUID();
      if (!task || !claimTask(orchDir, task.id, agentId, dispatchId)) continue;
      const claimed = requireTask(orchDir, task.id);
      emit(taskEvent(orchDir, entry, claimed, task.state, claimed.state));
      claims.push({ entry, claimed });
      if (options.once || options.signal?.aborted) break;
    }
    await mapWithLimit(claims, options.settings.current().queue.dispatch_concurrency, ({ entry, claimed }) => assignTask(options, entry, claimed, emit));
    const assigned = claims.length;
    if (options.once) {
      settleClaimedTasks(orchDir, settings, emit);
      return;
    }
    const claimed = tasks.some((task) => task.state === "claimed");
    if (assigned === 0 && !claimed && !options.continuous) return;
    await options.wake.next(options.tickMs, options.signal);
  }
}
