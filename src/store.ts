import { appendFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HOME = homedir();
const ORCH_DIR = process.env.ORCH_DIR || join(HOME, ".orch");
const PRESENCE_DIR = join(ORCH_DIR, "agents");
const SPAWNED_PATH = join(ORCH_DIR, "spawned.jsonl");
const SETTINGS_PATH = join(HOME, ".pi", "agent", "settings.json");

export interface PresenceEntry {
  key: string;
  dir: string;
  status: any | null;
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

export function readJSON(file: string): any | null {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
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

export function recordSpawned(pane: string): void {
  try {
    mkdirSync(ORCH_DIR, { recursive: true });
    appendFileSync(SPAWNED_PATH, JSON.stringify({ pane, ts: new Date().toISOString() }) + "\n");
  } catch {}
}

export function spawnedPanes(): Set<string> {
  const panes = new Set<string>();
  try {
    for (const line of readFileSync(SPAWNED_PATH, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        if (entry.pane) panes.add(entry.pane);
      } catch {}
    }
  } catch {}
  return panes;
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
    const status = readJSON(join(dir, "status.json"));
    const result = readJSON(join(dir, "result.json"));
    presence.set(key, { key, dir, status, result, alive: pidAlive(status?.pid) });
  }
  return presence;
}

export function statusForPresence(presence: PresenceEntry): any | null {
  return readJSON(join(presence.dir, "status.json"));
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
