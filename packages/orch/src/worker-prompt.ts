// Leaf module: the bundled harness artifacts (extensions/claude/index.ts and
// friends) import `prepareWorkerTask` from here, so nothing in this file may
// reach the store's sqlite graph (Rule 6). The two helpers that answer from the
// store — `maySpawnBelow` and `workerHeaderContextOf` — live in policy/spawner.ts.
import { truncate } from "./util.ts";
import { term } from "./policy/vocabulary.ts";
import { commandIn } from "./policy/command-paths.ts";
import { echoesPrompts } from "./adapters/adapter.ts";
import type { AgentAdapter } from "./types/adapter.ts";
import type { ContextReference, WorkerHeaderContext, WorkerRules } from "./types/core.ts";
import type { OrchSettings } from "./types/settings.ts";

/** The rules this machine puts in every worker header, whoever launched the worker. */
export function workerRules(settings: OrchSettings): WorkerRules {
  return { gatedCommands: settings.gated_commands, verifyCommands: settings.workers.verify_commands };
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
function verifyCommandsClause(verifyCommands: readonly string[], cwd: string | undefined): string {
  if (verifyCommands.length === 0) return " Run the tests and typechecks this repository already has.";
  const commands = cwd === undefined ? verifyCommands : verifyCommands.map((command) => commandIn(command, cwd, process.env.WSL_DISTRO_NAME));
  return ` Verify with: ${commands.join(", ")}.` + (cwd === undefined ? "" : ` Work only inside ${cwd}.`);
}

/** Tell the worker whether it may create another provenance level. */
function workerSpawnClause(maySpawn: boolean): string {
  return maySpawn ? " You may `orch spawn`; your children may not." : " Never spawn subagents.";
}

/** Appended only for adapters that support orch's blocking ask flow. */
const WORKER_HEADER_ASK_CLAUSE =
  ` For any decision you cannot make yourself, call orch_ask and wait for the ${term("orch")}. NEVER use ask-user/question tools.`;

/** Appended for adapters whose question ends the turn: the answer arrives as the next prompt. */
const WORKER_HEADER_TURN_ASK_CLAUSE =
  ` For any decision you cannot make yourself, end your turn with the question as your last line, and the ${term("orch")} answers it as your next prompt. NEVER use ask-user/question tools.`;

function askClause(adapter: AgentAdapter | undefined): string {
  if (adapter?.bridge?.takes.includes("answer")) return WORKER_HEADER_ASK_CLAUSE;
  return adapter !== undefined && echoesPrompts(adapter) ? WORKER_HEADER_TURN_ASK_CLAUSE : "";
}

/**
 * Appended only when BOTH sides of the reply can carry it: this worker's bridge
 * has the peer tools, and the spawner is live; orchd queues mail for it. A worker's
 * own bridge says nothing about whether whoever launched it can receive mail — a
 * Claude Code session orchestrating a pi fleet never does, and telling its workers
 * to `orch_send target "spawner"` sent every one of them into a refusal they then
 * had to reason their way out of.
 */
const WORKER_HEADER_SPAWNER_CLAUSE =
  ` End your turn with your final report as your last reply; orch delivers it to the ${term("orch")}.` +
  ` Use orch_send target "spawner" (or its name) only for a question, blocker, or finding the ${term("orch")} needs before the task ends.` +
  " Never relay through siblings.";

/** Appended when the spawner's inbox is not reachable: the result is collected from presence. */
const WORKER_HEADER_NO_SPAWNER_CLAUSE =
  " finish, write your result, END the turn - orch collects your final reply as your result;" +
  " NEVER route a report through another agent.";

/** Names the commands only the human may allow; empty when the user declared none. */
function gatedCommandsClause(gatedCommands: readonly string[]): string {
  if (gatedCommands.length === 0) return "";
  return ` These commands need the human's approval: ${gatedCommands.join(", ")}.` +
    ` A run is refused with a request id; report that id to the ${term("orch")} and run the exact command again only once it is approved.`;
}

/** Compose the worker header from the adapter's bridge role and this spawn's reachable peers. */
export function workerHeaderFor(adapter: AgentAdapter | undefined, context: Partial<WorkerHeaderContext> = {}): string {
  const ask = askClause(adapter);
  const spawner = adapter?.bridge && context.spawnerRepliable
    ? WORKER_HEADER_SPAWNER_CLAUSE
    : context.spawnerRepliable ? "" : WORKER_HEADER_NO_SPAWNER_CLAUSE;
  return WORKER_HEADER_BASE
    + verifyCommandsClause(context.verifyCommands ?? [], context.cwd)
    + workerSpawnClause(context.maySpawn === true)
    + ask + spawner + gatedCommandsClause(context.gatedCommands ?? []);
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
/** Maximum stored task length after the worker header is removed. */
export const TASK_MAX = 200;

export function prepareWorkerTask(task: string): string {
  return truncate(stripWorkerHeader(task), TASK_MAX);
}

export function workerPrompt(prompt: string, raw: boolean, adapter: AgentAdapter | undefined, context: Partial<WorkerHeaderContext> = {}): string {
  return raw ? prompt : `${workerHeaderFor(adapter, context)}\n\n${prompt}`;
}
