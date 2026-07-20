import * as filesystem from "node:fs";
import * as path from "node:path";
import { tryParseIdentity } from "../backends/identity.ts";
import { presenceDir, presenceKeyFromDirectoryName } from "../presence/store.ts";
import { PRESENCE_SCHEMA, STATUS_FILE } from "../presence/schema.ts";
import type { CheckResult, IgnoredPresenceRecord } from "../check-result.ts";
import { selectQueueTasks } from "../store/sqlite.ts";
import type { TaskRec } from "../queue.ts";
import { hasErrorCode, readAgentEntries, readJson } from "./shared.ts";
import { isRecord, pidAlive, truncate } from "../util.ts";

function humanAge(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "unknown";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

/** Recover the logical pane key from a presence dir name (Windows escapes ':' and '%'). */
function keyFromDirName(name: string): string {
  return presenceKeyFromDirectoryName(name);
}

/** One human-legible line identifying a presence dir — so nobody deletes a live session blind. */
function describePresenceDir(agentsDir: string, name: string): string {
  const key = keyFromDirName(name);
  const status = readJson(path.join(agentsDir, name, STATUS_FILE));
  const value = isRecord(status) ? status : {};
  const label = typeof value.label === "string" && value.label.trim() ? value.label.trim() : null;
  const cwd = typeof value.cwd === "string" ? value.cwd : null;
  const project = cwd ? path.basename(cwd) : null;
  const agent = typeof value.agent === "string" ? value.agent : null;
  const workspace = key.includes(":") ? key.slice(0, key.indexOf(":")) : null;
  const stamp = typeof value.updatedAt === "string" ? value.updatedAt
    : typeof value.finishedAt === "string" ? value.finishedAt : null;
  const seen = stamp ? `last seen ${humanAge(Date.now() - Date.parse(stamp))}` : null;
  const head = label ? `${label} (${key})` : key;
  return [head, project ? `project ${project}` : null, workspace ? `ws ${workspace}` : null, agent, seen]
    .filter(Boolean)
    .join(" · ");
}

export function checkMalformedPresenceRecords(orchDir?: string): CheckResult {
  const agentsDir = orchDir === undefined ? presenceDir() : path.join(orchDir, "agents");
  let entries: filesystem.Dirent[];
  try {
    entries = filesystem.readdirSync(agentsDir, { withFileTypes: true });
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) {
      return { id: "malformed-presence", label: "Malformed presence records", status: "ok", detail: "no presence records", ignoredRecords: [] };
    }
    throw error;
  }

  const ignoredRecords: IgnoredPresenceRecord[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const recordPath = path.join(agentsDir, entry.name);
    const key = presenceKeyFromDirectoryName(entry.name);
    const reasons: string[] = [];
    if (!tryParseIdentity(key)) reasons.push("malformed identity key");
    let status: unknown = null;
    try { status = readJson(path.join(recordPath, STATUS_FILE)); } catch {}
    if (!isRecord(status) || status.schema !== PRESENCE_SCHEMA)
      reasons.push(`missing or invalid schema (expected ${PRESENCE_SCHEMA})`);
    if (reasons.length) ignoredRecords.push({ path: recordPath, reason: reasons.join("; ") });
  }

  return ignoredRecords.length
    ? {
        id: "malformed-presence",
        label: "Malformed presence records",
        status: "fail",
        detail: `${ignoredRecords.length} malformed presence record${ignoredRecords.length === 1 ? "" : "s"}; orch clean can reap them\n    ${ignoredRecords.map((record) => `${record.path}: ${record.reason}`).join("\n    ")}`,
        ignoredRecords,
      }
    : { id: "malformed-presence", label: "Malformed presence records", status: "ok", detail: "no malformed presence records", ignoredRecords };
}

/** One human-legible line for an unscoped queue row — id, state, age, task snippet. */
function describeUnscopedTask(task: TaskRec): string {
  const age = Date.parse(task.createdAt);
  const seen = Number.isFinite(age) ? humanAge(Date.now() - age) : "unknown";
  return `${task.id} · ${task.state} · queued ${seen} · ${truncate(task.text, 60)}`;
}

/**
 * Report queue rows with no origin workspace. Such a row is malformed by the
 * current schema (Rule 8): `nextQueuedTask` never claims it, so it is stuck
 * forever. Report-only — a reappable record surfaced for `orch clean`, never a
 * pre-selected destructive fix.
 */
export function checkUnscopedTasks(orchDir: string): CheckResult {
  let tasks: TaskRec[];
  try {
    tasks = selectQueueTasks(orchDir);
  } catch {
    return { id: "unscoped-tasks", label: "Unscoped queue tasks", status: "ok", detail: "no queue" };
  }
  const unscoped = tasks.filter(
    (task) => task.workspace === undefined && (task.state === "queued" || task.state === "claimed"),
  );
  if (!unscoped.length) {
    return { id: "unscoped-tasks", label: "Unscoped queue tasks", status: "ok", detail: "no unscoped tasks" };
  }
  return {
    id: "unscoped-tasks",
    label: "Unscoped queue tasks",
    status: "warn",
    detail: `${unscoped.length} unscoped queue task${unscoped.length === 1 ? "" : "s"} (no origin workspace — never claimable; orch clean can reap them):\n    ${unscoped.map(describeUnscopedTask).join("\n    ")}`,
  };
}

export async function checkStalePresence(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const agentsDir = path.join(orchDir, "agents");
  const entries = readAgentEntries(orchDir);
  if (!entries) return { id: "stale-presence", label: "Stale presence dirs", status: "ok", detail: "no agent dirs" };
  const stale: { name: string; description: string }[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const status = readJson(path.join(agentsDir, entry.name, STATUS_FILE)) as { pid?: unknown };
      if (!pidAlive(status?.pid)) stale.push({ name: entry.name, description: describePresenceDir(agentsDir, entry.name) });
    } catch {}
  }
  if (!stale.length) return { id: "stale-presence", label: "Stale presence dirs", status: "ok", detail: "no dead agent dirs" };
  return {
    id: "stale-presence",
    label: "Stale presence dirs",
    status: "warn",
    detail: `${stale.length} dead agent dir${stale.length === 1 ? "" : "s"} (verify before removing):\n    ${stale.map((item) => item.description).join("\n    ")}`,
    fix: {
      description: `Delete ${stale.length} dead presence dir${stale.length === 1 ? "" : "s"}: ${stale.map((item) => item.description).join("; ")}`,
      destructive: true,
      apply() {
        for (const { name } of stale) {
          filesystem.rmSync(path.join(agentsDir, name), { recursive: true, force: true });
        }
      },
    },
  };
}
