import { appendFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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

/** Map logical pane keys to filesystem-safe directory names on Windows. */
export function presenceDirectoryName(key: string): string {
  if (process.platform !== "win32") return key;
  return key.replaceAll("%", "%25").replaceAll(":", "%3A");
}

export function presenceKeyFromDirectoryName(name: string): string {
  if (process.platform !== "win32") return name;
  return name.replace(/%25|%3A/g, (token) => token === "%25" ? "%" : ":");
}

export function presenceAgentDir(key: string, root = orchDir()): string {
  return join(root, "agents", presenceDirectoryName(key));
}

function spawnedPath(): string {
  return join(orchDir(), "spawned.jsonl");
}

export interface PresenceStatus {
  /** Schema 2 identifies the adapter; schema 1 records may omit both fields. */
  schema?: number;
  agent?: string;
  key?: string;
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
  result: unknown | null;
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
  metadata: { adapter?: string; model?: string; backend?: string; worktree?: string; branch?: string } = {},
): void {
  try {
    mkdirSync(orchDir(), { recursive: true });
    const record: { pane: string; ts: string; adapter?: string; model?: string; backend?: string; worktree?: string; branch?: string } = {
      pane,
      ts: new Date().toISOString(),
    };
    if (metadata.adapter !== undefined) record.adapter = metadata.adapter;
    if (metadata.model !== undefined) record.model = metadata.model;
    if (metadata.backend !== undefined) record.backend = metadata.backend;
    if (metadata.worktree !== undefined) record.worktree = metadata.worktree;
    if (metadata.branch !== undefined) record.branch = metadata.branch;
    appendFileSync(spawnedPath(), JSON.stringify(record) + "\n");
  } catch {}
}

export interface SpawnedRecord {
  pane: string;
  ts?: string;
  adapter?: string;
  model?: string;
  backend?: string;
  worktree?: string;
  branch?: string;
}

export function spawnedRecords(): Map<string, SpawnedRecord> {
  const records = new Map<string, SpawnedRecord>();
  try {
    for (const line of readFileSync(spawnedPath(), "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const entry: unknown = JSON.parse(line);
        if (typeof entry !== "object" || entry === null || !("pane" in entry) || typeof entry.pane !== "string") continue;
        const record: SpawnedRecord = { pane: entry.pane };
        if ("ts" in entry && typeof entry.ts === "string") record.ts = entry.ts;
        if ("adapter" in entry && typeof entry.adapter === "string") record.adapter = entry.adapter;
        if ("model" in entry && typeof entry.model === "string") record.model = entry.model;
        if ("backend" in entry && typeof entry.backend === "string") record.backend = entry.backend;
        if ("worktree" in entry && typeof entry.worktree === "string") record.worktree = entry.worktree;
        if ("branch" in entry && typeof entry.branch === "string") record.branch = entry.branch;
        records.set(record.pane, record);
      } catch {}
    }
  } catch {}
  return records;
}

export function spawnedPanes(): Set<string> {
  return new Set(spawnedRecords().keys());
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

export function readPaneModel(pane: string): string | null {
  const status = readJSON(presencePath(pane, "status.json"));
  if (!isRecord(status) || !isRecord(status.model) || typeof status.model.id !== "string" || !status.model.id) return null;
  const provider = typeof status.model.provider === "string" ? status.model.provider : "";
  const thinking = typeof status.thinking === "string" && status.thinking ? `:${status.thinking}` : "";
  return `${provider}/${status.model.id}${thinking}`;
}

export function appendPresenceInbox(presence: PresenceEntry, entry: unknown): void {
  appendFileSync(join(presence.dir, "inbox.jsonl"), JSON.stringify(entry) + "\n");
}

export function steerPresence(presence: PresenceEntry, text: string): void {
  mkdirSync(presence.dir, { recursive: true });
  appendFileSync(join(presence.dir, "inbox.jsonl"), JSON.stringify({ text, ts: new Date().toISOString() }) + "\n");
}

export function writeAnswer(presence: PresenceEntry, text: string): void {
  writeFileSync(join(presence.dir, "answer.json"), JSON.stringify({ text, ts: new Date().toISOString() }) + "\n");
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
