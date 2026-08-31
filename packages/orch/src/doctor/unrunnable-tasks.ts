import { existsSync } from "node:fs";
import { join } from "node:path";
import { asc } from "drizzle-orm";
import { orm } from "../store/connection.ts";
import { agents, spaces, tasks } from "../db/schema.ts";
import { listTasks, type TaskRec } from "../queue.ts";
import { truncate } from "../util.ts";
import type { CheckResult } from "../types/doctor.ts";

interface MissingScope {
  readonly taskId: string;
  readonly kind: "agent" | "pack" | "space";
  readonly scopeId: string;
}

/** A task whose scope names something the store no longer holds. One pass per
 *  axis, because the three scopes are three different references — a UNION of
 *  three selects said the same thing with three chances to mistype a column. */
function missingScopes(orchDir: string): MissingScope[] {
  const db = orm(orchDir);
  const agentIds = new Set(db.select({ id: agents.id }).from(agents).all().map((row) => row.id));
  const spaceIds = new Set(db.select({ id: spaces.id }).from(spaces).all().map((row) => row.id));
  const rows = db.select({
    taskId: tasks.id, agentId: tasks.scopeAgentId, packId: tasks.scopePackId, spaceId: tasks.scopeSpaceId,
  }).from(tasks).orderBy(asc(tasks.id)).all();
  return rows.flatMap((row): MissingScope[] => {
    if (row.agentId !== null && !agentIds.has(row.agentId)) return [{ taskId: row.taskId, kind: "agent", scopeId: row.agentId }];
    if (row.packId !== null && !agentIds.has(row.packId)) return [{ taskId: row.taskId, kind: "pack", scopeId: row.packId }];
    if (row.spaceId !== null && !spaceIds.has(row.spaceId)) return [{ taskId: row.taskId, kind: "space", scopeId: row.spaceId }];
    return [];
  });
}

function age(task: TaskRec): string {
  const created = Date.parse(task.createdAt);
  if (!Number.isFinite(created)) return "unknown age";
  const days = Math.max(0, Math.floor((Date.now() - created) / 86_400_000));
  return `${days}d`;
}

function taskLine(task: TaskRec): string {
  return `${task.id} | ${task.state} | ${truncate(task.text, 60)}`;
}

/** Surface unrunnable and stale work without attaching any automatic fix. */
export function checkUnrunnableTasks(orchDir: string): CheckResult {
  if (!existsSync(join(orchDir, "orch.db"))) {
    return { id: "unrunnable-tasks", label: "Unrunnable queue tasks", status: "ok", detail: "no queue" };
  }
  let tasks: TaskRec[];
  try {
    tasks = listTasks(orchDir);
  } catch {
    return { id: "unrunnable-tasks", label: "Unrunnable queue tasks", status: "ok", detail: "no queue" };
  }
  const missing = missingScopes(orchDir);
  const missingIds = new Set(missing.map((item) => item.taskId));
  const unrunnable = tasks.filter((task) => task.state === "unrunnable" && !missingIds.has(task.id));
  const stale = tasks.filter((task) => task.stale && task.state === "queued" && !missingIds.has(task.id));
  if (!missing.length && !unrunnable.length && !stale.length) {
    return { id: "unrunnable-tasks", label: "Unrunnable queue tasks", status: "ok", detail: "no unrunnable or stale tasks" };
  }
  const lines: string[] = [];
  for (const item of missing) {
    lines.push(
      `task ${item.taskId}: recorded ${item.kind} scope=${item.scopeId}, but the real ${item.kind} row no longer exists; task is unrunnable. Fix: deliberately take it on, leave it, or reap it (never automatic)`,
    );
  }
  for (const task of unrunnable) {
    lines.push(`task ${taskLine(task)}: no live agent remains in its recorded scope. Fix: deliberately take it on, leave it, or reap it (never automatic)`);
  }
  for (const task of stale) {
    lines.push(`task ${taskLine(task)}: queued for ${age(task)} and still claimable (stale, not unrunnable). Fix: dispatch or claim it; never delete it on age`);
  }
  return {
    id: "unrunnable-tasks",
    label: "Unrunnable queue tasks",
    status: "warn",
    detail: lines.join("\n    "),
  };
}
