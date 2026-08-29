import * as filesystem from "node:fs";
import * as path from "node:path";
import { loadPresence, malformedPresenceDirs, presenceDir } from "../presence/store.ts";
import { placementOf } from "../agent/registry.ts";
import { PRESENCE_SCHEMA } from "../presence/schema.ts";
import { listTasks, type TaskRec } from "../queue.ts";
import { truncate } from "../util.ts";
export { checkUnrunnableTasks } from "./unrunnable-tasks.ts";
import type { PresenceEntry } from "../types/presence.ts";
import type { CheckResult, IgnoredPresenceRecord } from "../types/doctor.ts";

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
  const space = orchDir ? placementOf(orchDir, key)?.space ?? null : null;
  const stamp = description.updatedAt ?? description.finishedAt ?? null;
  const seen = stamp ? `last seen ${humanAge(Date.now() - Date.parse(stamp))}` : null;
  const head = label ? `${label} (${key})` : key;
  return [head, project ? `project ${project}` : null, space ? `space ${space}` : null, agent, seen]
    .filter(Boolean)
    .join(" | ");
}

export function checkMalformedPresenceRecords(orchDir?: string): CheckResult {
  const entries = loadPresence(orchDir);
  if (!entries.size && !filesystem.existsSync(presenceDir(orchDir))) {
    return { id: "malformed-presence", label: "Malformed presence records", status: "ok", detail: "no presence records", ignoredRecords: [] };
  }

  const ignoredRecords: IgnoredPresenceRecord[] = [];
  const held: IgnoredPresenceRecord[] = [];
  // The directory name IS the agent id (TASKS/01): anything else — a
  // `<plexer>~<grouping>~<id>` key, a pane handle, a name — is a record no agent
  // answers to, whatever wrote it. `loadPresence` skips those entirely, because
  // they are not presence; doctor is the one caller that must SEE them, so it
  // reads the raw directory names instead of pretending they are entries.
  for (const malformed of malformedPresenceDirs(orchDir)) {
    (malformed.alive ? held : ignoredRecords).push({ path: malformed.dir, reason: "malformed identity key" });
  }
  for (const entry of entries.values()) {
    const reasons: string[] = [];
    if (entry.status === null) reasons.push(`missing or invalid schema (expected ${PRESENCE_SCHEMA})`);
    if (!reasons.length) continue;
    // A record whose process is still running is a live session on older bridge
    // code — it clears itself the moment that session reloads, and `orch clean`
    // reaps by dead pid so nothing can act on it meanwhile. Naming it is useful;
    // raising it is not, so it stays out of the verdict.
    (entry.alive ? held : ignoredRecords).push({ path: entry.dir, reason: reasons.join("; ") });
  }

  if (ignoredRecords.length) {
    return {
      id: "malformed-presence",
      label: "Malformed presence records",
      status: "fail",
      detail: `${ignoredRecords.length} malformed presence record${ignoredRecords.length === 1 ? "" : "s"}; orch clean can reap them\n    ${ignoredRecords.map((record) => `${record.path}: ${record.reason}`).join("\n    ")}`,
      ignoredRecords,
    };
  }
  if (held.length) {
    return {
      id: "malformed-presence",
      label: "Malformed presence records",
      status: "ok",
      detail: `no malformed presence records; ${held.length} live session${held.length === 1 ? "" : "s"} still writing an older record, each clearing when that session reloads\n    ${held.map((record) => `${record.path}: ${record.reason}`).join("\n    ")}`,
      ignoredRecords: held,
    };
  }
  return { id: "malformed-presence", label: "Malformed presence records", status: "ok", detail: "no malformed presence records", ignoredRecords };
}

/** One human-legible line for a malformed-scope task — id, state, age, task snippet. */
function describeUnscopedTask(task: TaskRec): string {
  const age = Date.parse(task.createdAt);
  const seen = Number.isFinite(age) ? humanAge(Date.now() - age) : "unknown";
  return `${task.id} | ${task.state} | queued ${seen} | ${truncate(task.text, 60)}`;
}

/**
 * Report tasks that violate exactly-one typed scope. The current schema rejects
 * these rows; this remains report-only for a store damaged outside orch.
 */
export function checkUnscopedTasks(orchDir: string): CheckResult {
  let tasks: TaskRec[];
  try {
    tasks = listTasks(orchDir);
  } catch {
    return { id: "unscoped-tasks", label: "Unscoped queue tasks", status: "ok", detail: "no queue" };
  }
  const unscoped = tasks.filter((task) =>
    [task.scopeAgentId, task.scopePackId, task.scopeSpaceId].filter((scope) => scope !== null).length !== 1,
  );
  if (!unscoped.length) {
    return { id: "unscoped-tasks", label: "Unscoped queue tasks", status: "ok", detail: "no unscoped tasks" };
  }
  return {
    id: "unscoped-tasks",
    label: "Unscoped queue tasks",
    status: "warn",
    detail: `${unscoped.length} malformed-scope task${unscoped.length === 1 ? "" : "s"} (exactly one scope is required; orch clean can reap them):\n    ${unscoped.map(describeUnscopedTask).join("\n    ")}`,
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
