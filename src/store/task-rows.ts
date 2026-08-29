import { openStore, storeExists } from "./connection.ts";
import { isRecord } from "../util.ts";
import type { AttemptRow, NewTask, ScopeQuery, TaskRow, TaskState } from "../types/queue.ts";
export type { AttemptRow, NewTask, ScopeQuery, TaskRow, TaskState };

interface RawTaskRow {
  id: string;
  text: string;
  opts: string;
  enqueued_by: string;
  scope_agent_id: string | null;
  scope_pack_id: string | null;
  scope_space_id: string | null;
  created_at: number;
}

interface RawAttemptRow {
  task_id: string;
  since: number;
  until: number | null;
  agent_id: string;
  dispatch_id: string;
  outcome: "done" | "failed" | null;
  result: string | null;
  error: string | null;
}

interface RawIntakeRow {
  pack_id: string;
  space_id: string;
  since: number;
  until: number | null;
}

interface RawTaskStateRow {
  state: TaskState | null;
}

interface RawTaskWithState extends RawTaskRow {
  state: TaskState;
}

function encodeJson(value: unknown): string {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("task JSON value is not serializable");
  return encoded;
}

function isTaskState(value: unknown): value is TaskState {
  return value === "queued" || value === "claimed" || value === "done"
    || value === "failed" || value === "cancelled" || value === "unrunnable";
}

function isRawTaskRow(value: unknown): value is RawTaskRow {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.text === "string"
    && typeof value.opts === "string"
    && typeof value.enqueued_by === "string"
    && (value.scope_agent_id === null || typeof value.scope_agent_id === "string")
    && (value.scope_pack_id === null || typeof value.scope_pack_id === "string")
    && (value.scope_space_id === null || typeof value.scope_space_id === "string")
    && typeof value.created_at === "number" && Number.isSafeInteger(value.created_at);
}

function isRawAttemptRow(value: unknown): value is RawAttemptRow {
  return isRecord(value)
    && typeof value.task_id === "string"
    && typeof value.since === "number" && Number.isSafeInteger(value.since)
    && (value.until === null || (typeof value.until === "number" && Number.isSafeInteger(value.until)))
    && typeof value.agent_id === "string"
    && typeof value.dispatch_id === "string"
    && (value.outcome === null || value.outcome === "done" || value.outcome === "failed")
    && (value.result === null || typeof value.result === "string")
    && (value.error === null || typeof value.error === "string");
}

function isRawIntakeRow(value: unknown): value is RawIntakeRow {
  return isRecord(value)
    && typeof value.pack_id === "string"
    && typeof value.space_id === "string"
    && typeof value.since === "number" && Number.isSafeInteger(value.since)
    && (value.until === null || (typeof value.until === "number" && Number.isSafeInteger(value.until)));
}

function isRawTaskStateRow(value: unknown): value is RawTaskStateRow {
  return isRecord(value) && (value.state === null || isTaskState(value.state));
}

function isRawTaskWithState(value: unknown): value is RawTaskWithState {
  return isRecord(value) && isRawTaskRow(value) && isTaskState(value.state);
}

function rowsOf<T>(values: unknown[], guard: (value: unknown) => value is T, label: string): T[] {
  return values.map((value, index) => {
    if (!guard(value)) throw new Error(`Malformed ${label} row at index ${index}`);
    return value;
  });
}

function parseStoredJson(value: string, label: string): unknown {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed;
  } catch {
    throw new Error(`Malformed ${label} row: invalid JSON`);
  }
}

function task(row: RawTaskRow): TaskRow {
  return {
    id: row.id,
    text: row.text,
    opts: parseStoredJson(row.opts, "task"),
    enqueuedBy: row.enqueued_by,
    scopeAgentId: row.scope_agent_id,
    scopePackId: row.scope_pack_id,
    scopeSpaceId: row.scope_space_id,
    createdAt: row.created_at,
  };
}

function attempt(row: RawAttemptRow): AttemptRow {
  return {
    taskId: row.task_id,
    since: row.since,
    until: row.until,
    agentId: row.agent_id,
    dispatchId: row.dispatch_id,
    outcome: row.outcome,
    result: row.result == null ? null : parseStoredJson(row.result, "task attempt"),
    error: row.error,
  };
}

export function enqueueTask(dir: string, input: NewTask): void {
  const scopeAgentId = "scopeAgentId" in input ? input.scopeAgentId : null;
  const scopePackId = "scopePackId" in input ? input.scopePackId : null;
  const scopeSpaceId = "scopeSpaceId" in input ? input.scopeSpaceId : null;
  openStore(dir)
    .query("INSERT INTO tasks (id,text,opts,enqueued_by,scope_agent_id,scope_pack_id,scope_space_id,created_at) VALUES (?,?,?,?,?,?,?,?)")
    .run(
      input.id,
      input.text,
      encodeJson(input.opts),
      input.enqueuedBy,
      scopeAgentId,
      scopePackId,
      scopeSpaceId,
      input.createdAt ?? Date.now(),
    );
}

export function updateTask(dir: string, taskId: string, byAgentId: string, changes: { text?: string; opts?: unknown }): void {
  const assignments: string[] = [];
  const values: unknown[] = [];
  if (changes.text !== undefined) {
    assignments.push("text=?");
    values.push(changes.text);
  }
  if (changes.opts !== undefined) {
    assignments.push("opts=?");
    values.push(encodeJson(changes.opts));
  }
  if (assignments.length === 0) return;
  values.push(taskId, byAgentId);
  const result = openStore(dir)
    .query(`UPDATE tasks SET ${assignments.join(", ")} WHERE id=? AND enqueued_by=? AND EXISTS (SELECT 1 FROM task_states s WHERE s.task_id=tasks.id AND s.state='queued')`)
    .run(...values);
  if (result.changes !== 1) throw new Error("task is not editable by this enqueuer");
}

/** Re-scope an unrunnable task to a live taker's pack. */
export function rescopeTask(dir: string, taskId: string, packId: string): void {
  const changes = openStore(dir).query(
    `UPDATE tasks SET scope_agent_id=NULL, scope_pack_id=?, scope_space_id=NULL
     WHERE id=? AND EXISTS (SELECT 1 FROM task_states s WHERE s.task_id=tasks.id AND s.state='unrunnable')`,
  ).run(packId, taskId).changes;
  if (changes !== 1) throw new Error("task is not unrunnable");
}

/** Explicitly remove an unrunnable task; queued/claimable work is never reapable. */
export function deleteUnrunnableTask(dir: string, taskId: string): boolean {
  const changes = openStore(dir).query(
    `DELETE FROM tasks WHERE id=? AND EXISTS (SELECT 1 FROM task_states s WHERE s.task_id=tasks.id AND s.state='unrunnable')`,
  ).run(taskId).changes;
  if (changes !== 1) throw new Error("task is not unrunnable");
  return true;
}

export function insertAttempt(dir: string, taskId: string, agentId: string, dispatchId: string, since = Date.now()): void {
  openStore(dir).query("INSERT INTO task_attempts (task_id,since,agent_id,dispatch_id) VALUES (?,?,?,?)").run(taskId, since, agentId, dispatchId);
}

export function settleAttempt(
  dir: string,
  taskId: string,
  since: number,
  until: number,
  outcome: "done" | "failed",
  values: { result?: unknown; error?: string } = {},
): void {
  const result = outcome === "done" ? (values.result === undefined ? null : encodeJson(values.result)) : null;
  const error = outcome === "failed" ? (values.error ?? null) : null;
  const changes = openStore(dir)
    .query("UPDATE task_attempts SET until=?, outcome=?, result=?, error=? WHERE task_id=? AND since=? AND until IS NULL")
    .run(until, outcome, result, error, taskId, since).changes;
  if (changes !== 1) throw new Error("open task attempt not found");
}

export function insertCancellation(dir: string, taskId: string, cancelledBy: string, cancelledAt = Date.now()): void {
  openStore(dir).query("INSERT INTO task_cancellations (task_id,cancelled_at,cancelled_by) VALUES (?,?,?)").run(taskId, cancelledAt, cancelledBy);
}

/** `task_states` is the ONE definition of a task's state (Cq15). Re-deriving any
 *  part of it here would be a second truth that drifts from the rows it reads. */
export function taskState(dir: string, taskId: string): TaskState | undefined {
  const rawStateRow = openStore(dir).query("SELECT state FROM task_states WHERE task_id=?").get(taskId);
  if (rawStateRow === null) return undefined;
  if (!isRawTaskStateRow(rawStateRow)) throw new Error("Malformed task state row");
  return rawStateRow.state ?? undefined;
}

export function taskById(dir: string, taskId: string): TaskRow | undefined {
  const rawRow = openStore(dir).query("SELECT * FROM tasks WHERE id=?").get(taskId);
  if (rawRow === null) return undefined;
  if (!isRawTaskRow(rawRow)) throw new Error("Malformed task row");
  return task(rawRow);
}

/** Agents currently targeted by a task's scope, used for lease-gated cancellation. */
export function agentsInTaskScope(dir: string, taskId: string): string[] {
  const row = taskById(dir, taskId);
  if (!row) return [];
  const db = openStore(dir);
  const rows: unknown[] = row.scopeAgentId !== null
    ? [{ id: row.scopeAgentId }]
    : row.scopePackId !== null
      ? db.query("SELECT id FROM agents WHERE root_agent_id=?").all(row.scopePackId)
      : db.query(`SELECT DISTINCT a.id FROM agents a JOIN pack_intakes i ON i.pack_id=a.root_agent_id
                  WHERE i.space_id=? AND i.until IS NULL`).all(row.scopeSpaceId);
  return rows.filter((value): value is { id: string } => isRecord(value) && typeof value.id === "string").map((value) => value.id);
}

export function allTasks(dir: string): (TaskRow & { state: TaskState })[] {
  // B6: `orch doctor` runs this and must never write. A store that does not
  // exist holds no tasks — creating one to discover that is the write the row
  // forbids, and it turns "you have not set up orch" into "you have".
  if (!storeExists(dir)) return [];
  const rows = rowsOf(openStore(dir).query(`
    SELECT t.*, s.state FROM tasks t
    JOIN task_states s ON s.task_id=t.id
    ORDER BY t.created_at, t.id
  `).all(), isRawTaskWithState, "task");
  return rows.map((row) => ({ ...task(row), state: row.state }));
}

/** Retention is based on the last settlement clock. Queued and open attempts
 * are never age-reaped. Cancellation has its own settlement clock. */
export function deleteSettledTasksBefore(dir: string, cutoff: number): number {
  const db = openStore(dir);
  const ids = db.query(`
    SELECT t.id FROM tasks t
    JOIN task_states s ON s.task_id=t.id
    LEFT JOIN task_cancellations c ON c.task_id=t.id
    WHERE s.state IN ('done','failed','cancelled')
      AND COALESCE(c.cancelled_at, (
        SELECT MAX(a.until) FROM task_attempts a WHERE a.task_id=t.id
      )) < ?
  `).all(cutoff).filter((row): row is { id: string } => row !== null && typeof row === "object" && !Array.isArray(row) && typeof Reflect.get(row, "id") === "string");
  const remove = db.query("DELETE FROM tasks WHERE id=?");
  for (const row of ids) remove.run(row.id);
  return ids.length;
}

export function attemptsOf(dir: string, taskId: string): AttemptRow[] {
  const rows = rowsOf(openStore(dir).query("SELECT task_id,since,until,agent_id,dispatch_id,outcome,result,error FROM task_attempts WHERE task_id=? ORDER BY since").all(taskId), isRawAttemptRow, "task attempt");
  return rows.map(attempt);
}

export function openTasksInScope(dir: string, query: ScopeQuery): TaskRow[] {
  const db = openStore(dir);
  let rows: RawTaskRow[];
  if ("agentId" in query) {
    rows = rowsOf(db.query(`
      SELECT DISTINCT t.* FROM tasks t
      LEFT JOIN agents a ON a.id=?
      WHERE (t.scope_agent_id=? OR t.scope_pack_id=a.root_agent_id
        OR (t.scope_space_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM pack_intakes i
          WHERE i.pack_id=a.root_agent_id AND i.space_id=t.scope_space_id AND i.until IS NULL
        )))
        AND NOT EXISTS (SELECT 1 FROM task_cancellations c WHERE c.task_id=t.id)
    `).all(query.agentId, query.agentId), isRawTaskRow, "task");
  } else if ("packId" in query) {
    rows = rowsOf(db.query(`
      SELECT t.* FROM tasks t
      WHERE (t.scope_pack_id=? OR (t.scope_space_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM pack_intakes i
        WHERE i.pack_id=? AND i.space_id=t.scope_space_id AND i.until IS NULL
      )))
        AND NOT EXISTS (SELECT 1 FROM task_cancellations c WHERE c.task_id=t.id)
    `).all(query.packId, query.packId), isRawTaskRow, "task");
  } else {
    rows = rowsOf(db.query("SELECT t.* FROM tasks t WHERE t.scope_space_id=? AND NOT EXISTS (SELECT 1 FROM task_cancellations c WHERE c.task_id=t.id)").all(query.spaceId), isRawTaskRow, "task");
  }
  return rows.filter((row) => {
    const state = taskState(dir, row.id);
    return state === "queued" || state === "failed";
  }).map(task);
}

export function openIntake(dir: string, packId: string, spaceId: string, since = Date.now()): void {
  openStore(dir).query("INSERT INTO pack_intakes (pack_id,space_id,since) VALUES (?,?,?)").run(packId, spaceId, since);
}

export function closeIntake(dir: string, packId: string, spaceId: string, until = Date.now()): void {
  openStore(dir).query("UPDATE pack_intakes SET until=? WHERE pack_id=? AND space_id=? AND until IS NULL").run(until, packId, spaceId);
}

export function intakesOf(dir: string, packId: string): { packId: string; spaceId: string; since: number; until: number | null }[] {
  const rows = rowsOf(openStore(dir).query("SELECT pack_id,space_id,since,until FROM pack_intakes WHERE pack_id=? ORDER BY since").all(packId), isRawIntakeRow, "pack intake");
  return rows.map((row) => ({ packId: row.pack_id, spaceId: row.space_id, since: row.since, until: row.until }));
}
