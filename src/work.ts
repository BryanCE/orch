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
import { loadPresence, statusForPresence, type PresenceEntry } from "./store.ts";

const WORKER_PROMPT_HEADER = "[orch worker] No human watches this pane. For any decision you cannot make yourself, call orch_ask and wait for the orchestrator. NEVER use ask-user/question tools.";

export interface WorkOptions {
  orchDir: string;
  pollIntervalMs: number;
  signal?: AbortSignal;
  once?: boolean;
  continuous?: boolean;
  maxRetries?: number;
  dispatch?: (entry: PresenceEntry, task: TaskRec) => Promise<void>;
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

async function dispatchTask(entry: PresenceEntry, task: TaskRec): Promise<void> {
  const prompt = `${WORKER_PROMPT_HEADER}\n\n${task.text}`;
  herdrBestEffort(["pane", "run", entry.key, prompt]);
  let status = waitForWorking(entry, 10_000);
  let retried = false;
  if (status !== "working") {
    retried = true;
    herdrBestEffort(["pane", "run", entry.key, prompt]);
    status = waitForWorking(entry, 10_000);
  }
  process.stdout.write(`Dispatched to ${entry.key} → status: ${status ?? "unknown"}${retried ? " (retried)" : ""}\n`);
}

async function waitForTaskState(entry: PresenceEntry, timeoutMs: number): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = statusForPresence(entry)?.state;
    if (state === "working" || state === "done" || state === "error") return state;
    await Bun.sleep(250);
  }
  return "timeout";
}

function settleClaimedTasks(orchDir: string, maxRetries: number): void {
  const presence = loadPresence();
  for (const task of listTasks(orchDir)) {
    if (task.state !== "claimed" || !task.agentKey) continue;
    const agent = presence.get(task.agentKey);
    const status = agent ? statusForPresence(agent) : null;
    if (status?.state === "done") recordTaskDone(orchDir, task.id, agent?.result);
    if (status?.state === "error") settleError(orchDir, task, maxRetries, typeof status.lastError === "string" ? status.lastError : "agent reported error");
  }
}

function settleError(orchDir: string, task: TaskRec, maxRetries: number, error: string): void {
  if (taskShouldRetry(task, maxRetries)) requeueTask(orchDir, task.id, error);
  else recordTaskFailure(orchDir, task.id, error);
}

async function assignTask(options: WorkOptions, entry: PresenceEntry, task: TaskRec, maxRetries: number): Promise<void> {
  try {
    await (options.dispatch ?? dispatchTask)(entry, task);
    const state = await waitForTaskState(entry, 10_000);
    if (state === "timeout") return void requeueTask(options.orchDir, task.id, "agent did not acknowledge working");
    const current = listTasks(options.orchDir).find((item) => item.id === task.id) ?? task;
    if (state === "error") return settleError(options.orchDir, current, maxRetries, "agent reported error");
    if (state === "done") recordTaskDone(options.orchDir, task.id, loadPresence().get(entry.key)?.result);
  } catch (error) {
    const current = listTasks(options.orchDir).find((item) => item.id === task.id) ?? task;
    settleError(options.orchDir, current, maxRetries, String(error));
  }
}

export async function runWorkLoop(options: WorkOptions): Promise<void> {
  const maxRetries = options.maxRetries ?? 1;
  while (!options.signal?.aborted) {
    settleClaimedTasks(options.orchDir, maxRetries);
    let assigned = 0;
    for (const entry of [...loadPresence().values()].filter(agentIdle)) {
      const task = nextQueuedTask(listTasks(options.orchDir), entry.status?.agent ?? "pi");
      if (!task || !claimTask(options.orchDir, task.id, entry.key)) continue;
      assigned++;
      await assignTask(options, entry, task, maxRetries);
      if (options.once || options.signal?.aborted) break;
    }
    if (options.once) {
      settleClaimedTasks(options.orchDir, maxRetries);
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
