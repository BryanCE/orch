import type { AgentAdapter } from "./adapters/adapter.ts";

/** Always-on worker header: the pane is unattended. */
const WORKER_HEADER_BASE =
  "[orch worker] No human watches this pane." +
  " Never run tests, typecheck, lint, or builds unless your task explicitly grants it;" +
  " when granted, wrap the command as `orch lock run -- <cmd>` so only one heavy command runs machine-wide.";

/** Appended only for adapters that support orch's blocking ask flow. */
const WORKER_HEADER_ASK_CLAUSE =
  " For any decision you cannot make yourself, call orch_ask and wait for the orchestrator. NEVER use ask-user/question tools.";

/** Names the machine-wide locked commands; empty when the user declared none. */
function lockedCommandsClause(lockedCommands: readonly string[]): string {
  if (lockedCommands.length === 0) return "";
  return ` These commands are locked machine-wide: ${lockedCommands.join(", ")}.` +
    " Prefer reporting so the orchestrator verifies; when one genuinely serves your task, run it as `orch lock run -- <cmd>`.";
}

/** Compose the worker header from one resolved adapter's ask capability and the locked-command list. */
export function workerHeaderFor(adapter: AgentAdapter | undefined, lockedCommands: readonly string[] = []): string {
  const ask = adapter?.caps.ask ? WORKER_HEADER_ASK_CLAUSE : "";
  return WORKER_HEADER_BASE + ask + lockedCommandsClause(lockedCommands);
}

/** Strip the composed worker header (base + any clauses) from a dispatched task's text. */
export function stripWorkerHeader(task: string): string {
  if (!task.startsWith(WORKER_HEADER_BASE)) return task;
  const separator = task.indexOf("\n\n");
  return separator === -1 ? "" : task.slice(separator + 2);
}
