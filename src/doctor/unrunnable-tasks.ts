import { existsSync } from "node:fs";
import { join } from "node:path";
import { openStore } from "../store/connection.ts";
import { listTasks, type TaskRec } from "../queue.ts";
import { isRecord, truncate } from "../util.ts";
import type { CheckResult } from "../check-result.ts";

interface MissingScope {
  readonly taskId: string;
  readonly kind: "agent" | "pack" | "space";
  readonly scopeId: string;
}

interface MissingScopeRow {
  readonly task_id: string;
  readonly kind: MissingScope["kind"];
  readonly scope_id: string;
}

function isMissingScopeRow(value: unknown): value is MissingScopeRow {
  if (!isRecord(value)) return false;
  return typeof value.task_id === "string"
    && (value.kind === "agent" || value.kind === "pack" || value.kind === "space")
    && typeof value.scope_id === "string";
}

function missingScopes(orchDir: string): MissingScope[] {
  const rows = openStore(orchDir).query(`
    SELECT t.id AS task_id, 'agent' AS kind, t.scope_agent_id AS scope_id
    FROM tasks t LEFT JOIN agents a ON a.id=t.scope_agent_id
    WHERE t.scope_agent_id IS NOT NULL AND a.id IS NULL
    UNION ALL
    SELECT t.id AS task_id, 'pack' AS kind, t.scope_pack_id AS scope_id
    FROM tasks t LEFT JOIN agents a ON a.id=t.scope_pack_id
    WHERE t.scope_pack_id IS NOT NULL AND a.id IS NULL
    UNION ALL
    SELECT t.id AS task_id, 'space' AS kind, t.scope_space_id AS scope_id
    FROM tasks t LEFT JOIN spaces s ON s.id=t.scope_space_id
    WHERE t.scope_space_id IS NOT NULL AND s.id IS NULL
    ORDER BY task_id
  `).all();
  return rows.filter(isMissingScopeRow).map((row) => ({
      taskId: row.task_id,
      kind: row.kind,
      scopeId: row.scope_id,
    }));
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
