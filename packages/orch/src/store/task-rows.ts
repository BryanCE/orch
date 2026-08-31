import { and, asc, eq, inArray, isNull, notInArray, or, sql, type SQL } from "drizzle-orm";
import { orm, ormForRead } from "./connection.ts";
import { agents, packIntakes, taskAttempts, taskCancellations, taskStates, tasks } from "../db/schema.ts";
import type { AttemptRow, NewTask, ScopeQuery, TaskRow, TaskState } from "../types/queue.ts";
export type { AttemptRow, NewTask, ScopeQuery, TaskRow, TaskState };

type StoredTask = typeof tasks.$inferSelect;
type StoredAttempt = typeof taskAttempts.$inferSelect;

function encodeJson(value: unknown): string {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("task JSON value is not serializable");
  return encoded;
}

function isTaskState(value: string | null): value is TaskState {
  return value === "queued" || value === "claimed" || value === "done"
    || value === "failed" || value === "cancelled" || value === "unrunnable";
}

/** The stored JSON of a task. The COLUMN is text, so this is the one place that
 *  decides what a malformed payload means: a refusal, never a silent `{}`. */
function parseStoredJson(value: string, label: string): unknown {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed;
  } catch {
    throw new Error(`Malformed ${label} row: invalid JSON`);
  }
}

function task(row: StoredTask): TaskRow {
  return {
    id: row.id,
    text: row.text,
    opts: parseStoredJson(row.opts, "task"),
    enqueuedBy: row.enqueuedBy,
    scopeAgentId: row.scopeAgentId,
    scopePackId: row.scopePackId,
    scopeSpaceId: row.scopeSpaceId,
    createdAt: row.createdAt,
  };
}

function attempt(row: StoredAttempt): AttemptRow {
  if (row.outcome !== null && row.outcome !== "done" && row.outcome !== "failed") {
    throw new Error(`Malformed task attempt row: outcome ${JSON.stringify(row.outcome)}`);
  }
  return {
    taskId: row.taskId,
    since: row.since,
    until: row.until,
    agentId: row.agentId,
    dispatchId: row.dispatchId,
    outcome: row.outcome,
    result: row.result === null ? null : parseStoredJson(row.result, "task attempt"),
    error: row.error,
  };
}

/** Ids of the tasks `task_states` reports in this state. Read as VALUES rather
 *  than left as a subquery: the state view is the one definition either way, and
 *  a list of ids is what every caller here actually gates on. */
function idsInState(dir: string, state: TaskState): string[] {
  return orm(dir).select({ taskId: taskStates.taskId }).from(taskStates)
    .where(eq(taskStates.state, state)).all().map((row) => row.taskId);
}

export function enqueueTask(dir: string, input: NewTask): void {
  orm(dir).insert(tasks).values({
    id: input.id,
    text: input.text,
    opts: encodeJson(input.opts),
    enqueuedBy: input.enqueuedBy,
    scopeAgentId: "scopeAgentId" in input ? input.scopeAgentId : null,
    scopePackId: "scopePackId" in input ? input.scopePackId : null,
    scopeSpaceId: "scopeSpaceId" in input ? input.scopeSpaceId : null,
    createdAt: input.createdAt ?? Date.now(),
  }).run();
}

export function updateTask(dir: string, taskId: string, byAgentId: string, changes: { text?: string; opts?: unknown }): void {
  const values: { text?: string; opts?: string } = {
    ...(changes.text === undefined ? {} : { text: changes.text }),
    ...(changes.opts === undefined ? {} : { opts: encodeJson(changes.opts) }),
  };
  if (Object.keys(values).length === 0) return;
  const changed = orm(dir).update(tasks).set(values)
    .where(and(eq(tasks.id, taskId), eq(tasks.enqueuedBy, byAgentId), inArray(tasks.id, idsInState(dir, "queued"))))
    .run().changes;
  if (changed !== 1) throw new Error("task is not editable by this enqueuer");
}

/** Re-scope an unrunnable task to a live taker's pack. */
export function rescopeTask(dir: string, taskId: string, packId: string): void {
  const changed = orm(dir).update(tasks)
    .set({ scopeAgentId: null, scopePackId: packId, scopeSpaceId: null })
    .where(and(eq(tasks.id, taskId), inArray(tasks.id, idsInState(dir, "unrunnable"))))
    .run().changes;
  if (changed !== 1) throw new Error("task is not unrunnable");
}

/** Explicitly remove an unrunnable task; queued/claimable work is never reapable. */
export function deleteUnrunnableTask(dir: string, taskId: string): boolean {
  const changed = orm(dir).delete(tasks)
    .where(and(eq(tasks.id, taskId), inArray(tasks.id, idsInState(dir, "unrunnable"))))
    .run().changes;
  if (changed !== 1) throw new Error("task is not unrunnable");
  return true;
}

export function insertAttempt(dir: string, taskId: string, agentId: string, dispatchId: string, since = Date.now()): void {
  orm(dir).insert(taskAttempts).values({ taskId, since, agentId, dispatchId }).run();
}

export function settleAttempt(
  dir: string,
  taskId: string,
  since: number,
  until: number,
  outcome: "done" | "failed",
  values: { result?: unknown; error?: string } = {},
): void {
  const changed = orm(dir).update(taskAttempts).set({
    until,
    outcome,
    result: outcome === "done" && values.result !== undefined ? encodeJson(values.result) : null,
    error: outcome === "failed" ? values.error ?? null : null,
  }).where(and(eq(taskAttempts.taskId, taskId), eq(taskAttempts.since, since), isNull(taskAttempts.until)))
    .run().changes;
  if (changed !== 1) throw new Error("open task attempt not found");
}

export function insertCancellation(dir: string, taskId: string, cancelledBy: string, cancelledAt = Date.now()): void {
  orm(dir).insert(taskCancellations).values({ taskId, cancelledAt, cancelledBy }).run();
}

/** `task_states` is the ONE definition of a task's state (Cq15). Re-deriving any
 *  part of it here would be a second truth that drifts from the rows it reads. */
export function taskState(dir: string, taskId: string): TaskState | undefined {
  const row = orm(dir).select({ state: taskStates.state }).from(taskStates).where(eq(taskStates.taskId, taskId)).get();
  if (!row) return undefined;
  if (row.state !== null && !isTaskState(row.state)) throw new Error("Malformed task state row");
  return row.state ?? undefined;
}

export function taskById(dir: string, taskId: string): TaskRow | undefined {
  const row = orm(dir).select().from(tasks).where(eq(tasks.id, taskId)).get();
  return row === undefined ? undefined : task(row);
}

/** Agents currently targeted by a task's scope, used for lease-gated cancellation. */
export function agentsInTaskScope(dir: string, taskId: string): string[] {
  const row = taskById(dir, taskId);
  if (!row) return [];
  if (row.scopeAgentId !== null) return [row.scopeAgentId];
  if (row.scopePackId !== null) {
    return orm(dir).select({ id: agents.id }).from(agents)
      .where(eq(agents.rootAgentId, row.scopePackId)).all().map((entry) => entry.id);
  }
  if (row.scopeSpaceId === null) return [];
  return orm(dir).selectDistinct({ id: agents.id }).from(agents)
    .innerJoin(packIntakes, eq(packIntakes.packId, agents.rootAgentId))
    .where(and(eq(packIntakes.spaceId, row.scopeSpaceId), isNull(packIntakes.until)))
    .all().map((entry) => entry.id);
}

export function allTasks(dir: string): (TaskRow & { state: TaskState })[] {
  // B6: `orch doctor` runs this and must never write. A store that does not
  // exist holds no tasks — creating one to discover that is the write the row
  // forbids, and it turns "you have not set up orch" into "you have".
  const db = ormForRead(dir);
  if (!db) return [];
  return db.select({ task: tasks, state: taskStates.state }).from(tasks)
    .innerJoin(taskStates, eq(taskStates.taskId, tasks.id))
    .orderBy(asc(tasks.createdAt), asc(tasks.id))
    .all()
    .map((row) => {
      if (!isTaskState(row.state)) throw new Error("Malformed task row");
      return { ...task(row.task), state: row.state };
    });
}

/** Retention is based on the last settlement clock. Queued and open attempts
 * are never age-reaped. Cancellation has its own settlement clock. */
export function deleteSettledTasksBefore(dir: string, cutoff: number): number {
  const db = orm(dir);
  const settledAt = sql<number>`COALESCE(${taskCancellations.cancelledAt}, (
    SELECT MAX(${taskAttempts.until}) FROM ${taskAttempts} WHERE ${taskAttempts.taskId} = ${tasks.id}
  ))`;
  const ids = db.select({ id: tasks.id }).from(tasks)
    .innerJoin(taskStates, eq(taskStates.taskId, tasks.id))
    .leftJoin(taskCancellations, eq(taskCancellations.taskId, tasks.id))
    .where(and(inArray(taskStates.state, ["done", "failed", "cancelled"]), sql`${settledAt} < ${cutoff}`))
    .all().map((row) => row.id);
  if (ids.length > 0) db.delete(tasks).where(inArray(tasks.id, ids)).run();
  return ids.length;
}

export function attemptsOf(dir: string, taskId: string): AttemptRow[] {
  return orm(dir).select().from(taskAttempts)
    .where(eq(taskAttempts.taskId, taskId)).orderBy(asc(taskAttempts.since)).all().map(attempt);
}

/** Tasks a scope can still take: not cancelled, and queued or failed. */
export function openTasksInScope(dir: string, query: ScopeQuery): TaskRow[] {
  const db = orm(dir);
  const cancelled = db.select({ taskId: taskCancellations.taskId }).from(taskCancellations).all().map((row) => row.taskId);
  const uncancelled = cancelled.length === 0 ? undefined : notInArray(tasks.id, cancelled);
  // Narrowed on the VALUE, not on `"agentId" in query`: every member of
  // ScopeQuery declares the other two as optional `never`, so the key is present
  // on all three and `in` narrows nothing.
  const rows = scopedTasks(dir, db, query, uncancelled);
  return rows.filter((row) => {
    const state = taskState(dir, row.id);
    return state === "queued" || state === "failed";
  }).map(task);
}

/** The tasks one scope addresses, before the state filter. */
function scopedTasks(
  dir: string,
  db: ReturnType<typeof orm>,
  query: ScopeQuery,
  uncancelled: SQL | undefined,
): StoredTask[] {
  const { agentId, packId, spaceId } = query;
  if (agentId !== undefined) {
    // A task scoped to this agent's PACK, or to a space its pack has taken in,
    // is this agent's too. An agent with no row has no pack, so only its own
    // scope can match — the LEFT JOIN this replaces said the same in SQL.
    const pack = db.select({ rootAgentId: agents.rootAgentId }).from(agents).where(eq(agents.id, agentId)).get();
    return db.select().from(tasks).where(and(or(
      eq(tasks.scopeAgentId, agentId),
      ...(pack === undefined ? [] : [
        eq(tasks.scopePackId, pack.rootAgentId),
        inArray(tasks.scopeSpaceId, intakenSpacesOf(dir, pack.rootAgentId)),
      ]),
    ), uncancelled)).all();
  }
  if (packId !== undefined) {
    return db.select().from(tasks).where(and(or(
      eq(tasks.scopePackId, packId),
      inArray(tasks.scopeSpaceId, intakenSpacesOf(dir, packId)),
    ), uncancelled)).all();
  }
  if (spaceId === undefined) throw new Error("task scope names no agent, pack or space");
  return db.select().from(tasks).where(and(eq(tasks.scopeSpaceId, spaceId), uncancelled)).all();
}

/** Spaces whose intake into `packId` is still open. */
function intakenSpacesOf(dir: string, packId: string): string[] {
  return orm(dir).select({ spaceId: packIntakes.spaceId }).from(packIntakes)
    .where(and(eq(packIntakes.packId, packId), isNull(packIntakes.until))).all().map((row) => row.spaceId);
}

export function openIntake(dir: string, packId: string, spaceId: string, since = Date.now()): void {
  orm(dir).insert(packIntakes).values({ packId, spaceId, since }).run();
}

export function closeIntake(dir: string, packId: string, spaceId: string, until = Date.now()): void {
  orm(dir).update(packIntakes).set({ until })
    .where(and(eq(packIntakes.packId, packId), eq(packIntakes.spaceId, spaceId), isNull(packIntakes.until))).run();
}

export function intakesOf(dir: string, packId: string): { packId: string; spaceId: string; since: number; until: number | null }[] {
  return orm(dir).select().from(packIntakes)
    .where(eq(packIntakes.packId, packId)).orderBy(asc(packIntakes.since)).all()
    .map((row) => ({ packId: row.packId, spaceId: row.spaceId, since: row.since, until: row.until }));
}
