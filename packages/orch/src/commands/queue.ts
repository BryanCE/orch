import { randomUUID } from "node:crypto";
import type { TaskRec, TaskScopeSelection } from "../queue.ts";
import { ensureDaemon, rpcRegisterSession } from "../daemon/client/reach.ts";
import { rpcCall } from "../daemon/client/rpc.ts";
import { launchCredential } from "../identity/launch.ts";
import { renderTable } from "../table.ts";
import { errorMessage } from "../util.ts";
import { createAgentWorktree } from "../worktree.ts";
import { askDaemon, callDaemon } from "./daemon.ts";
import { die, remoteWrite } from "./target.ts";
import { parseCommand } from "./registry.ts";
import type { Invocation, ParsedFlags } from "../cli/spec.ts";
import type { QueueScopeFlags } from "../types/command.ts";
import type { DaemonClient } from "../types/services.ts";
import type { Services } from "../types/services.ts";
import type { OrchDir } from "../types/core.ts";

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
  services: DaemonClient,
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
  if (flags.agent !== undefined) return { agentId: (await askDaemon(services, "resolve-agent", { target: flags.agent })).id };
  if (flags.pack !== undefined) return { packId: (await askDaemon(services, "resolve-agent", { target: flags.pack })).rootAgentId };
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

async function queueAdd(services: DaemonClient, { flags, positional }: Invocation, args: string[]): Promise<void> {
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
  const scope = await scopeFromFlags(services, scopeFlags(flags));
  const { task } = await rpcCall(directory, "enqueue", { enqueuedBy: callerId, text, opts: worktreeOptions(flags.has("--worktree")), scope });
  writeQueueTask(task, flags.has("--json"), task.id);
}

async function queueCollection(services: DaemonClient, { command, flags, positional }: Invocation): Promise<void> {
  if (positional.length > 0) die(`usage: orch queue ${command.name} [--json]`);
  const { tasks } = await askDaemon(services, "queue-list", { history: command.name === "history" });
  if (flags.has("--json")) process.stdout.write(JSON.stringify(tasks, null, 2) + "\n");
  else renderQueueTasks(tasks);
}

async function queueEdit(services: DaemonClient, { flags, positional }: Invocation): Promise<void> {
  const id = positional[0];
  const text = positional.slice(1).join(" ");
  if (!id || !text) die("usage: orch queue edit <id> <task text> [--json]");
  await withQueueCaller(services, async (callerId) => {
    const { task } = await callDaemon(services, "queue-edit", { target: id, by: callerId, text });
    writeQueueTask(task, flags.has("--json"), `Edited ${task.id}`);
  });
}

/** The one task id a subcommand names, or the usage line. */
function oneTaskId(positional: readonly string[], usage: string): string {
  const id = positional[0];
  if (!id || positional.length !== 1) die(usage);
  return id;
}

async function queueTakeOn(services: DaemonClient, { flags, positional }: Invocation): Promise<void> {
  const id = oneTaskId(positional, "usage: orch queue take-on <id> [--agent <target>] [--json]");
  const agent = flags.value("--agent");
  await withQueueCaller(services, async (callerId) => {
    const { task } = await callDaemon(services, "queue-take-on", { target: id, taker: agent ?? callerId });
    writeQueueTask(task, flags.has("--json"), `Took on ${task.id}`);
  });
}

async function queueReap(services: DaemonClient, { flags, positional }: Invocation): Promise<void> {
  const id = oneTaskId(positional, "usage: orch queue reap <id> [--json]");
  await withQueueCaller(services, async (callerId) => {
    await callDaemon(services, "queue-reap", { target: id, by: callerId });
    if (flags.has("--json")) process.stdout.write(JSON.stringify({ id, state: "reaped" }) + "\n");
    else process.stdout.write(`Reaped ${id}\n`);
  });
}

/** `orch queue intake` — the consuming half of space scope (Cq3). Publishing a
 *  task into a space is an offer; this is the pack saying it will take them. */
async function queueIntake(services: DaemonClient, { flags, positional }: Invocation): Promise<void> {
  const space = positional[0];
  const close = flags.has("--close");
  if (positional.length > 1 || (!space && close)) {
    die("usage: orch queue intake [<space id>] [--close] [--agent <target>] [--json]");
  }
  await withQueueCaller(services, async (callerId) => {
    const { intakes } = await callDaemon(services, "queue-intake", {
      by: callerId,
      close,
      ...(flags.value("--agent") === undefined ? {} : { agent: flags.value("--agent") }),
      ...(space === undefined ? {} : { space }),
    });
    if (flags.has("--json")) process.stdout.write(JSON.stringify(intakes, null, 2) + "\n");
    else if (intakes.length === 0) process.stdout.write("No space intakes.\n");
    else for (const intake of intakes) process.stdout.write(`${intake.spaceId} ${intake.until === null ? "open" : "closed"}\n`);
  });
}

async function queueCancel(services: DaemonClient, { flags, positional }: Invocation): Promise<void> {
  const id = oneTaskId(positional, "usage: orch queue cancel <id> [--json]");
  await withQueueCaller(services, async (callerId) => {
    const { task } = await callDaemon(services, "queue-cancel", { target: id, by: callerId });
    writeQueueTask(task, flags.has("--json"), `Cancelled ${task.id}`);
  });
}

export async function cmdQueue(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("queue", args);
  switch (invocation.command.name) {
    case "add":
      await queueAdd(services, invocation, args);
      return;
    case "list":
    case "history":
      await queueCollection(services, invocation);
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
