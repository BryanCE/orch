import * as filesystem from "node:fs";
import * as path from "node:path";
import { errorMessage } from "./util.ts";

type TomlTable = Record<string, unknown>;

export type HostConfig = {
  /** SSH destination (for example, user@example.org). */
  dest?: string;
  /** Legacy spelling accepted for configs written before the remote-host schema. */
  ssh?: string;
  orch_dir?: string;
  timeout_ms?: number;
};

export type OrchConfig = {
  defaults: {
    adapter?: string;
    backend?: string;
    model?: string;
    allowed_models?: string[];
    spawn_cap?: number;
    worktree?: boolean;
    worker_peer_tools?: boolean;
  };
  queue: { max_retries: number };
  notify: unknown[];
  hosts: Record<string, HostConfig>;
  workspaces: Record<string, string>;
};

function stripComment(line: string): string {
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (quoted && escaped) escaped = false;
    else if (quoted && character === "\\") escaped = true;
    else if (character === "\"") quoted = !quoted;
    else if (!quoted && character === "#") return line.slice(0, index);
  }
  return line;
}

function splitValues(value: string): string[] {
  const values: string[] = [];
  let quoted = false;
  let escaped = false;
  let start = 0;
  for (let index = 0; index < value.length; index++) {
    const character = value[index];
    if (quoted && escaped) escaped = false;
    else if (quoted && character === "\\") escaped = true;
    else if (character === "\"") quoted = !quoted;
    else if (!quoted && character === ",") {
      values.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (quoted) throw new Error("unterminated string");
  values.push(value.slice(start).trim());
  return values;
}

function parseValue(value: string, line: number): unknown {
  if (value.startsWith("\"")) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed !== "string") throw new Error();
      return parsed;
    } catch {
      throw new Error(`line ${line}: invalid string`);
    }
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)) return Number(value);
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    const entries = splitValues(inner).map((entry) => parseValue(entry, line));
    if (!entries.every((entry) => typeof entry === "string")) {
      throw new Error(`line ${line}: arrays may contain only strings`);
    }
    return entries;
  }
  throw new Error(`line ${line}: unsupported value`);
}

function tableAt(root: TomlTable, parts: string[], line: number): TomlTable {
  let current = root;
  for (const part of parts) {
    if (!part) throw new Error(`line ${line}: invalid table name`);
    const existing = current[part];
    if (existing === undefined) current[part] = {};
    else if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      throw new Error(`line ${line}: ${part} is not a table`);
    }
    current = current[part] as TomlTable;
  }
  return current;
}

/** Minimal TOML parser for orch's supported config syntax. */
function parseFallbackToml(text: string): TomlTable {
  const root: TomlTable = {};
  let current = root;
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);

  for (let index = 0; index < lines.length; index++) {
    const lineNumber = index + 1;
    const line = stripComment(lines[index]).trim();
    if (!line) continue;

    const arrayTable = line.match(/^\[\[([^\]]+)\]\]$/);
    if (arrayTable) {
      const parts = arrayTable[1].split(".").map((part) => part.trim());
      const key = parts.pop();
      if (!key || parts.some((part) => !part)) throw new Error(`line ${lineNumber}: invalid table name`);
      const parent = tableAt(root, parts, lineNumber);
      if (parent[key] === undefined) parent[key] = [];
      if (!Array.isArray(parent[key])) throw new Error(`line ${lineNumber}: ${key} is not an array`);
      current = {};
      (parent[key] as TomlTable[]).push(current);
      continue;
    }

    const table = line.match(/^\[([^\]]+)\]$/);
    if (table) {
      current = tableAt(root, table[1].split(".").map((part) => part.trim()), lineNumber);
      continue;
    }

    const equals = line.indexOf("=");
    if (equals < 1) throw new Error(`line ${lineNumber}: expected key = value`);
    const key = line.slice(0, equals).trim();
    if (!/^[A-Za-z0-9_-]+$/.test(key)) throw new Error(`line ${lineNumber}: invalid key ${key}`);
    current[key] = parseValue(line.slice(equals + 1).trim(), lineNumber);
  }
  return root;
}

function parseToml(text: string): TomlTable {
  const bunToml = (globalThis as { Bun?: { TOML?: { parse?: (source: string) => unknown } } }).Bun?.TOML;
  return bunToml?.parse ? bunToml.parse(text) as TomlTable : parseFallbackToml(text);
}

function found(value: unknown): string {
  if (value === undefined) return "missing";
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function fail(file: string, key: string, expected: string, value: unknown): never {
  throw new Error(`${file}: ${key}: expected ${expected}, found ${found(value)}`);
}

function warn(file: string, key: string): void {
  process.stderr.write(`orch: ignoring unknown config key ${key} in ${file}\n`);
}

function table(value: unknown, file: string, key: string): TomlTable {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(file, key, "table", value);
  return value as TomlTable;
}

function knownKeys(value: TomlTable, file: string, prefix: string, keys: string[]): void {
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) warn(file, prefix ? `${prefix}.${key}` : key);
  }
}

/** Load and validate `the orch config directory/config.toml`; a missing file uses built-in defaults. */
export function loadConfig(orchDir: string): OrchConfig {
  const file = path.join(orchDir, "config.toml");
  let root: TomlTable;
  try {
    root = parseToml(filesystem.readFileSync(file, "utf8"));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { defaults: {}, queue: { max_retries: 1 }, notify: [], hosts: {}, workspaces: {} };
    }
    throw new Error(`${file}: config: expected valid TOML, found ${errorMessage(error)}`);
  }

  knownKeys(root, file, "", ["defaults", "queue", "notify", "hosts", "workspaces"]);
  const defaults: OrchConfig["defaults"] = {};
  if (root.defaults !== undefined) {
    const source = table(root.defaults, file, "defaults");
    knownKeys(source, file, "defaults", ["adapter", "backend", "model", "allowed_models", "spawn_cap", "worktree", "worker_peer_tools"]);
    for (const key of ["adapter", "backend", "model"] as const) {
      if (source[key] !== undefined) {
        if (typeof source[key] !== "string") fail(file, `defaults.${key}`, "string", source[key]);
        defaults[key] = source[key] as string;
      }
    }
    if (source.allowed_models !== undefined) {
      if (!Array.isArray(source.allowed_models) || !source.allowed_models.every((entry) => typeof entry === "string")) {
        fail(file, "defaults.allowed_models", "string array", source.allowed_models);
      }
      defaults.allowed_models = source.allowed_models as string[];
    }
    if (source.spawn_cap !== undefined) {
      if (typeof source.spawn_cap !== "number") fail(file, "defaults.spawn_cap", "number", source.spawn_cap);
      defaults.spawn_cap = source.spawn_cap;
    }
    if (source.worktree !== undefined) {
      if (typeof source.worktree !== "boolean") fail(file, "defaults.worktree", "boolean", source.worktree);
      defaults.worktree = source.worktree;
    }
    if (source.worker_peer_tools !== undefined) {
      if (typeof source.worker_peer_tools !== "boolean") fail(file, "defaults.worker_peer_tools", "boolean", source.worker_peer_tools);
      defaults.worker_peer_tools = source.worker_peer_tools;
    }
  }

  const queue = { max_retries: 1 };
  if (root.queue !== undefined) {
    const source = table(root.queue, file, "queue");
    knownKeys(source, file, "queue", ["max_retries"]);
    if (source.max_retries !== undefined) {
      if (typeof source.max_retries !== "number") fail(file, "queue.max_retries", "number", source.max_retries);
      queue.max_retries = source.max_retries;
    }
  }

  let notify: unknown[] = [];
  if (root.notify !== undefined) {
    if (!Array.isArray(root.notify)) fail(file, "notify", "array", root.notify);
    notify = root.notify;
  }

  const hosts: OrchConfig["hosts"] = {};
  if (root.hosts !== undefined) {
    const source = table(root.hosts, file, "hosts");
    for (const [name, host] of Object.entries(source)) {
      const hostTable = table(host, file, `hosts.${name}`);
      knownKeys(hostTable, file, `hosts.${name}`, ["dest", "ssh", "orch_dir", "timeout_ms"]);
      const destination = hostTable.dest ?? hostTable.ssh;
      if (typeof destination !== "string") fail(file, `hosts.${name}.dest`, "string", destination);
      if (hostTable.orch_dir !== undefined && typeof hostTable.orch_dir !== "string") {
        fail(file, `hosts.${name}.orch_dir`, "string", hostTable.orch_dir);
      }
      if (hostTable.timeout_ms !== undefined &&
          (typeof hostTable.timeout_ms !== "number" || !Number.isFinite(hostTable.timeout_ms) || hostTable.timeout_ms <= 0 || !Number.isInteger(hostTable.timeout_ms))) {
        throw new Error(`${file}: hosts.${name}.timeout_ms: expected a positive integer, found ${found(hostTable.timeout_ms)}`);
      }
      const parsed: HostConfig = {};
      if (hostTable.dest !== undefined) parsed.dest = destination;
      else parsed.ssh = destination;
      if (typeof hostTable.orch_dir === "string") parsed.orch_dir = hostTable.orch_dir;
      if (typeof hostTable.timeout_ms === "number") parsed.timeout_ms = hostTable.timeout_ms;
      hosts[name] = parsed;
    }
  }

  const workspaces: OrchConfig["workspaces"] = {};
  if (root.workspaces !== undefined) {
    const source = table(root.workspaces, file, "workspaces");
    for (const [id, name] of Object.entries(source)) {
      if (typeof name !== "string") fail(file, `workspaces.${id}`, "string", name);
      workspaces[id] = name;
    }
  }

  return { defaults, queue, notify, hosts, workspaces };
}

function coerceEnvironment(value: string, fallback: unknown, name: string): unknown {
  if (typeof fallback === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`${name}: expected number, found ${JSON.stringify(value)}`);
    return parsed;
  }
  if (typeof fallback === "boolean") {
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
    throw new Error(`${name}: expected boolean, found ${JSON.stringify(value)}`);
  }
  return value;
}

/** Resolve a setting with flag, ORCH_* environment, config, and fallback precedence. */
export function resolveSetting<T>(opts: { flag?: T; env?: string; config?: T; fallback: T }): T {
  if (opts.flag !== undefined) return opts.flag;
  if (opts.env && process.env[opts.env] !== undefined) {
    return coerceEnvironment(process.env[opts.env]!, opts.fallback, opts.env) as T;
  }
  if (opts.config !== undefined) return opts.config;
  return opts.fallback;
}

/** Model allowlist applied when `defaults.allowed_models` is unset. `openai-codex/*` is always allowed. */
export const DEFAULT_ALLOWED_MODELS = ["openrouter/moonshotai/kimi-k2.7-code", "openrouter/x-ai/grok-4.5"];

/** Return the configured model-allowlist patterns, or the built-in defaults when unset or unreadable. */
export function allowedModelPatterns(orchDir: string): string[] {
  try {
    const patterns = loadConfig(orchDir).defaults.allowed_models;
    if (patterns && patterns.length) return patterns;
  } catch {
    // A malformed config falls back to the built-in allowlist rather than failing closed.
  }
  return DEFAULT_ALLOWED_MODELS;
}

/** Line range [start, end) of a top-level table's body, or null when the header is absent. */
function tableBodyRange(lines: string[], section: string): { start: number; end: number } | null {
  const header = `[${section}]`;
  const headerIndex = lines.findIndex((line) => line.trim() === header);
  if (headerIndex === -1) return null;
  const start = headerIndex + 1;
  let end = lines.length;
  for (let index = start; index < lines.length; index++) {
    if (/^\s*\[/.test(lines[index])) { end = index; break; }
  }
  return { start, end };
}

/** Upsert a quoted-string assignment into the `[defaults]` table of `$orchDir/config.toml`, preserving all other content. */
export function writeDefaultEntry(orchDir: string, key: string, value: string): void {
  const file = path.join(orchDir, "config.toml");
  let text = "";
  try {
    text = filesystem.readFileSync(file, "utf8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const lines = text.length ? text.split(/\r?\n/) : [];
  const assignment = `${key} = ${JSON.stringify(value)}`;
  const range = tableBodyRange(lines, "defaults");
  if (!range) {
    lines.unshift("[defaults]", assignment, "");
  } else {
    let replaced = false;
    for (let index = range.start; index < range.end; index++) {
      const match = lines[index].match(/^\s*([A-Za-z0-9_-]+)\s*=/);
      if (match && match[1] === key) { lines[index] = assignment; replaced = true; break; }
    }
    if (!replaced) lines.splice(range.end, 0, assignment);
  }
  filesystem.mkdirSync(orchDir, { recursive: true });
  filesystem.writeFileSync(file, lines.join("\n"));
}
