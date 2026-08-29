import { randomUUID } from "node:crypto";
import { addTask, cancelTask, editTask, listTasks, reapTask, takeOnTask, history as queueHistory, type TaskRec, type TaskScopeSelection } from "../queue.ts";
import { ensureDaemon } from "./daemon.ts";
import { rpcHello } from "../daemon/rpc.ts";
import { orchDir } from "../presence/store.ts";
import { renderTable } from "../table.ts";
import { errorMessage } from "../util.ts";
import { createAgentWorktree } from "../worktree.ts";
import { agentById } from "../store/agent-rows.ts";
import { openStore } from "../store/connection.ts";
import { die, remoteWrite, splitOptionFlags } from "./target.ts";

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

function takeValue(args: string[], flag: string): { value?: string; rest: string[] } {
  const index = args.indexOf(flag);
  if (index < 0) return { rest: args };
  const value = args[index + 1];
  if (!value || value.startsWith("--")) die(`${flag} requires a value`);
  return { value, rest: args.slice(0, index).concat(args.slice(index + 2)) };
}

function resolveAgent(directory: string, target: string): string {
  if (agentById(directory, target)) return target;
  const rows = openStore(directory).query("SELECT id FROM agents WHERE name=? ORDER BY id").all(target) as { id: string }[];
  if (rows.length === 0) die(`Unknown agent: ${target}`);
  if (rows.length > 1) die(`Ambiguous agent: ${target}; use its id`);
  return rows[0]!.id;
}

interface QueueInvocation {
  subcommand: string | undefined;
  host: string | undefined;
  agent: string | undefined;
  space: string | undefined;
  positional: string[];
  json: boolean;
  worktree: boolean;
}

function parseQueueInvocation(args: string[]): QueueInvocation {
  const subcommand = args[0];
  const host = takeValue(args.slice(1), "--host");
  const agent = takeValue(host.rest, "--agent");
  const space = takeValue(agent.rest, "--space");
  const { enabled, positional } = splitOptionFlags(space.rest, ["--json", "--worktree"]);
  if (host.value && subcommand !== "add") die("--host is only supported for orch queue add");
  return {
    subcommand,
    host: host.value,
    agent: agent.value,
    space: space.value,
    positional,
    json: enabled.has("--json"),
    worktree: enabled.has("--worktree"),
  };
}

function validateAdd(invocation: QueueInvocation): string {
  const text = invocation.positional.join(" ");
  if (!text) die('usage: orch queue add "<task text>" [--agent <target>|--space <id>] [--worktree] [--json]');
  if (invocation.agent && invocation.space) die("Choose exactly one of --agent or --space");
  return text;
}

async function queueAdd(invocation: QueueInvocation, args: string[]): Promise<void> {
  const text = validateAdd(invocation);
  if (invocation.host) {
    remoteWrite(invocation.host, "queue", ["add", ...args.slice(1).filter((part) => part !== "--host" && part !== invocation.host)]);
    return;
  }
  const directory = orchDir();
  await ensureDaemon(directory);
  const identity = await rpcHello(directory);
  let options = {};
  if (invocation.worktree) {
    const name = `queue-${randomUUID()}`;
    const worktreePath = createAgentWorktree(process.cwd(), name);
    options = { worktree: true, cwd: worktreePath, branch: `orch/${name}` };
  }
  const scope: TaskScopeSelection = invocation.agent
    ? { agentId: resolveAgent(directory, invocation.agent) }
    : invocation.space ? { spaceId: invocation.space } : {};
  const task = addTask(directory, text, options, identity.id, scope);
  writeQueueTask(task, invocation.json, task.id);
}

function validateCollection(invocation: QueueInvocation): void {
  if (invocation.positional.length > 0 || invocation.worktree || invocation.agent || invocation.space) {
    die(`usage: orch queue ${invocation.subcommand} [--json]`);
  }
}

function queueCollection(invocation: QueueInvocation): void {
  validateCollection(invocation);
  const directory = orchDir();
  const tasks = invocation.subcommand === "history" ? queueHistory(directory) : listTasks(directory);
  if (invocation.json) process.stdout.write(JSON.stringify(tasks, null, 2) + "\n");
  else renderQueueTasks(tasks);
}

async function queueEdit(invocation: QueueInvocation): Promise<void> {
  const id = invocation.positional[0];
  const text = invocation.positional.slice(1).join(" ");
  if (!id || !text || invocation.worktree || invocation.agent || invocation.space) {
    die("usage: orch queue edit <id> <task text> [--json]");
  }
  try {
    const directory = orchDir();
    await ensureDaemon(directory);
    const identity = await rpcHello(directory);
    const task = editTask(directory, id, identity.id, { text });
    if (task.error) die(task.error);
    writeQueueTask(task, invocation.json, `Edited ${task.id}`);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

async function queueTakeOn(invocation: QueueInvocation): Promise<void> {
  const id = invocation.positional[0];
  if (!id || invocation.positional.length !== 1 || invocation.worktree || invocation.space) {
    die("usage: orch queue take-on <id> [--agent <target>] [--json]");
  }
  try {
    const directory = orchDir();
    await ensureDaemon(directory);
    const identity = await rpcHello(directory);
    const taker = invocation.agent ? resolveAgent(directory, invocation.agent) : identity.id;
    const task = takeOnTask(directory, id, taker);
    writeQueueTask(task, invocation.json, `Took on ${task.id}`);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

async function queueReap(invocation: QueueInvocation): Promise<void> {
  const id = invocation.positional[0];
  if (!id || invocation.positional.length !== 1 || invocation.worktree || invocation.agent || invocation.space) {
    die("usage: orch queue reap <id> [--json]");
  }
  try {
    const directory = orchDir();
    await ensureDaemon(directory);
    const identity = await rpcHello(directory);
    reapTask(directory, id, identity.id);
    if (invocation.json) process.stdout.write(JSON.stringify({ id, state: "reaped" }) + "\n");
    else process.stdout.write(`Reaped ${id}\n`);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

async function queueCancel(invocation: QueueInvocation): Promise<void> {
  const id = invocation.positional[0];
  if (!id || invocation.positional.length !== 1 || invocation.worktree || invocation.agent || invocation.space) {
    die("usage: orch queue cancel <id> [--json]");
  }
  try {
    const directory = orchDir();
    await ensureDaemon(directory);
    const identity = await rpcHello(directory);
    const task = cancelTask(directory, id, identity.id, { human: true });
    if (task.error) die(task.error);
    writeQueueTask(task, invocation.json, `Cancelled ${task.id}`);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

export async function cmdQueue(args: string[]): Promise<void> {
  const invocation = parseQueueInvocation(args);
  switch (invocation.subcommand) {
    case "add":
      await queueAdd(invocation, args);
      return;
    case "list":
    case "history":
      queueCollection(invocation);
      return;
    case "cancel":
      await queueCancel(invocation);
      return;
    case "edit":
      await queueEdit(invocation);
      return;
    case "take-on":
      await queueTakeOn(invocation);
      return;
    case "reap":
      await queueReap(invocation);
      return;
    default:
      die("usage: orch queue <add|list|history|cancel|edit|take-on|reap> ...");
  }
}
