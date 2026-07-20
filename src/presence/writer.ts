/**
 * The ONE presence writer. The presence protocol is orch's, not any harness's
 * (CLAUDE.md Rule 10): every harness artifact — extensions/pi, extensions/claude,
 * extensions/codex — imports these primitives and none reimplements them. Three
 * copies of `atomicWrite` is exactly the bug this module exists to prevent.
 *
 * The claude and codex shims are bundled standalone and run under WHATEVER
 * runtime the user has on PATH (node, deno, OR bun), so this file is node
 * built-ins only per Rule 6 — no `Bun.*`, no `bun:*`, and no transitive pull on
 * config loading, adapters, or the store's sqlite graph.
 *
 * That constraint is about which APIs run, not about refusing to import orch
 * core: `src/util.ts` is node built-ins only and bundles cleanly, so the shared
 * JSON guards come from there rather than being re-declared per shim.
 */
import { homedir } from "node:os";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PRESENCE_SCHEMA, RESULT_FILE, STATUS_FILE } from "./schema.ts";
import { isRecord, type JsonRecord } from "../util.ts";

/** A presence protocol record. Domain name for the shared JSON record shape. */
export type PresenceRecord = JsonRecord;

/** $ORCH_DIR, defaulting to ~/.orch. Read per call so tests can repoint the env. */
export function orchDir(): string {
  return process.env.ORCH_DIR ?? join(homedir(), ".orch");
}

/** The root holding every agent's presence directory. */
export function presenceRoot(root = orchDir()): string {
  return join(root, "agents");
}

/** The presence directory for one agent. The presence key IS the directory name
 * — keys are already filesystem-safe (percent-escaped), so there is no remapping. */
export function presenceAgentDir(key: string, root = orchDir()): string {
  return join(presenceRoot(root), key);
}

/** Create (recursively) and return the agent's presence directory, or undefined
 * when it cannot be created. Callers exit silently on undefined: an unwritable
 * presence dir means there is no orch to report to, which is not an error. */
export function ensurePresenceAgentDir(key: string, root = orchDir()): string | undefined {
  const directory = presenceAgentDir(key, root);
  try {
    mkdirSync(directory, { recursive: true });
  } catch {
    return undefined;
  }
  return directory;
}

/** Path to one protocol file inside a presence directory. */
export function presenceFile(directory: string, name: string): string {
  return join(directory, name);
}

function temporaryName(file: string): string {
  return `${file}.tmp-${process.pid}`;
}

/**
 * True when `filename` is `target` or the temp file `atomicWrite` renames onto it.
 *
 * Directory watchers must accept both: a write lands as create+rename, and which
 * of the two names the platform surfaces to the watcher is not guaranteed. A
 * watcher that matched only `target` would miss the write entirely and fall back
 * to its safety poll. The temp-name convention lives here, next to the writer
 * that mints it, so the two can never drift.
 */
export function namesPresenceFile(filename: string, target: string): boolean {
  return filename === target || filename.startsWith(`${target}.tmp-`);
}

/**
 * Write JSON so a concurrent reader never observes a partial file: serialize to
 * a pid-scoped temp beside the target, then rename (atomic within a directory).
 * Falls back to a direct write when rename is unavailable (some mounts), since a
 * torn record still beats no record. Never throws — presence is best-effort and
 * must not take down the harness it is observing.
 */
export function atomicWrite(file: string, value: unknown): void {
  const serialized = JSON.stringify(value, null, 2);
  const temporary = temporaryName(file);
  try {
    writeFileSync(temporary, serialized);
    renameSync(temporary, file);
  } catch {
    try { writeFileSync(file, serialized); } catch { /* best-effort */ }
  }
}

/** Read the current status record, or {} when absent, unparseable, or not
 *  stamped with PRESENCE_SCHEMA. A record carrying any other stamp is malformed:
 *  it never seeds a merge and never reads as a live peer. */
export function readStatus(directory: string): PresenceRecord {
  try {
    const parsed: unknown = JSON.parse(readFileSync(presenceFile(directory, STATUS_FILE), "utf8"));
    if (!isRecord(parsed) || parsed.schema !== PRESENCE_SCHEMA) return {};
    return parsed;
  } catch {
    return {};
  }
}

/** Write the agent's status record. */
export function writeStatus(directory: string, status: PresenceRecord): void {
  atomicWrite(presenceFile(directory, STATUS_FILE), status);
}

/** Write the agent's settled-turn result record. */
export function writeResult(directory: string, result: PresenceRecord): void {
  atomicWrite(presenceFile(directory, RESULT_FILE), result);
}
