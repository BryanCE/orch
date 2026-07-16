import type { AgentAdapter } from "./adapters/adapter.ts";

/** Always-on worker header: the pane is unattended. */
export const WORKER_HEADER_BASE = "[orch worker] No human watches this pane.";

/** Appended only for adapters that support orch's blocking ask flow. */
export const WORKER_HEADER_ASK_CLAUSE =
  " For any decision you cannot make yourself, call orch_ask and wait for the orchestrator. NEVER use ask-user/question tools.";

/** Compose the worker header from one resolved adapter's ask capability. */
export function workerHeaderFor(adapter: AgentAdapter | undefined): string {
  return adapter?.caps.ask ? WORKER_HEADER_BASE + WORKER_HEADER_ASK_CLAUSE : WORKER_HEADER_BASE;
}

/** Strip either worker-header variant from a dispatched task's text. */
export function stripWorkerHeader(task: string): string {
  if (!task.startsWith(WORKER_HEADER_BASE)) return task;
  const rest = task.slice(WORKER_HEADER_BASE.length);
  return (rest.startsWith(WORKER_HEADER_ASK_CLAUSE) ? rest.slice(WORKER_HEADER_ASK_CLAUSE.length) : rest).trimStart();
}
