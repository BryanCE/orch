import { createServerFn } from "@tanstack/react-start";

import { daemonRpc } from "./daemon.ts";
import { RPC_RESULTS } from "@orch/daemon/client/protocol.ts";
import type { TaskRec, TaskState } from "@orch/types/queue.ts";

export interface QueueGroups {
  queued: TaskRec[];
  claimed: TaskRec[];
  done: TaskRec[];
  failed: TaskRec[];
  cancelled: TaskRec[];
  unrunnable: TaskRec[];
}

const emptyGroups = (): QueueGroups => ({
  queued: [],
  claimed: [],
  done: [],
  failed: [],
  cancelled: [],
  unrunnable: [],
});

function groupTasks(tasks: TaskRec[]): QueueGroups {
  const groups = emptyGroups();
  for (const task of tasks) groups[task.state].push(task);
  return groups;
}

/** Read the durable queue through orchd, the same `queue-list` call `orch queue` makes. */
export const getQueue = createServerFn({ method: "GET", strict: { output: false } }).handler(async (): Promise<QueueGroups> => {
  const { result } = await daemonRpc<unknown>("queue-list", { history: false });
  return groupTasks(RPC_RESULTS["queue-list"].parse(result).tasks);
});

export type QueueLane = keyof QueueGroups;
export const QUEUE_LANES = ["queued", "claimed", "done", "failed", "cancelled", "unrunnable"] satisfies readonly TaskState[];
