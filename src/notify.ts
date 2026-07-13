import * as filesystem from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export type NotifyEvent = {
  host?: string;
  key: string;
  /** Human-assigned agent name. */
  agent: string | null;
  tab: string | null;
  /** Model id plus thinking level, e.g. terra:medium. */
  model: string | null;
  oldState: string;
  newState: string;
  task?: string;
  cost?: number;
  ts: string;
  lastError?: string;
};

export type DesktopSink = { type: "desktop"; on: string[] };
export type HerdrSink = { type: "herdr"; on: string[] };
export type WebhookSink = { type: "webhook"; on: string[]; url: string };
export type CommandSink = { type: "command"; on: string[]; command: string[] };
export type Sink = DesktopSink | HerdrSink | WebhookSink | CommandSink;

type TomlTable = Record<string, unknown>;

function warning(message: string): void {
  process.stderr.write(`notify: ${message}\n`);
}

function stripComment(line: string): string {
  let quoted = false;
  let escaped = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted && escaped) {
      escaped = false;
    } else if (quoted && char === "\\") {
      escaped = true;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === "#") {
      return line.slice(0, i);
    }
  }
  return line;
}

function splitValues(value: string): string[] {
  const values: string[] = [];
  let quoted = false;
  let escaped = false;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (quoted && escaped) {
      escaped = false;
    } else if (quoted && char === "\\") {
      escaped = true;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      values.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (quoted) throw new Error("unterminated string");
  values.push(value.slice(start).trim());
  return values;
}

function parseValue(value: string, line: number): unknown {
  if (value.startsWith('"')) {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== "string") throw new Error("not a string");
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

function splitAssignment(line: string): number {
  let quoted = false;
  let escaped = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted && escaped) {
      escaped = false;
    } else if (quoted && char === "\\") {
      escaped = true;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === "=") {
      return i;
    }
  }
  return -1;
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

/** Minimal TOML parser used when Bun.TOML is unavailable. */
function parseToml(text: string): TomlTable {
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
      const existing = parent[key];
      if (existing === undefined) parent[key] = [];
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

    const equals = splitAssignment(line);
    if (equals < 1) throw new Error(`line ${lineNumber}: expected key = value`);
    const key = line.slice(0, equals).trim();
    if (!/^[A-Za-z0-9_-]+$/.test(key)) throw new Error(`line ${lineNumber}: invalid key ${key}`);
    current[key] = parseValue(line.slice(equals + 1).trim(), lineNumber);
  }

  return root;
}

function parseConfig(text: string): TomlTable {
  const bunToml = (globalThis as any).Bun?.TOML;
  if (bunToml?.parse) return bunToml.parse(text) as TomlTable;
  return parseToml(text);
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) return null;
  return value;
}

/** Load valid `[[notify]]` sink declarations from an orch config file. */
export function loadSinks(orchDir: string): Sink[] {
  let config: TomlTable;
  try {
    config = parseConfig(filesystem.readFileSync(path.join(orchDir, "config.toml"), "utf8"));
  } catch (error: any) {
    if (error?.code === "ENOENT") return [];
    warning(`could not parse config.toml: ${oneLine(error)}`);
    return [];
  }

  const entries = config.notify;
  if (entries === undefined) return [];
  if (!Array.isArray(entries)) {
    warning("invalid notify entry: [[notify]] must be an array of tables");
    return [];
  }

  const sinks: Sink[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      warning("invalid notify entry: expected a table");
      continue;
    }
    const value = entry as TomlTable;
    const on = value.on === undefined ? ["blocked", "error"] : stringArray(value.on);
    if (!on) {
      warning("invalid notify entry: on must be an array of strings");
      continue;
    }
    if (value.type === "desktop") {
      sinks.push({ type: "desktop", on });
    } else if (value.type === "herdr") {
      sinks.push({ type: "herdr", on });
    } else if (value.type === "webhook") {
      if (typeof value.url !== "string" || !value.url) {
        warning("invalid notify entry: webhook sink requires url");
        continue;
      }
      sinks.push({ type: "webhook", on, url: value.url });
    } else if (value.type === "command") {
      const command = typeof value.command === "string" ? ["sh", "-c", value.command] : stringArray(value.command);
      if (!command || !command.length || !command[0]) {
        warning("invalid notify entry: command sink requires command");
        continue;
      }
      sinks.push({ type: "command", on, command });
    } else {
      warning(`invalid notify entry: unknown sink type ${JSON.stringify(value.type)}`);
    }
  }
  return sinks;
}

function oneLine(error: unknown): string {
  return String(error instanceof Error ? error.message : error).replace(/\s+/g, " ").trim();
}

function payload(event: NotifyEvent): string {
  const { title, body } = notificationText(event);
  return JSON.stringify({
    title,
    body,
    host: event.host ?? null,
    key: event.key,
    agent: event.agent,
    tab: event.tab,
    model: event.model,
    oldState: event.oldState,
    newState: event.newState,
    task: event.task ?? null,
    cost: event.cost ?? null,
    ts: event.ts,
    lastError: event.lastError ?? null,
  });
}

function commandOnPath(command: string): boolean {
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    if (dir && filesystem.existsSync(path.join(dir, command))) return true;
  }
  return false;
}

async function run(command: string[], stdin?: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(command, {
      stdin: stdin === undefined ? "ignore" : "pipe",
      stdout: "ignore",
      stderr: "ignore",
    });
    if (stdin !== undefined && proc.stdin) {
      proc.stdin.write(stdin);
      proc.stdin.end();
    }
    return (await proc.exited) === 0;
  } catch {
    return false;
  }
}

export function notificationText(event: NotifyEvent): { title: string; body: string } {
  const agent = event.agent || event.key;
  const state = oneLine(event.newState || "unknown").toUpperCase();
  let summary = event.task || "state changed";
  if (event.newState === "error") summary = event.lastError || event.task || "agent error";
  else if (event.newState === "blocked") summary = event.task || "agent needs input";
  summary = oneLine(summary).replace(/^Q:\s*/i, "").slice(0, 60);
  const title = `${state} ${agent}: ${summary}`;
  const details: string[] = [title];
  if (event.tab) details.push(`Tab: ${event.tab}`);
  if (event.model) details.push(`Model: ${event.model}`);
  if (event.task && event.newState !== "blocked") details.push(`Task: ${oneLine(event.task)}`);
  if (event.lastError && event.newState !== "error") details.push(`Error: ${oneLine(event.lastError)}`);
  if (typeof event.cost === "number") details.push(`Cost: $${event.cost.toFixed(2)}`);
  return { title, body: details.join("\n") };
}

async function windowsToast(title: string, body: string): Promise<boolean> {
  if (!commandOnPath("powershell.exe")) return false;
  const script = fileURLToPath(new URL("../scripts/wsl-toast.ps1", import.meta.url));
  if (!filesystem.existsSync(script)) return false;
  try {
    const convert = Bun.spawn(["wslpath", "-w", script], { stdout: "pipe", stderr: "ignore" });
    if ((await convert.exited) !== 0) return false;
    const windowsPath = (await new Response(convert.stdout).text()).trim();
    if (!windowsPath) return false;
    return await run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", windowsPath, "-Title", title, "-Body", body]);
  } catch {
    return false;
  }
}

async function deliverHerdr(event: NotifyEvent): Promise<boolean> {
  const { title, body } = notificationText(event);
  return run(["herdr", "notification", "show", title, "--body", body]);
}

async function deliverDesktop(event: NotifyEvent): Promise<boolean> {
  const { title, body } = notificationText(event);
  if (process.env.HERDR_ENV === "1" && await deliverHerdr(event)) return true;
  if (await run(["notify-send", title, body])) return true;
  if (commandOnPath("wsl-notify-send") && await run(["wsl-notify-send", title, body])) return true;
  return windowsToast(title, body);
}

export async function deliverToSink(sink: Sink, event: NotifyEvent): Promise<boolean> {
  try {
    if (sink.type === "desktop") return await deliverDesktop(event);
    if (sink.type === "herdr") return await deliverHerdr(event);
    if (sink.type === "webhook") {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const response = await fetch(sink.url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload(event),
          signal: controller.signal,
        });
        return response.ok;
      } finally {
        clearTimeout(timeout);
      }
    }
    return await run(sink.command, payload(event));
  } catch {
    return false;
  }
}

/** Queue best-effort sink delivery without delaying or throwing into the caller. */
export function notify(sinks: Sink[], event: NotifyEvent): void {
  for (const sink of sinks) {
    if (!sink.on.includes(event.newState)) continue;
    queueMicrotask(() => {
      void deliverToSink(sink, event).then((ok) => {
        if (!ok) warning(`${sink.type} sink failed`);
      });
    });
  }
}
