import * as filesystem from "node:fs";
import * as path from "node:path";
import { tryParseIdentity } from "../backends/identity.ts";
import { loadPresence, presenceDir, type PresenceEntry } from "../presence/store.ts";
import { placementOf } from "../agent/registry.ts";
import { PRESENCE_SCHEMA } from "../presence/schema.ts";
import type { CheckResult, IgnoredPresenceRecord } from "../check-result.ts";
import { selectQueueTasks } from "../store/queue-rows.ts";
import type { TaskRec } from "../queue.ts";
import { truncate } from "../util.ts";

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

/** One human-legible line identifying a presence dir — so nobody deletes a live session blind. */
function describePresenceDir(entry: PresenceEntry, orchDir?: string): string {
  const { key, description = {} } = entry;
  const label = description.label?.trim() ?? "";
  const cwd = description.cwd ?? null;
  const project = cwd ? path.basename(cwd) : null;
  const agent = description.agent ?? null;
  const workspace = orchDir ? placementOf(orchDir, key)?.workspace ?? null : null;
  const stamp = description.updatedAt ?? description.finishedAt ?? null;
  const seen = stamp ? `last seen ${humanAge(Date.now() - Date.parse(stamp))}` : null;
  const head = label ? `${label} (${key})` : key;
  return [head, project ? `project ${project}` : null, workspace ? `ws ${workspace}` : null, agent, seen]
    .filter(Boolean)
    .join(" | ");
}

export function checkMalformedPresenceRecords(orchDir?: string): CheckResult {
  const entries = loadPresence(orchDir);
  if (!entries.size && !filesystem.existsSync(presenceDir(orchDir))) {
    return { id: "malformed-presence", label: "Malformed presence records", status: "ok", detail: "no presence records", ignoredRecords: [] };
  }

  const ignoredRecords: IgnoredPresenceRecord[] = [];
  for (const entry of entries.values()) {
    const reasons: string[] = [];
    if (!tryParseIdentity(entry.key)) reasons.push("malformed identity key");
    if (entry.status === null) reasons.push(`missing or invalid schema (expected ${PRESENCE_SCHEMA})`);
    if (reasons.length) ignoredRecords.push({ path: entry.dir, reason: reasons.join("; ") });
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
  return `${task.id} | ${task.state} | queued ${seen} | ${truncate(task.text, 60)}`;
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
    detail: `${unscoped.length} unscoped queue task${unscoped.length === 1 ? "" : "s"} (no origin workspace - never claimable; orch clean can reap them):\n    ${unscoped.map(describeUnscopedTask).join("\n    ")}`,
  };
}

export async function checkStalePresence(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const entries = loadPresence(orchDir);
  if (!entries.size) return { id: "stale-presence", label: "Stale presence dirs", status: "ok", detail: "no agent dirs" };
  const stale: { entry: PresenceEntry; description: string }[] = [];
  for (const entry of entries.values()) {
    if (!entry.alive) stale.push({ entry, description: describePresenceDir(entry, orchDir) });
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
        for (const { entry } of stale) {
          filesystem.rmSync(entry.dir, { recursive: true, force: true });
        }
      },
    },
  };
}
