import { randomUUID } from "node:crypto";
import { addTask, cancelTask, listTasks, history as queueHistory, type TaskRec } from "../queue.ts";
import { orchDir } from "../presence/store.ts";
import { renderTable } from "../table.ts";
import { errorMessage } from "../util.ts";
import { createAgentWorktree } from "../worktree.ts";
import { callerWorkspace, die, remoteWrite, splitOptionFlags } from "./target.ts";

export function renderQueueTasks(tasks: TaskRec[]): void {
  if (tasks.length === 0) {
    process.stdout.write("No queue tasks.\n");
    return;
  }
  const headers = ["ID", "STATE", "RETRIES", "AGENT", "TASK", "ERROR"];
  const caps = [36, 10, 7, 16, 60, 40];
  const rows = tasks.map((task) => [
    task.id,
    task.state,
    String(task.retries),
    task.agentKey ?? "-",
    task.text,
    task.lastError ?? "",
  ]);
  process.stdout.write(renderTable(headers, rows, caps) + "\n");
}

function writeQueueTask(task: TaskRec, json: boolean, plainText: string): void {
  if (json) process.stdout.write(JSON.stringify(task, null, 2) + "\n");
  else process.stdout.write(plainText + "\n");
}

export function cmdQueue(args: string[]) {
  const subcommand = args[0];
  const hostIndex = args.indexOf("--host");
  let hostName: string | null = null;
  let queueArgs = args;
  if (hostIndex >= 0) {
    hostName = args[hostIndex + 1] ?? null;
    if (!hostName) die('usage: orch queue add --host <host> "<task text>" [--worktree] [--json]');
    queueArgs = args.slice(0, hostIndex).concat(args.slice(hostIndex + 2));
  }
  const { enabled, positional } = splitOptionFlags(queueArgs.slice(1), ["--json", "--worktree"]);
  const json = enabled.has("--json");
  if (hostName && subcommand !== "add") die("--host is only supported for orch queue add");
  const worktree = enabled.has("--worktree");

  switch (subcommand) {
    case "add": {
      const text = positional.join(" ");
      if (!text) die('usage: orch queue add "<task text>" [--worktree] [--json]');
      if (hostName) {
        remoteWrite(hostName, "queue", ["add", ...queueArgs.slice(1)]);
        return;
      }
      const workspace = callerWorkspace();
      if (!workspace) die("Could not determine the origin workspace for this task. Run from a backend workspace or pass --host <host>.");
      let options = {};
      if (worktree) {
        const name = `queue-${randomUUID()}`;
        const worktreePath = createAgentWorktree(process.cwd(), name);
        options = { worktree: true, cwd: worktreePath, branch: `orch/${name}` };
      }
      const task = addTask(orchDir(), text, options, workspace);
      writeQueueTask(task, json, task.id);
      return;
    }
    case "list":
    case "history": {
      if (positional.length > 0 || worktree) die(`usage: orch queue ${subcommand} [--json]`);
      const tasks = subcommand === "history" ? queueHistory(orchDir()) : listTasks(orchDir());
      if (json) {
        process.stdout.write(JSON.stringify(tasks, null, 2) + "\n");
        return;
      }
      renderQueueTasks(tasks);
      return;
    }
    case "cancel": {
      const id = positional[0];
      if (!id || positional.length !== 1 || worktree) die("usage: orch queue cancel <id> [--json]");
      let task;
      try {
        task = cancelTask(orchDir(), id);
      } catch (error: unknown) {
        die(errorMessage(error));
      }
      if (task.error) die(task.error);
      writeQueueTask(task, json, `Cancelled ${task.id}`);
      return;
    }
    default:
      die("usage: orch queue <add|list|history|cancel> ...");
  }
}
