// Leaf module: the bundled harness artifacts (extensions/claude/index.ts and
// friends) import `prepareWorkerTask` from here, so nothing in this file may
// reach the store's sqlite graph (Rule 6). The two helpers that answer from the
// store — `maySpawnBelow` and `workerHeaderContextOf` — live in policy/spawner.ts.
import { truncate } from "./util.ts";
import { term } from "./policy/vocabulary.ts";
import type { AgentAdapter } from "./types/adapter.ts";
import type { ContextReference, WorkerHeaderContext, WorkerRules } from "./types/core.ts";
import type { OrchSettings } from "./types/settings.ts";

/** The rules this machine puts in every worker header, whoever launched the worker. */
export function workerRules(settings: OrchSettings): WorkerRules {
  return { lockedCommands: settings.locked_commands, lockWaitMs: settings.timeouts.lock_wait_ms, gatedCommands: settings.gated_commands, verifyCommands: settings.workers.verify_commands };
}

/**
 * Always-on worker header: nobody watches this agent.
 *
 * The header addresses the AGENT, so it reads the same however the agent was
 * launched and whether or not any environment shows it.
 */
const WORKER_HEADER_BASE =
  "[orch worker] No human watches you." +
  " Verify your own slice before you report it." +
  " Every orch verb (spawn, dispatch, steer, close, reset, status) stays forbidden." +
  " Do the work yourself. A slice too big for one agent is reported back, not split by you.";

/** Names the commands that verify a slice; falls back to the repository's own when the user declared none. */
function verifyCommandsClause(verifyCommands: readonly string[]): string {
  if (verifyCommands.length === 0) return " Run the tests and typechecks this repository already has.";
  return ` Verify with: ${verifyCommands.join(", ")}.`;
}

/** Tell the worker whether it may create another provenance level. */
function workerSpawnClause(maySpawn: boolean): string {
  return maySpawn ? " You may `orch spawn`; your children may not." : " Never spawn subagents.";
}

/** Appended only for adapters that support orch's blocking ask flow. */
const WORKER_HEADER_ASK_CLAUSE =
  ` For any decision you cannot make yourself, call orch_ask and wait for the ${term("orch")}. NEVER use ask-user/question tools.`;

/**
 * Appended only when BOTH sides of the reply can carry it: this worker's bridge
 * has the peer tools, and the spawner is live; orchd queues mail for it. A worker's
 * own bridge says nothing about whether whoever launched it can receive mail — a
 * Claude Code session orchestrating a pi fleet never does, and telling its workers
 * to `orch_send target "spawner"` sent every one of them into a refusal they then
 * had to reason their way out of.
 */
const WORKER_HEADER_SPAWNER_CLAUSE =
  " The session orchestrating you is named in your status record (spawnedByLabel);" +
  " reply or report to it with orch_send target \"spawner\" ONLY;" +
  " never relay via siblings or other agents.";

/** Appended when the spawner's inbox is not reachable: the result is collected from presence. */
const WORKER_HEADER_NO_SPAWNER_CLAUSE =
  " finish, write your result, END the turn - your result is collected from your session/result file;" +
  " NEVER route a report through another agent.";

/** Names the commands that run one at a time machine-wide; empty when the user declared none. */
function lockedCommandsClause(lockedCommands: readonly string[], lockWaitMs: number | undefined): string {
  if (lockedCommands.length === 0) return "";
  const clause = ` These commands run one at a time machine-wide: ${lockedCommands.join(", ")}.` +
    " Run them as usual; orch makes each wait its turn.";
  if (lockWaitMs === undefined) return clause;
  const seconds = Math.round(lockWaitMs / 1000);
  return clause +
    ` The wait counts against your command timeout, so give such a command ${seconds}s more than it needs.` +
    ` After ${seconds}s orch gives up and the command does not run: do your other work, then run it again.`;
}

/** Names the commands only the human may allow; empty when the user declared none. */
function gatedCommandsClause(gatedCommands: readonly string[]): string {
  if (gatedCommands.length === 0) return "";
  return ` These commands need the human's approval: ${gatedCommands.join(", ")}.` +
    ` A run is refused with a request id; report that id to the ${term("orch")} and run the exact command again only once it is approved.`;
}

/** Compose the worker header from the adapter's bridge role and this spawn's reachable peers. */
export function workerHeaderFor(adapter: AgentAdapter | undefined, context: Partial<WorkerHeaderContext> = {}): string {
  const ask = adapter?.bridge?.takes.includes("answer") ? WORKER_HEADER_ASK_CLAUSE : "";
  const spawner = adapter?.bridge && context.spawnerRepliable
    ? WORKER_HEADER_SPAWNER_CLAUSE
    : context.spawnerRepliable ? "" : WORKER_HEADER_NO_SPAWNER_CLAUSE;
  return WORKER_HEADER_BASE
    + verifyCommandsClause(context.verifyCommands ?? [])
    + workerSpawnClause(context.maySpawn === true)
    + ask + spawner + lockedCommandsClause(context.lockedCommands ?? [], context.lockWaitMs) + gatedCommandsClause(context.gatedCommands ?? []);
}

/** Strip the composed worker header (base + any clauses) from a dispatched task's text. */
export function stripWorkerHeader(task: string): string {
  if (!task.startsWith(WORKER_HEADER_BASE)) return task;
  const separator = task.indexOf("\n\n");
  return separator === -1 ? "" : task.slice(separator + 2);
}

const CONTEXT_REFERENCES_LEAD =
  "Context for this task lives at the paths below. Open a path only when the task needs it; do not read them all up front.";

function contextReferenceLine(reference: ContextReference): string {
  return reference.kind === "directory"
    ? `- ${reference.path} (directory: list it, then open only the files that apply)`
    : `- ${reference.path}`;
}

/**
 * The task text for one agent: where its context lives, then the instructions.
 *
 * The references belong to the TASK, never to the header. `stripWorkerHeader` cuts
 * the header off a stored task, and a reference cut out of the record leaves a task
 * nobody can read back.
 */
export function taskWithReferences(instructions: string, references: readonly ContextReference[]): string {
  if (references.length === 0) return instructions;
  return `${CONTEXT_REFERENCES_LEAD}\n${references.map(contextReferenceLine).join("\n")}\n\n${instructions}`;
}

/** Normalize a dispatched task before storing it: strip the header, then truncate. */
export function prepareWorkerTask(task: string, max: number): string {
  return truncate(stripWorkerHeader(task), max);
}

export function workerPrompt(prompt: string, raw: boolean, adapter: AgentAdapter | undefined, context: Partial<WorkerHeaderContext> = {}): string {
  return raw ? prompt : `${workerHeaderFor(adapter, context)}\n\n${prompt}`;
}
