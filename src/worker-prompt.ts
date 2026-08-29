import type { AgentAdapter } from "./adapters/adapter.ts";
import { truncate } from "./util.ts";
import { term } from "./policy/vocabulary.ts";

/** Always-on worker header: the pane is unattended. */
const WORKER_HEADER_BASE =
  "[orch worker] No human watches this pane." +
  " Run your own tests and typechecks directly in this pane; verify your slice before reporting." +
  " Every orch verb (spawn, dispatch, steer, close, reset, status) stays forbidden; never spawn subagents." +
  " Do the work yourself in this pane. A slice too big for one pane is reported back, not split by you.";

/** Appended only for adapters that support orch's blocking ask flow. */
const WORKER_HEADER_ASK_CLAUSE =
  ` For any decision you cannot make yourself, call orch_ask and wait for the ${term("orch")}. NEVER use ask-user/question tools.`;

/**
 * Appended only when BOTH sides of the reply can carry it: this worker's bridge
 * has the peer tools, and the spawner is a live presence inbox that can receive
 * the write. A worker's own `capabilities.steer` says nothing about whether whoever
 * launched it has a mailbox — a Claude Code session orchestrating a pi fleet
 * never does, and telling its workers to `orch_send target "spawner"` sent every
 * one of them into a refusal they then had to reason their way out of.
 */
const WORKER_HEADER_SPAWNER_CLAUSE =
  " The session orchestrating you is named in your status record (spawnedByLabel);" +
  " reply or report to it with orch_send target \"spawner\" ONLY;" +
  " never relay via siblings or other agents.";

/** Appended when the spawner's inbox is not reachable: the result is collected from presence. */
const WORKER_HEADER_NO_SPAWNER_CLAUSE =
  " finish, write your result, END the turn - your result is collected from your session/result file;" +
  " NEVER route a report through another agent.";

/** Names the machine-wide locked commands; empty when the user declared none. */
function lockedCommandsClause(lockedCommands: readonly string[]): string {
  if (lockedCommands.length === 0) return "";
  return ` These commands are locked machine-wide: ${lockedCommands.join(", ")}.` +
    ` Report rather than run them; the ${term("orch")} verifies.`;
}

export interface WorkerHeaderContext {
  lockedCommands?: readonly string[];
  /** The spawner's inbox is live and will accept a peer write. Default false: orch
   *  never instructs a reply it has not established the worker can actually deliver. */
  spawnerRepliable?: boolean;
}

/** Compose the worker header from the adapter's capabilities and this spawn's reachable peers. */
export function workerHeaderFor(adapter: AgentAdapter | undefined, context: WorkerHeaderContext = {}): string {
  const ask = adapter?.question ? WORKER_HEADER_ASK_CLAUSE : "";
  const spawner = adapter?.inboxSteering && context.spawnerRepliable
    ? WORKER_HEADER_SPAWNER_CLAUSE
    : context.spawnerRepliable ? "" : WORKER_HEADER_NO_SPAWNER_CLAUSE;
  return WORKER_HEADER_BASE + ask + spawner + lockedCommandsClause(context.lockedCommands ?? []);
}

/** Strip the composed worker header (base + any clauses) from a dispatched task's text. */
export function stripWorkerHeader(task: string): string {
  if (!task.startsWith(WORKER_HEADER_BASE)) return task;
  const separator = task.indexOf("\n\n");
  return separator === -1 ? "" : task.slice(separator + 2);
}

/** Normalize a dispatched task before storing it: strip the header, then truncate. */
export function prepareWorkerTask(task: string, max: number): string {
  return truncate(stripWorkerHeader(task), max);
}
