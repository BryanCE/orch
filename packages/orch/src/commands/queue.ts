import { randomUUID } from "node:crypto";
import { addTask, cancelTask, closePackIntake, editTask, listTasks, openPackIntake, packIntakes, reapTask, takeOnTask, history as queueHistory, type TaskRec, type TaskScopeSelection } from "../queue.ts";
import { ensureDaemon, rpcRegisterSession } from "../daemon/reach.ts";
import { launchCredential } from "../identity/launch.ts";
import { renderTable } from "../table.ts";
import { errorMessage } from "../util.ts";
import { createAgentWorktree } from "../worktree.ts";
import { agentById } from "../store/agent-rows.ts";

import { die, remoteWrite, splitOptionFlags } from "./target.ts";
import type { QueueScopeFlags } from "../types/command.ts";
import type { Services } from "../types/services.ts";
import { asc, eq } from "drizzle-orm";
import { orm } from "../store/connection.ts";
import { agents } from "../db/schema.ts";

export function renderQueueTasks(tasks: TaskRec[]): void {
  if (tasks.length === 0) {
    process.stdout.write("No queue tasks.\n");
    return;
  }
  const headers = ["ID", "STATE", "ATTEMPTS", "AGENT", "TASK", "ERROR"];
  const caps = [36, 10, 8, 16, 60, 40];
  const rows = tasks.map((task) => {
    const attempt = task.attempts.at(-1);
    return [task.id, task.stale ? `${task.state} (stale)` : task.state, String(task.attempts.length), attempt?.agentId ?? "-", task.text, attempt?.error ?? ""];
  });
  process.stdout.write(renderTable(headers, rows, caps) + "\n");
}

function writeQueueTask(task: TaskRec, json: boolean, plainText: string): void {
  if (json) process.stdout.write(JSON.stringify(task, null, 2) + "\n");
  else process.stdout.write(plainText + "\n");
}

async function resolveSelfId(directory: string, logger: Services["logger"]): Promise<string> {
  return launchCredential(directory) ?? (await rpcRegisterSession(directory, logger)).id;
}

function takeValue(args: string[], flag: string): { value?: string; rest: string[] } {
  const index = args.indexOf(flag);
  if (index < 0) return { rest: args };
  const value = args[index + 1];
  if (!value || value.startsWith("--")) die(`${flag} requires a value`);
  return { value, rest: args.slice(0, index).concat(args.slice(index + 2)) };
}

/** C4c/C4d: a name is for the human and carries no uniqueness, so resolving one
 *  is a lookup that either finds one agent or asks which id you meant. */
function resolveAgent(directory: string, target: string): string {
  if (agentById(directory, target)) return target;
  const rows = orm(directory).select({ id: agents.id }).from(agents)
    .where(eq(agents.name, target)).orderBy(asc(agents.id)).all();
  if (rows.length === 0) die(`Unknown agent: ${target}`);
  if (rows.length > 1) die(`Ambiguous agent: ${target}; use its id`);
  return rows[0]!.id;
}

/**
 * Cq2: one of the three scopes, chosen at enqueue. A pack is named by its root
 * agent, so `--pack` accepts any member and resolves to the root — the scope is
 * the pack, never the member that named it.
 *
 * No flag returns no selection: the facade fills in the enqueuer's own pack, and
 * saying so here would be a second place that decides the default.
 */
export function scopeFromFlags(directory: string, flags: QueueScopeFlags): TaskScopeSelection {
  const chosen = [flags.agent, flags.pack, flags.space].filter((value) => value !== undefined);
  if (chosen.length > 1) die("Choose exactly one of --agent, --pack or --space");
  if (flags.agent !== undefined) return { agentId: resolveAgent(directory, flags.agent) };
  if (flags.pack !== undefined) {
    const member = resolveAgent(directory, flags.pack);
    const agent = agentById(directory, member);
    if (!agent) die(`Unknown agent: ${flags.pack}`);
    return { packId: agent.rootAgentId };
  }
  if (flags.space !== undefined) return { spaceId: flags.space };
  return {};
}

interface QueueInvocation {
  subcommand: string | undefined;
  host: string | undefined;
  agent: string | undefined;
  pack: string | undefined;
  space: string | undefined;
  positional: string[];
  json: boolean;
  worktree: boolean;
  close: boolean;
}

function parseQueueInvocation(args: string[]): QueueInvocation {
  const subcommand = args[0];
  const host = takeValue(args.slice(1), "--host");
  const agent = takeValue(host.rest, "--agent");
  const pack = takeValue(agent.rest, "--pack");
  const space = takeValue(pack.rest, "--space");
  const { enabled, positional } = splitOptionFlags(space.rest, ["--json", "--worktree", "--close"]);
  if (host.value && subcommand !== "add") die("--host is only supported for orch queue add");
  return {
    subcommand,
    host: host.value,
    agent: agent.value,
    pack: pack.value,
    space: space.value,
    positional,
    json: enabled.has("--json"),
    worktree: enabled.has("--worktree"),
    close: enabled.has("--close"),
  };
}

function validateAdd(invocation: QueueInvocation): string {
  const text = invocation.positional.join(" ");
  if (!text) die('usage: orch queue add "<task text>" [--agent <target>|--pack <target>|--space <id>] [--worktree] [--json]');
  return text;
}

async function queueAdd(services: Pick<Services, "orchDir" | "settings" | "logger">, invocation: QueueInvocation, args: string[]): Promise<void> {
  const text = validateAdd(invocation);
  if (invocation.host) {
    remoteWrite(services.settings.current().hosts, invocation.host, "queue", ["add", ...args.slice(1).filter((part) => part !== "--host" && part !== invocation.host)]);
    return;
  }
  const directory = services.orchDir;
  await ensureDaemon(directory, services.logger);
  const callerId = await resolveSelfId(directory, services.logger);
  let options = {};
  if (invocation.worktree) {
    const name = `queue-${randomUUID()}`;
    const worktreePath = createAgentWorktree(process.cwd(), name);
    options = { worktree: true, cwd: worktreePath, branch: `orch/${name}` };
  }
  const scope: TaskScopeSelection = scopeFromFlags(directory, invocation);
  const task = addTask(directory, text, options, callerId, scope);
  writeQueueTask(task, invocation.json, task.id);
}

function validateCollection(invocation: QueueInvocation): void {
  if (invocation.positional.length > 0 || invocation.worktree || invocation.agent || invocation.pack || invocation.space) {
    die(`usage: orch queue ${invocation.subcommand} [--json]`);
  }
}

function queueCollection(directory: string, invocation: QueueInvocation): void {
  validateCollection(invocation);
  const tasks = invocation.subcommand === "history" ? queueHistory(directory) : listTasks(directory);
  if (invocation.json) process.stdout.write(JSON.stringify(tasks, null, 2) + "\n");
  else renderQueueTasks(tasks);
}

async function queueEdit(services: Pick<Services, "orchDir" | "logger">, invocation: QueueInvocation): Promise<void> {
  const id = invocation.positional[0];
  const text = invocation.positional.slice(1).join(" ");
  if (!id || !text || invocation.worktree || invocation.agent || invocation.pack || invocation.space) {
    die("usage: orch queue edit <id> <task text> [--json]");
  }
  try {
    await ensureDaemon(services.orchDir, services.logger);
    const callerId = await resolveSelfId(services.orchDir, services.logger);
    const task = editTask(services.orchDir, id, callerId, { text });
    if (task.error) die(task.error);
    writeQueueTask(task, invocation.json, `Edited ${task.id}`);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

async function queueTakeOn(services: Pick<Services, "orchDir" | "logger">, invocation: QueueInvocation): Promise<void> {
  const id = invocation.positional[0];
  if (!id || invocation.positional.length !== 1 || invocation.worktree || invocation.pack || invocation.space) {
    die("usage: orch queue take-on <id> [--agent <target>] [--json]");
  }
  try {
    await ensureDaemon(services.orchDir, services.logger);
    const callerId = await resolveSelfId(services.orchDir, services.logger);
    const taker = invocation.agent ? resolveAgent(services.orchDir, invocation.agent) : callerId;
    const task = takeOnTask(services.orchDir, id, taker);
    writeQueueTask(task, invocation.json, `Took on ${task.id}`);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

async function queueReap(services: Pick<Services, "orchDir" | "logger">, invocation: QueueInvocation): Promise<void> {
  const id = invocation.positional[0];
  if (!id || invocation.positional.length !== 1 || invocation.worktree || invocation.agent || invocation.pack || invocation.space) {
    die("usage: orch queue reap <id> [--json]");
  }
  try {
    await ensureDaemon(services.orchDir, services.logger);
    const callerId = await resolveSelfId(services.orchDir, services.logger);
    reapTask(services.orchDir, id, callerId);
    if (invocation.json) process.stdout.write(JSON.stringify({ id, state: "reaped" }) + "\n");
    else process.stdout.write(`Reaped ${id}\n`);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

/** The pack whose consent is being recorded: the caller's own, or that of an
 *  agent it names. Only its holder may speak for it, which the facade enforces. */
function packOfCaller(directory: string, invocation: QueueInvocation, callerId: string): string {
  const target = invocation.agent ? resolveAgent(directory, invocation.agent) : callerId;
  const agent = agentById(directory, target);
  if (!agent) die(`Unknown agent: ${target}`);
  return agent.rootAgentId;
}

/** `orch queue intake` — the consuming half of space scope (Cq3). Publishing a
 *  task into a space is an offer; this is the pack saying it will take them. */
async function queueIntake(services: Pick<Services, "orchDir" | "logger">, invocation: QueueInvocation): Promise<void> {
  const space = invocation.positional[0];
  if (invocation.positional.length > 1 || invocation.worktree || invocation.pack || invocation.space || (!space && invocation.close)) {
    die("usage: orch queue intake [<space id>] [--close] [--agent <target>] [--json]");
  }
  try {
    await ensureDaemon(services.orchDir, services.logger);
    const callerId = await resolveSelfId(services.orchDir, services.logger);
    const pack = packOfCaller(services.orchDir, invocation, callerId);
    const intakes = space === undefined
      ? packIntakes(services.orchDir, pack)
      : invocation.close
        ? closePackIntake(services.orchDir, pack, space, callerId)
        : openPackIntake(services.orchDir, pack, space, callerId);
    if (invocation.json) process.stdout.write(JSON.stringify(intakes, null, 2) + "\n");
    else if (intakes.length === 0) process.stdout.write("No space intakes.\n");
    else for (const intake of intakes) process.stdout.write(`${intake.spaceId} ${intake.until === null ? "open" : "closed"}\n`);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

async function queueCancel(services: Pick<Services, "orchDir" | "logger">, invocation: QueueInvocation): Promise<void> {
  const id = invocation.positional[0];
  if (!id || invocation.positional.length !== 1 || invocation.worktree || invocation.agent || invocation.pack || invocation.space) {
    die("usage: orch queue cancel <id> [--json]");
  }
  try {
    await ensureDaemon(services.orchDir, services.logger);
    const callerId = await resolveSelfId(services.orchDir, services.logger);
    const task = cancelTask(services.orchDir, id, callerId, { human: true });
    if (task.error) die(task.error);
    writeQueueTask(task, invocation.json, `Cancelled ${task.id}`);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

export async function cmdQueue(services: Services, args: string[]): Promise<void> {
  const invocation = parseQueueInvocation(args);
  const directory = services.orchDir;
  switch (invocation.subcommand) {
    case "add":
      await queueAdd(services, invocation, args);
      return;
    case "list":
    case "history":
      queueCollection(directory, invocation);
      return;
    case "cancel":
      await queueCancel(services, invocation);
      return;
    case "edit":
      await queueEdit(services, invocation);
      return;
    case "take-on":
      await queueTakeOn(services, invocation);
      return;
    case "reap":
      await queueReap(services, invocation);
      return;
    case "intake":
      await queueIntake(services, invocation);
      return;
    default:
      die("usage: orch queue <add|list|history|cancel|edit|take-on|reap|intake> ...");
  }
}
