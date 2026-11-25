import type { TaskOptions, TaskRec, TaskScopeSelection } from "../queue.ts";
import { isLane } from "../types/queue.ts";
import { rpcCall } from "../daemon/client/rpc.ts";
import { renderTable } from "../table.ts";
import { errorMessage } from "../util.ts";
import { isAdapterId } from "../shared/harness.ts";
import { ADAPTER_IDS } from "../types/adapter.ts";
import { askDaemon, callDaemon } from "./daemon.ts";
import { resolveEntity } from "./resolve.ts";
import { callerId } from "./self.ts";
import { die } from "./target.ts";
import { parseCommand } from "./registry.ts";
import { usageError } from "../cli/usage.ts";
import { planSections } from "./plan-sections.ts";
import { readPromptFile } from "./prompt-file.ts";
import type { Invocation, ParsedFlags } from "../cli/spec.ts";
import type { QueueScopeFlags } from "../types/command.ts";
import type { DaemonClient } from "../types/services.ts";
import type { Services } from "../types/services.ts";
import type { AgentView } from "../types/store.ts";

export function renderQueueTasks(tasks: TaskRec[]): void {
  if (tasks.length === 0) {
    process.stdout.write("No queue tasks.\n");
    return;
  }
  const headers = ["ID", "STATE", "LANE", "ATTEMPTS", "AGENT", "TASK", "ERROR"];
  const caps = [36, 10, 16, 8, 16, 60, 40];
  const rows = tasks.map((task) => {
    const attempt = task.attempts.at(-1);
    return [task.id, task.stale ? `${task.state} (stale)` : task.state, task.opts.lane ?? "-", String(task.attempts.length), attempt?.agentId ?? "-", task.text, attempt?.error ?? ""];
  });
  process.stdout.write(renderTable(headers, rows, caps) + "\n");
}

function writeQueueTasks(tasks: TaskRec[], json: boolean): void {
  if (json) process.stdout.write(JSON.stringify(tasks, null, 2) + "\n");
  else renderQueueTasks(tasks);
}

function writeQueueTask(task: TaskRec, json: boolean, plainText: string): void {
  if (json) process.stdout.write(JSON.stringify(task, null, 2) + "\n");
  else process.stdout.write(plainText + "\n");
}

/** Run a queue verb against the daemon as the registered caller; any failure is a refusal. */
async function withQueueCaller(
  services: DaemonClient,
  run: (callerId: string) => void | Promise<void>,
): Promise<void> {
  try {
    await run(await callerId(services));
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

/** The orch agent a target names, through the one resolver. A pane orch did not spawn has no queue. */
async function orchAgent(services: DaemonClient, target: string): Promise<AgentView> {
  const { view } = await resolveEntity(services, target);
  if (view === null) die(`Target "${target}" is not an agent orch spawned.`);
  return view;
}

/**
 * Cq2: one of the three scopes, chosen at enqueue. A pack is named by its root
 * agent, so `--pack` accepts any member and resolves to the root — the scope is
 * the pack, never the member that named it.
 *
 * No flag returns no selection: the facade fills in the enqueuer's own pack, and
 * saying so here would be a second place that decides the default.
 */
export async function scopeFromFlags(services: DaemonClient, flags: QueueScopeFlags): Promise<TaskScopeSelection> {
  const chosen = [flags.agent, flags.pack, flags.space].filter((value) => value !== undefined);
  if (chosen.length > 1) die("Choose exactly one of --agent, --pack or --space");
  if (flags.agent !== undefined) return { agentId: (await orchAgent(services, flags.agent)).id };
  if (flags.pack !== undefined) return { packId: (await orchAgent(services, flags.pack)).rootAgentId };
  if (flags.space !== undefined) return { spaceId: flags.space };
  return {};
}

/** The scope flags `orch queue add` was given, present ones only. */
function scopeFlags(flags: ParsedFlags): QueueScopeFlags {
  const scope: QueueScopeFlags = {};
  const agent = flags.value("--agent");
  const pack = flags.value("--pack");
  const space = flags.value("--space");
  if (agent !== undefined) scope.agent = agent;
  if (pack !== undefined) scope.pack = pack;
  if (space !== undefined) scope.space = space;
  return scope;
}

/** The lane, harness and model an agent must have to take the task, present ones only. */
function takerOptions(flags: ParsedFlags): TaskOptions {
  const lane = flags.value("--lane");
  const harness = flags.value("--harness");
  const model = flags.value("--model");
  if (lane !== undefined && !isLane(lane)) die(`--lane ${JSON.stringify(lane)} is not a lane name; give non-blank text with no space at either end`);
  if (harness !== undefined && !isAdapterId(harness)) die(`--harness ${harness} is not a harness; use one of ${ADAPTER_IDS.join(", ")}`);
  return { ...(lane === undefined ? {} : { lane }), ...(harness === undefined ? {} : { harness }), ...(model === undefined ? {} : { model }) };
}

/** Add the texts as tasks, in order, under the scope and taker the flags name. */
async function enqueueTexts(services: DaemonClient, flags: ParsedFlags, texts: [string, ...string[]]): Promise<[TaskRec, ...TaskRec[]]> {
  const enqueuedBy = await callerId(services);
  const scope = await scopeFromFlags(services, scopeFlags(flags));
  const { tasks } = await rpcCall(services.orchDir, "enqueue", { enqueuedBy, texts, opts: takerOptions(flags), scope });
  return tasks;
}

async function queueAdd(services: DaemonClient, invocation: Invocation): Promise<void> {
  const { flags, positional } = invocation;
  const text = positional.join(" ");
  if (!text) throw usageError(invocation);
  const [task] = await enqueueTexts(services, flags, [text]);
  writeQueueTask(task, flags.has("--json"), `Added task ${task.id}.`);
}

/** `orch queue load <file>`: every `## ` section of a plan file, as one task each, in one call. */
async function queueLoad(services: DaemonClient, invocation: Invocation): Promise<void> {
  const { flags } = invocation;
  const file = onePositional(invocation);
  const [first, ...rest] = planSections(readPromptFile(file));
  if (first === undefined) die(`${file} has no '## ' section; each task starts at a '## ' heading.`);
  writeQueueTasks(await enqueueTexts(services, flags, [first, ...rest]), flags.has("--json"));
}

async function queueCollection(services: DaemonClient, invocation: Invocation): Promise<void> {
  const { command, flags, positional } = invocation;
  if (positional.length > 0) throw usageError(invocation);
  const { tasks } = await askDaemon(services, "queue-list", { history: command.name === "history" });
  writeQueueTasks(tasks, flags.has("--json"));
}

async function queueEdit(services: DaemonClient, invocation: Invocation): Promise<void> {
  const { flags, positional } = invocation;
  const id = positional[0];
  const text = positional.slice(1).join(" ");
  if (!id || !text) throw usageError(invocation);
  await withQueueCaller(services, async (callerId) => {
    const { task } = await callDaemon(services, "queue-edit", { target: id, by: callerId, text });
    writeQueueTask(task, flags.has("--json"), `Edited task ${task.id}.`);
  });
}

/** The one argument a subcommand names, a task id or a file, or the usage line. */
function onePositional(invocation: Invocation): string {
  const id = invocation.positional[0];
  if (!id || invocation.positional.length !== 1) throw usageError(invocation);
  return id;
}

/** Run one verb on the one task the invocation names, as the caller, and print the task it leaves. */
async function actOnTask(services: DaemonClient, invocation: Invocation, done: string, act: (id: string, callerId: string) => Promise<{ task: TaskRec }>): Promise<void> {
  const id = onePositional(invocation);
  await withQueueCaller(services, async (callerId) => {
    const { task } = await act(id, callerId);
    writeQueueTask(task, invocation.flags.has("--json"), `${done} task ${task.id}.`);
  });
}

async function queueTakeOn(services: DaemonClient, invocation: Invocation): Promise<void> {
  const agent = invocation.flags.value("--agent");
  await actOnTask(services, invocation, "Took on", async (id, callerId) => {
    const taker = agent === undefined ? callerId : (await orchAgent(services, agent)).id;
    return callDaemon(services, "queue-take-on", { target: id, taker });
  });
}

async function queueReap(services: DaemonClient, invocation: Invocation): Promise<void> {
  const { flags } = invocation;
  const id = onePositional(invocation);
  await withQueueCaller(services, async (callerId) => {
    await callDaemon(services, "queue-reap", { target: id, by: callerId });
    if (flags.has("--json")) process.stdout.write(JSON.stringify({ id, state: "reaped" }) + "\n");
    else process.stdout.write(`Reaped task ${id}.\n`);
  });
}

/** `orch queue intake` — the consuming half of space scope (Cq3). Publishing a
 *  task into a space is an offer; this is the pack saying it will take them. */
async function queueIntake(services: DaemonClient, invocation: Invocation): Promise<void> {
  const { flags, positional } = invocation;
  const space = positional[0];
  const close = flags.has("--close");
  if (positional.length > 1) throw usageError(invocation);
  if (!space && close) throw usageError(invocation, "--close needs the <space> it closes");
  const agent = flags.value("--agent");
  await withQueueCaller(services, async (callerId) => {
    const { intakes } = await callDaemon(services, "queue-intake", {
      by: callerId,
      close,
      ...(agent === undefined ? {} : { agent: (await orchAgent(services, agent)).id }),
      ...(space === undefined ? {} : { space }),
    });
    if (flags.has("--json")) process.stdout.write(JSON.stringify(intakes, null, 2) + "\n");
    else if (intakes.length === 0) process.stdout.write("No space intakes.\n");
    else for (const intake of intakes) process.stdout.write(`${intake.spaceId} ${intake.until === null ? "open" : "closed"}\n`);
  });
}

async function queueCancel(services: DaemonClient, invocation: Invocation): Promise<void> {
  await actOnTask(services, invocation, "Cancelled", (id, callerId) => callDaemon(services, "queue-cancel", { target: id, by: callerId }));
}

/** Each `orch queue` subcommand and the function that runs it. */
const QUEUE_VERBS: Readonly<Record<string, (services: DaemonClient, invocation: Invocation) => Promise<void>>> = {
  add: queueAdd,
  load: queueLoad,
  list: queueCollection,
  history: queueCollection,
  cancel: queueCancel,
  edit: queueEdit,
  "take-on": queueTakeOn,
  reap: queueReap,
  intake: queueIntake,
};

export async function cmdQueue(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("queue", args);
  const verb = QUEUE_VERBS[invocation.command.name];
  if (verb === undefined) throw usageError(invocation);
  await verb(services, invocation);
}
