import { appendFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HOME = homedir();
const ORCH_DIR = process.env.ORCH_DIR || join(HOME, ".orch");
const PRESENCE_DIR = join(ORCH_DIR, "agents");
const SPAWNED_PATH = join(ORCH_DIR, "spawned.jsonl");
const SETTINGS_PATH = join(HOME, ".pi", "agent", "settings.json");

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
  result: any | null;
  alive: boolean;
}

export function orchDir(): string {
  return ORCH_DIR;
}

export function presenceDir(): string {
  return PRESENCE_DIR;
}

function presencePath(key: string, file: string): string {
  return join(PRESENCE_DIR, key, file);
}

export function readJSON<T = any>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
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
  } catch (error: any) {
    return error && error.code === "EPERM";
  }
}

export function recordSpawned(
  pane: string,
  metadata: { adapter?: string; model?: string; backend?: string; worktree?: string; branch?: string } = {},
): void {
  try {
    mkdirSync(ORCH_DIR, { recursive: true });
    const record: { pane: string; ts: string; adapter?: string; model?: string; backend?: string; worktree?: string; branch?: string } = {
      pane,
      ts: new Date().toISOString(),
    };
    if (metadata.adapter !== undefined) record.adapter = metadata.adapter;
    if (metadata.model !== undefined) record.model = metadata.model;
    if (metadata.backend !== undefined) record.backend = metadata.backend;
    if (metadata.worktree !== undefined) record.worktree = metadata.worktree;
    if (metadata.branch !== undefined) record.branch = metadata.branch;
    appendFileSync(SPAWNED_PATH, JSON.stringify(record) + "\n");
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
    for (const line of readFileSync(SPAWNED_PATH, "utf8").split("\n")) {
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
    keys = readdirSync(PRESENCE_DIR);
  } catch {
    return presence;
  }
  for (const key of keys) {
    const dir = join(PRESENCE_DIR, key);
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
  if (status?.model?.id) {
    return `${status.model.provider || ""}/${status.model.id}${status.thinking ? `:${status.thinking}` : ""}`;
  }
  return null;
}

export function appendPresenceInbox(presence: PresenceEntry, entry: any): void {
  appendFileSync(join(presence.dir, "inbox.jsonl"), JSON.stringify(entry) + "\n");
}

export function steerPresence(presence: PresenceEntry, text: string): void {
  mkdirSync(presence.dir, { recursive: true });
  appendFileSync(join(presence.dir, "inbox.jsonl"), JSON.stringify({ text, ts: new Date().toISOString() }) + "\n");
}

export function writeAnswer(presence: PresenceEntry, text: string): void {
  writeFileSync(join(presence.dir, "answer.json"), JSON.stringify({ text, ts: new Date().toISOString() }) + "\n");
}

let cachedSettings: any | undefined;
function settings(): any {
  if (cachedSettings === undefined) cachedSettings = readJSON(SETTINGS_PATH) || {};
  return cachedSettings;
}

export function defaultModelString(): string {
  const source = settings();
  return `${source.defaultProvider || "openai-codex"}/${source.defaultModel || "unknown"}:${source.defaultThinkingLevel || "medium"}`;
}
