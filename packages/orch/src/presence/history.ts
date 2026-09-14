/** Shared presence history and launch helpers.
 *
 * Live status travels over the daemon socket. This module only owns the
 * append-only history files, presence directory layout, and standalone JSON
 * parsing helpers used by harness shims.
 */
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
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

/** Parse one JSON command argument at a shim boundary. */
export function parseJsonArgument(raw: string | undefined): JsonRecord {
  try {
    const parsed: unknown = JSON.parse(raw ?? "{}");
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

function appendPresenceLine(directory: string, name: string, record: PresenceRecord): void {
  appendFileSync(presenceFile(directory, name), `${JSON.stringify(record)}\n`);
}

/** Append the agent's settled-turn result. */
export function writeResult(directory: string, result: PresenceRecord): void {
  appendPresenceLine(directory, RESULTS_FILE, result);
}

/** Append what the agent did with one control command. */
export function appendOutcome(directory: string, outcome: PresenceRecord): void {
  appendPresenceLine(directory, OUTCOMES_FILE, outcome);
}

/** Append one accepted status report to the daemon's history. */
export function appendStatusHistory(directory: string, record: PresenceRecord): void {
  appendPresenceLine(directory, STATUS_LOG_FILE, record);
}

