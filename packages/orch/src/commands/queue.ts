import { randomUUID } from "node:crypto";
import { cancelTask, closePackIntake, editTask, listTasks, openPackIntake, packIntakes, reapTask, takeOnTask, history as queueHistory, type TaskRec, type TaskScopeSelection } from "../queue.ts";
import { ensureDaemon, rpcRegisterSession } from "../daemon/client/reach.ts";
import { rpcCall } from "../daemon/client/rpc.ts";
import { launchCredential } from "../identity/launch.ts";
import { renderTable } from "../table.ts";
import { errorMessage } from "../util.ts";
import { createAgentWorktree } from "../worktree.ts";
import { agentById } from "../store/agent-rows.ts";

import { die, remoteWrite } from "./target.ts";
import { parseCommand } from "./registry.ts";
import type { Invocation, ParsedFlags } from "../cli/spec.ts";
import type { QueueScopeFlags } from "../types/command.ts";
import type { Services } from "../types/services.ts";
import type { OrchDir } from "../types/core.ts";
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

async function resolveSelfId(directory: OrchDir, logger: Services["logger"]): Promise<string> {
  return launchCredential() ?? (await rpcRegisterSession(directory, logger)).id;
}

/** Run a queue verb against the daemon as the registered caller; any failure is a refusal. */
async function withQueueCaller(
  services: Pick<Services, "orchDir" | "logger">,
  run: (callerId: string) => void | Promise<void>,
): Promise<void> {
  try {
    await ensureDaemon(services.orchDir, services.logger);
    const callerId = await resolveSelfId(services.orchDir, services.logger);
    await run(callerId);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

/** C4c/C4d: a name is for the human and carries no uniqueness, so resolving one
 *  is a lookup that either finds one agent or asks which id you meant. */
function resolveAgent(directory: OrchDir, target: string): string {
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
export function scopeFromFlags(directory: OrchDir, flags: QueueScopeFlags): TaskScopeSelection {
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

/** The queue add argv with `--host <name>` taken out, for replay on that host. */
function withoutHostFlag(args: readonly string[], host: string): string[] {
  return args.filter((part) => part !== "--host" && part !== host);
}

/** The enqueue options a fresh worktree adds, or none. */
function worktreeOptions(wanted: boolean): Record<string, unknown> {
  if (!wanted) return {};
  const name = `queue-${randomUUID()}`;
  const worktreePath = createAgentWorktree(process.cwd(), name);
  return { worktree: true, cwd: worktreePath, branch: `orch/${name}` };
}

async function queueAdd(services: Pick<Services, "orchDir" | "settings" | "logger">, { flags, positional }: Invocation, args: string[]): Promise<void> {
  const text = positional.join(" ");
  if (!text) die('usage: orch queue add "<task text>" [--agent <target>|--pack <target>|--space <id>] [--worktree] [--json]');
  const host = flags.value("--host");
  if (host !== undefined) {
    remoteWrite(services.settings.current().hosts, host, "queue", ["add", ...withoutHostFlag(args.slice(1), host)]);
    return;
  }
  const directory = services.orchDir;
  await ensureDaemon(directory, services.logger);
  const callerId = await resolveSelfId(directory, services.logger);
  const scope: TaskScopeSelection = scopeFromFlags(directory, scopeFlags(flags));
  const { task } = await rpcCall(directory, "enqueue", { enqueuedBy: callerId, text, opts: worktreeOptions(flags.has("--worktree")), scope });
  writeQueueTask(task, flags.has("--json"), task.id);
}

function queueCollection(directory: OrchDir, { command, flags, positional }: Invocation): void {
  if (positional.length > 0) die(`usage: orch queue ${command.name} [--json]`);
  const tasks = command.name === "history" ? queueHistory(directory) : listTasks(directory);
  if (flags.has("--json")) process.stdout.write(JSON.stringify(tasks, null, 2) + "\n");
  else renderQueueTasks(tasks);
}

async function queueEdit(services: Pick<Services, "orchDir" | "logger">, { flags, positional }: Invocation): Promise<void> {
  const id = positional[0];
  const text = positional.slice(1).join(" ");
  if (!id || !text) die("usage: orch queue edit <id> <task text> [--json]");
  await withQueueCaller(services, (callerId) => {
    const task = editTask(services.orchDir, id, callerId, { text });
    if (task.error) die(task.error);
    writeQueueTask(task, flags.has("--json"), `Edited ${task.id}`);
  });
}

/** The one task id a subcommand names, or the usage line. */
function oneTaskId(positional: readonly string[], usage: string): string {
  const id = positional[0];
  if (!id || positional.length !== 1) die(usage);
  return id;
}

async function queueTakeOn(services: Pick<Services, "orchDir" | "logger">, { flags, positional }: Invocation): Promise<void> {
  const id = oneTaskId(positional, "usage: orch queue take-on <id> [--agent <target>] [--json]");
  const agent = flags.value("--agent");
  await withQueueCaller(services, (callerId) => {
    const taker = agent === undefined ? callerId : resolveAgent(services.orchDir, agent);
    const task = takeOnTask(services.orchDir, id, taker);
    writeQueueTask(task, flags.has("--json"), `Took on ${task.id}`);
  });
}

async function queueReap(services: Pick<Services, "orchDir" | "logger">, { flags, positional }: Invocation): Promise<void> {
  const id = oneTaskId(positional, "usage: orch queue reap <id> [--json]");
  await withQueueCaller(services, (callerId) => {
    reapTask(services.orchDir, id, callerId);
    if (flags.has("--json")) process.stdout.write(JSON.stringify({ id, state: "reaped" }) + "\n");
    else process.stdout.write(`Reaped ${id}\n`);
  });
}

/** The pack whose consent is being recorded: the caller's own, or that of an
 *  agent it names. Only its holder may speak for it, which the facade enforces. */
function packOfCaller(directory: OrchDir, named: string | undefined, callerId: string): string {
  const target = named === undefined ? callerId : resolveAgent(directory, named);
  const agent = agentById(directory, target);
  if (!agent) die(`Unknown agent: ${target}`);
  return agent.rootAgentId;
}

/** `orch queue intake` — the consuming half of space scope (Cq3). Publishing a
 *  task into a space is an offer; this is the pack saying it will take them. */
async function queueIntake(services: Pick<Services, "orchDir" | "logger">, { flags, positional }: Invocation): Promise<void> {
  const space = positional[0];
  const close = flags.has("--close");
  if (positional.length > 1 || (!space && close)) {
    die("usage: orch queue intake [<space id>] [--close] [--agent <target>] [--json]");
  }
  await withQueueCaller(services, (callerId) => {
    const pack = packOfCaller(services.orchDir, flags.value("--agent"), callerId);
    const intakes = space === undefined
      ? packIntakes(services.orchDir, pack)
      : close
        ? closePackIntake(services.orchDir, pack, space, callerId)
        : openPackIntake(services.orchDir, pack, space, callerId);
    if (flags.has("--json")) process.stdout.write(JSON.stringify(intakes, null, 2) + "\n");
    else if (intakes.length === 0) process.stdout.write("No space intakes.\n");
    else for (const intake of intakes) process.stdout.write(`${intake.spaceId} ${intake.until === null ? "open" : "closed"}\n`);
  });
}

async function queueCancel(services: Pick<Services, "orchDir" | "logger">, { flags, positional }: Invocation): Promise<void> {
  const id = oneTaskId(positional, "usage: orch queue cancel <id> [--json]");
  await withQueueCaller(services, (callerId) => {
    const task = cancelTask(services.orchDir, id, callerId, { human: true });
    if (task.error) die(task.error);
    writeQueueTask(task, flags.has("--json"), `Cancelled ${task.id}`);
  });
}

export async function cmdQueue(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("queue", args);
  const directory = services.orchDir;
  switch (invocation.command.name) {
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
