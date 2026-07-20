import { readdirSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { PRESENCE_SCHEMA, RESULT_FILE, STATUS_FILE } from "./schema.ts";
// The presence protocol is orch's, and src/presence/ owns it (Rule 10). The
// directory layout is defined there and imported here — a second copy in the
// store is how a writer and a reader end up disagreeing about where a record
// lives. The dependency runs only this way: presence/ stays standalone so the
// harness shims can bundle it without dragging in the sqlite graph.
import { orchDir, presenceAgentDir, presenceRoot } from "./writer.ts";
import { deleteSpawnedRecord, insertSpawnedRecord, selectSpawnedRecords, setOwner, type SpawnedRecord } from "../store/sqlite.ts";
import { isRecord, pidAlive, readJsonFile } from "../util.ts";

const HOME = homedir();
const SETTINGS_PATH = join(HOME, ".pi", "agent", "settings.json");

export { orchDir, presenceAgentDir };

export function presenceDir(): string {
  return presenceRoot();
}

/** Serialized identity keys are already a single filesystem-safe segment
 *  (`<backend>~<workspace>~<handle>`, with `~ % : /` percent-escaped inside
 *  each part), so the presence directory name IS the key — no remapping. */
export function presenceKeyFromDirectoryName(name: string): string {
  return name;
}

export function removePresenceAgentDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

export interface PresenceStatus {
  /** Must equal PRESENCE_SCHEMA (src/presence/schema.ts); anything else is malformed. */
  schema: number;
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
  const parsed = readJsonFile(file);
  return parsed === undefined ? null : parsed as T;
}

/** The one gate every presence status read passes through. A status.json is a
 *  live record only when it stamps the current PRESENCE_SCHEMA; anything else
 *  is malformed and reads as absent, exactly as src/doctor/presence.ts reports
 *  it. Malformed dirs stay on disk and keep enumerating so `orch doctor` can
 *  name them and `orch clean` can reap them — they just never surface as a
 *  live status, so one bad dir can never break the whole status view. */
function isPresenceStatus(value: unknown): value is PresenceStatus {
  return isRecord(value) && value.schema === PRESENCE_SCHEMA;
}

export function readPresenceStatus(file: string): PresenceStatus | null {
  // A predicate, not a cast: the schema check IS the narrowing, so the runtime
  // guard and the asserted type cannot drift apart.
  const status = readJSON<unknown>(file);
  return isPresenceStatus(status) ? status : null;
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
    if (metadata.owner !== undefined) record.owner = metadata.owner;
    insertSpawnedRecord(orchDir(), record);
    if (metadata.owner) setOwner(orchDir(), pane, metadata.owner);
  } catch {}
}

export function spawnedRecords(): Map<string, SpawnedRecord> {
  const records = new Map<string, SpawnedRecord>();
  try {
    for (const record of selectSpawnedRecords(orchDir())) records.set(record.pane, record);
  } catch {}
  return records;
}

export function reapSpawnedRecord(key: string): void {
  try { deleteSpawnedRecord(orchDir(), key); } catch {}
  removePresenceAgentDir(presenceAgentDir(key));
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
    const status = readPresenceStatus(join(dir, STATUS_FILE));
    const result = readJSON(join(dir, RESULT_FILE));
    presence.set(key, { key, dir, status, result, alive: pidAlive(status?.pid) });
  }
  return presence;
}

export function statusForPresence(presence: PresenceEntry): PresenceStatus | null {
  return readPresenceStatus(join(presence.dir, STATUS_FILE));
}

export function bridgeRegistered(pane: string): boolean {
  return readPresenceStatus(presencePath(pane, STATUS_FILE)) !== null;
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
