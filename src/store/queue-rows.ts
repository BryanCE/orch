import type { TaskOptions, TaskRec, TaskState } from "../queue.ts";
import { openStore } from "./connection.ts";
import { nullableJsonText, setNonNullField } from "./row-values.ts";

interface QueueRow {
  id: string;
  text: string;
  opts: string;
  origin_workspace: string | null;
  created_at: string;
  updated_at: string;
  state: string;
  retries: number;
  last_error: string | null;
  agent_key: string | null;
  dispatch_id: string | null;
  result: string | null;
}

function rowToTask(row: QueueRow): TaskRec {
  const task: TaskRec = {
    id: row.id,
    text: row.text,
    opts: JSON.parse(row.opts) as TaskOptions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    state: row.state as TaskState,
    retries: row.retries,
  };
  setNonNullField(task, "workspace", row.origin_workspace);
  setNonNullField(task, "lastError", row.last_error);
  setNonNullField(task, "agentKey", row.agent_key);
  setNonNullField(task, "dispatchId", row.dispatch_id);
  setNonNullField(task, "result", row.result === null ? null : JSON.parse(row.result) as unknown);
  return task;
}

export function insertQueueTask(orchDir: string, task: TaskRec): void {
  openStore(orchDir)
    .query(
      `INSERT INTO queue (id, text, opts, origin_workspace, created_at, updated_at, state, retries)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      task.id,
      task.text,
      JSON.stringify(task.opts),
      task.workspace ?? null,
      task.createdAt,
      task.updatedAt,
      task.state,
      task.retries,
    );
}

export function selectQueueTasks(orchDir: string): TaskRec[] {
  const rows = openStore(orchDir).query("SELECT * FROM queue ORDER BY created_at ASC").all() as QueueRow[];
  return rows.map(rowToTask);
}

export function selectQueueTask(orchDir: string, id: string): TaskRec | undefined {
  const row = openStore(orchDir).query("SELECT * FROM queue WHERE id = ?").get(id) as QueueRow | null;
  return row ? rowToTask(row) : undefined;
}

export function countTasksInState(orchDir: string, state: TaskState): number {
  const row = openStore(orchDir).query("SELECT COUNT(*) AS count FROM queue WHERE state = ?").get(state) as { count: number };
  return Number(row.count);
}

export function selectTasksInStates(orchDir: string, states: readonly TaskState[]): TaskRec[] {
  if (states.length === 0) return [];
  const placeholders = states.map(() => "?").join(", ");
  const rows = openStore(orchDir)
    .query(`SELECT * FROM queue WHERE state IN (${placeholders}) ORDER BY created_at ASC`)
    .all(...states) as QueueRow[];
  return rows.map(rowToTask);
}

/** Atomic queued->claimed transition; true only for the single winning caller.
 *  The claim stamps the dispatch id the agent will be sent, so a later settle
 *  can prove the agent's reported state is for THIS task and not another prompt. */
export function writeTaskClaim(orchDir: string, id: string, agentKey: string, ts: string, dispatchId: string): boolean {
  const changes = openStore(orchDir)
    .query("UPDATE queue SET state = 'claimed', agent_key = ?, dispatch_id = ?, updated_at = ? WHERE id = ? AND state = 'queued'")
    .run(agentKey, dispatchId, ts, id).changes;
  return changes === 1;
}

export function writeTaskDone(orchDir: string, id: string, ts: string, result: unknown): void {
  openStore(orchDir)
    .query("UPDATE queue SET state = 'done', result = ?, updated_at = ? WHERE id = ? AND state = 'claimed'")
    .run(nullableJsonText(result), ts, id);
}

/** Terminal failure. Reaches claimed tasks and bound-but-requeued ones (queued
 *  with an agent_key): a retry whose agent died must die too, never re-bind. */
export function writeTaskFailure(orchDir: string, id: string, ts: string, error: string): void {
  openStore(orchDir)
    .query("UPDATE queue SET state = 'failed', last_error = ?, updated_at = ? WHERE id = ? AND (state = 'claimed' OR (state = 'queued' AND agent_key IS NOT NULL))")
    .run(error, ts, id);
}

export function writeTaskRequeue(orchDir: string, id: string, ts: string, error?: string): void {
  const db = openStore(orchDir);
  if (error === undefined) {
    db.query(
      "UPDATE queue SET state = 'queued', retries = retries + 1, updated_at = ? WHERE id = ? AND state IN ('claimed', 'failed')",
    ).run(ts, id);
    return;
  }
  db.query(
    "UPDATE queue SET state = 'queued', retries = retries + 1, last_error = ?, updated_at = ? WHERE id = ? AND state IN ('claimed', 'failed')",
  ).run(error, ts, id);
}

export function writeTaskCancel(orchDir: string, id: string, ts: string): void {
  openStore(orchDir)
    .query("UPDATE queue SET state = 'cancelled', updated_at = ? WHERE id = ? AND state = 'queued'")
    .run(ts, id);
}

export function deleteSettledTasksBefore(orchDir: string, cutoffIso: string): number {
  return openStore(orchDir)
    .query("DELETE FROM queue WHERE state IN ('done', 'failed', 'cancelled') AND updated_at < ?")
    .run(cutoffIso).changes;
}
