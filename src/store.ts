import { readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { insertSpawnedRecord, selectSpawnedRecords, setOwner } from "./store/sqlite.ts";

const HOME = homedir();
const SETTINGS_PATH = join(HOME, ".pi", "agent", "settings.json");

// Resolve ORCH_DIR per call: tests (and callers) mutate process.env.ORCH_DIR
// after this module loads, so freezing it into a const reads the wrong dir.
export function orchDir(): string {
  return process.env.ORCH_DIR ?? join(HOME, ".orch");
}

export function presenceDir(): string {
  return join(orchDir(), "agents");
}

/** Serialized identity keys are already a single filesystem-safe segment
 *  (`<backend>~<workspace>~<handle>`, with `~ % : /` percent-escaped inside
 *  each part), so the presence directory name IS the key — no remapping. */
function presenceDirectoryName(key: string): string {
  return key;
}

export function presenceKeyFromDirectoryName(name: string): string {
  return name;
}

export function presenceAgentDir(key: string, root = orchDir()): string {
  return join(root, "agents", presenceDirectoryName(key));
}

export function removePresenceAgentDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

export interface PresenceStatus {
  /** Must equal PRESENCE_SCHEMA (src/presence-schema.ts); anything else is malformed. */
  schema?: number;
  agent?: string;
  key?: string;
  /** Backend that minted this agent's identity (herdr/tmux/headless). */
  backend?: string;
  /** Backend-reported workspace for wall checks and display. */
  workspace?: string;
  /** Backend-native handle (herdr/tmux pane id, headless pid). */
  handle?: string;
  paneId?: string | null;
  pid?: number;
  cwd?: string;
  state?: string;
  lastError?: string;
  model?: { provider?: string; id?: string };
  thinking?: string;
  task?: string;
  lastText?: string;
  currentFile?: string;
  tokens?: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number };
  cost?: number;
  context?: { tokens?: number; percent?: number };
  turns?: number;
  sessionPath?: string;
  sessionId?: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt?: string;
  extensionHash?: string;
  label?: string | null;
  tabLabel?: string | null;
  asking?: { question: string; id: string; ts: string };
  blockedMessage?: string;
}

export interface PresenceEntry {
  key: string;
  dir: string;
  status: PresenceStatus | null;
  result: unknown;
  alive: boolean;
}

function presencePath(key: string, file: string): string {
  return join(presenceAgentDir(key), file);
}

export function readJSON<T = unknown>(file: string): T | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
    return parsed as T;
  } catch {
    return null;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function pidAlive(pid: number | undefined): boolean {
  if (!pid || !Number.isFinite(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "EPERM";
  }
}

export function recordSpawned(
  pane: string,
  metadata: { adapter?: string; model?: string; backend?: string; workspace?: string; handle?: string; cwd?: string; worktree?: string; branch?: string; owner?: string } = {},
): void {
  try {
    const record: SpawnedRecord = { pane, ts: new Date().toISOString() };
    if (metadata.adapter !== undefined) record.adapter = metadata.adapter;
    if (metadata.model !== undefined) record.model = metadata.model;
    if (metadata.backend !== undefined) record.backend = metadata.backend;
    if (metadata.workspace !== undefined) record.workspace = metadata.workspace;
    if (metadata.handle !== undefined) record.handle = metadata.handle;
    if (metadata.cwd !== undefined) record.cwd = metadata.cwd;
    if (metadata.worktree !== undefined) record.worktree = metadata.worktree;
    if (metadata.branch !== undefined) record.branch = metadata.branch;
    insertSpawnedRecord(orchDir(), record);
    if (metadata.owner) setOwner(orchDir(), pane, metadata.owner);
  } catch {}
}

export interface SpawnedRecord {
  /** Primary registry id: the agent's serialized identity key. */
  pane: string;
  ts?: string;
  adapter?: string;
  model?: string;
  backend?: string;
  /** Identity workspace assigned by the spawning backend. */
  workspace?: string;
  /** Backend-native control handle (herdr/tmux pane id) for close/focus/send-keys. */
  handle?: string;
  /** Working directory the agent launched in. */
  cwd?: string;
  worktree?: string;
  branch?: string;
}

export function spawnedRecords(): Map<string, SpawnedRecord> {
  const records = new Map<string, SpawnedRecord>();
  try {
    for (const record of selectSpawnedRecords(orchDir())) records.set(record.pane, record);
  } catch {}
  return records;
}

export function loadPresence(): Map<string, PresenceEntry> {
  const presence = new Map<string, PresenceEntry>();
  let keys: string[];
  try {
    keys = readdirSync(presenceDir());
  } catch {
    return presence;
  }
  for (const storedKey of keys) {
    const key = presenceKeyFromDirectoryName(storedKey);
    const dir = presenceAgentDir(key);
    try {
      if (!statSync(dir).isDirectory()) continue;
    } catch {
      continue;
    }
    const status = readJSON<PresenceStatus>(join(dir, "status.json"));
    const result = readJSON(join(dir, "result.json"));
    presence.set(key, { key, dir, status, result, alive: pidAlive(status?.pid) });
  }
  return presence;
}

export function statusForPresence(presence: PresenceEntry): PresenceStatus | null {
  return readJSON<PresenceStatus>(join(presence.dir, "status.json"));
}

export function bridgeRegistered(pane: string): boolean {
  return readJSON(presencePath(pane, "status.json")) !== null;
}

let cachedSettings: Record<string, unknown> | undefined;
function settings(): Record<string, unknown> {
  if (cachedSettings === undefined) {
    const value = readJSON(SETTINGS_PATH);
    cachedSettings = isRecord(value) ? value : {};
  }
  return cachedSettings;
}

export function defaultModelString(): string {
  const source = settings();
  const provider = typeof source.defaultProvider === "string" ? source.defaultProvider : "openai-codex";
  const model = typeof source.defaultModel === "string" ? source.defaultModel : "unknown";
  const thinking = typeof source.defaultThinkingLevel === "string" ? source.defaultThinkingLevel : "medium";
  return `${provider}/${model}:${thinking}`;
}
