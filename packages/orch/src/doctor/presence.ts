import type { OrchDir } from "../types/core.ts";
import * as filesystem from "node:fs";
import { basename } from "node:path";
import { loadPresence, malformedPresenceDirs, presenceDir } from "../presence/store.ts";
import { listTasks, type TaskRec } from "../queue.ts";
import { truncate } from "../util.ts";
import { agentView } from "../store/agent-view.ts";
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

export function checkMalformedPresenceRecords(orchDir: OrchDir): CheckResult {
  if (!filesystem.existsSync(presenceDir(orchDir))) {
    return { id: "malformed-presence", label: "Malformed presence records", status: "ok", detail: "no presence records", ignoredRecords: [] };
  }

  // The directory name IS the agent id: anything else — a
  // `<plexer>~<grouping>~<id>` key, a pane handle, a name — is a record no agent
  // answers to, whatever wrote it. `loadPresence` skips those entirely, because
  // they are not presence; doctor is the one caller that must SEE them, so it
  // reads the raw directory names instead of pretending they are entries.
  // An agent with no status row is not malformed: a driving session never reports one.
  const ignoredRecords: IgnoredPresenceRecord[] = malformedPresenceDirs(orchDir)
    .map((malformed) => ({ path: malformed.dir, reason: "malformed identity key" }));

  if (ignoredRecords.length) {
    return {
      id: "malformed-presence",
      label: "Malformed presence records",
      status: "fail",
      detail: `${ignoredRecords.length} malformed presence record${ignoredRecords.length === 1 ? "" : "s"}; orch clean can reap them\n    ${ignoredRecords.map((record) => `${record.path}: ${record.reason}`).join("\n    ")}`,
      ignoredRecords,
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
export function checkUnscopedTasks(orchDir: OrchDir): CheckResult {
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

/** One dead agent as a human reads it: name, project, last report. */
function describeDeadAgent(orchDir: OrchDir, entry: PresenceEntry): string {
  const view = agentView(orchDir, entry.key);
  const name = view === null ? entry.key : view.name;
  const statusProject = entry.status?.project;
  const project = typeof statusProject === "string"
    ? statusProject
    : view === null ? "unknown" : basename(view.cwd);
  const updatedAt = entry.status?.updatedAt;
  const seen = updatedAt === undefined || updatedAt === null ? "unknown" : humanAge(Date.now() - updatedAt);
  return `${name} | project ${project} | last seen ${seen}`;
}

/** Dead agents whose rows are still in the store. orchd reaps them on its
 *  liveness tick; a row that stays is held by a task or grant still in flight. */
export async function checkDeadAgents(orchDir: OrchDir): Promise<CheckResult> {
  await Promise.resolve();
  const dead = [...loadPresence(orchDir).values()].filter((entry) => !entry.alive);
  if (!dead.length) return { id: "dead-agents", label: "Dead agent rows", status: "ok", detail: "no dead agents in the store" };
  return {
    id: "dead-agents",
    label: "Dead agent rows",
    status: "warn",
    detail: `${dead.length} dead agent${dead.length === 1 ? "" : "s"} still in the store; orchd reaps each one once no queued task or open grant holds it:\n    ${dead.map((entry) => describeDeadAgent(orchDir, entry)).join("\n    ")}`,
  };
}
