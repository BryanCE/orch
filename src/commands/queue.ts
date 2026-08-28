import { randomUUID } from "node:crypto";
import { addTask, cancelTask, listTasks, history as queueHistory, type TaskRec, type TaskScopeSelection } from "../queue.ts";
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
    return [task.id, task.state, String(task.attempts.length), attempt?.agentId ?? "-", task.text, attempt?.error ?? ""];
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

export async function cmdQueue(args: string[]): Promise<void> {
  const subcommand = args[0];
  const host = takeValue(args.slice(1), "--host");
  const agent = takeValue(host.rest, "--agent");
  const space = takeValue(agent.rest, "--space");
  const { enabled, positional } = splitOptionFlags(space.rest, ["--json", "--worktree"]);
  const json = enabled.has("--json");
  const worktree = enabled.has("--worktree");
  if (host.value && subcommand !== "add") die("--host is only supported for orch queue add");

  switch (subcommand) {
    case "add": {
      const text = positional.join(" ");
      if (!text) die('usage: orch queue add "<task text>" [--agent <target>|--space <id>] [--worktree] [--json]');
      if (agent.value && space.value) die("Choose exactly one of --agent or --space");
      if (host.value) {
        remoteWrite(host.value, "queue", ["add", ...args.slice(1).filter((part) => part !== "--host" && part !== host.value)]);
        return;
      }
      const directory = orchDir();
      await ensureDaemon(directory);
      const identity = await rpcHello(directory);
      let options = {};
      if (worktree) {
        const name = `queue-${randomUUID()}`;
        const worktreePath = createAgentWorktree(process.cwd(), name);
        options = { worktree: true, cwd: worktreePath, branch: `orch/${name}` };
      }
      const scope: TaskScopeSelection = agent.value
        ? { agentId: resolveAgent(directory, agent.value) }
        : space.value ? { spaceId: space.value } : {};
      const task = addTask(directory, text, options, identity.id, scope);
      writeQueueTask(task, json, task.id);
      return;
    }
    case "list":
    case "history": {
      if (positional.length > 0 || worktree || agent.value || space.value) die(`usage: orch queue ${subcommand} [--json]`);
      const tasks = subcommand === "history" ? queueHistory(orchDir()) : listTasks(orchDir());
      if (json) process.stdout.write(JSON.stringify(tasks, null, 2) + "\n");
      else renderQueueTasks(tasks);
      return;
    }
    case "cancel": {
      const id = positional[0];
      if (!id || positional.length !== 1 || worktree || agent.value || space.value) die("usage: orch queue cancel <id> [--json]");
      try {
        const directory = orchDir();
        await ensureDaemon(directory);
        const identity = await rpcHello(directory);
        const task = cancelTask(directory, id, identity.id, { human: true });
        if (task.error) die(task.error);
        writeQueueTask(task, json, `Cancelled ${task.id}`);
      } catch (error: unknown) {
        die(errorMessage(error));
      }
      return;
    }
    default:
      die("usage: orch queue <add|list|history|cancel> ...");
  }
}
