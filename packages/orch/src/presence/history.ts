/** Shared presence history and launch helpers.
 *
 * Live status travels over the daemon socket. This module only owns the
 * append-only history files, presence directory layout, and standalone JSON
 * parsing helpers used by harness shims.
 */
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { setImmediate } from "node:timers";
import { OUTCOMES_FILE, RESULTS_FILE, STATUS_LOG_FILE } from "./schema.ts";
import { isRecord } from "../util.ts";
import type { LaunchEnvFacts, PresenceRecord } from "../types/presence.ts";
import type { OrchDir, JsonRecord } from "../types/core.ts";

/** The root holding every agent's presence directory. */
export function presenceRoot(root: OrchDir): string {
  return join(root, "agents");
}

/** The presence directory for one agent. The presence key IS the directory name. */
export function presenceAgentDir(key: string, root: OrchDir): string {
  return join(presenceRoot(root), key);
}

/** Create (recursively) and return an agent's presence directory. */
export function ensurePresenceAgentDir(key: string, root: OrchDir): string | undefined {
  const directory = presenceAgentDir(key, root);
  try {
    mkdirSync(directory, { recursive: true });
  } catch {
    return undefined;
  }
  return directory;
}

function presenceFile(directory: string, name: string): string {
  return join(directory, name);
}

/** Harness shims read their JSON payload from stdin. */
export function readJsonStdin(): JsonRecord {
  try {
    const parsed: unknown = JSON.parse(readFileSync(0, "utf8"));
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function launchEnvFacts(): LaunchEnvFacts {
  const value = (name: string): string | null => {
    const raw = process.env[name];
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  };
  return {
    label: value("ORCH_AGENT_NAME"),
    spawnedBy: value("ORCH_SPAWNER"),
    spawnedByLabel: value("ORCH_SPAWNER_LABEL"),
    worktree: value("ORCH_AGENT_WORKTREE"),
    branch: value("ORCH_AGENT_BRANCH"),
    tabLabel: null,
  };
}

/** Lines waiting for the next flush, per history file. History is append-only and
 *  nothing reads it back, so a report never waits on the disk: the line lands on the
 *  same `setImmediate` turn as the store's queued rows, after the reply went out. */
const pendingLines = new Map<string, string[]>();
let flushScheduled = false;

let historyFailureReporter: (error: unknown) => void = (error) => {
  console.error("orch: a history append failed", error);
};

export function reportHistoryFailures(report: (error: unknown) => void): void {
  historyFailureReporter = report;
}

function queuePresenceLine(key: string, root: OrchDir, name: string, record: PresenceRecord): void {
  const file = presenceFile(presenceAgentDir(key, root), name);
  const lines = pendingLines.get(file) ?? [];
  lines.push(`${JSON.stringify(record)}\n`);
  pendingLines.set(file, lines);
  if (flushScheduled) return;
  flushScheduled = true;
  setImmediate(flushPresenceHistory);
}

/** Land every queued history line: one mkdir per agent dir, one append per file. */
export function flushPresenceHistory(): void {
  flushScheduled = false;
  const files = [...pendingLines];
  pendingLines.clear();
  for (const [file, lines] of files) {
    try {
      mkdirSync(dirname(file), { recursive: true });
      appendFileSync(file, lines.join(""));
    } catch (error) {
      historyFailureReporter(error);
    }
  }
}

/** Append the agent's settled-turn result. */
export function writeResult(key: string, root: OrchDir, result: PresenceRecord): void {
  queuePresenceLine(key, root, RESULTS_FILE, result);
}

/** Append what the agent did with one control command. */
export function appendOutcome(key: string, root: OrchDir, outcome: PresenceRecord): void {
  queuePresenceLine(key, root, OUTCOMES_FILE, outcome);
}

/** Append one accepted status report to the daemon's history. */
export function appendStatusHistory(key: string, root: OrchDir, record: PresenceRecord): void {
  queuePresenceLine(key, root, STATUS_LOG_FILE, record);
}

