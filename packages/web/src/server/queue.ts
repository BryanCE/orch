import { createServerFn } from "@tanstack/react-start";

import { orchDir } from "@orch/presence/writer.ts";
import { listTasks } from "@orch/queue.ts";
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

/** Read the durable queue directly from orch's store. Writes remain daemon-owned. */
export const getQueue = createServerFn({ method: "GET", strict: { output: false } }).handler((): QueueGroups => {
  return groupTasks(listTasks(orchDir()));
});

export type QueueLane = keyof QueueGroups;
export const QUEUE_LANES = ["queued", "claimed", "done", "failed", "cancelled", "unrunnable"] satisfies readonly TaskState[];
