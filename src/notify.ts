import * as filesystem from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { workspaceOf } from "./policy/workspace.ts";
import { errorMessage } from "./util.ts";

export type NotifyEvent = {
  host?: string;
  key: string;
  /** Origin workspace; derived from key when omitted. */
  workspace?: string;
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

/** A required configuration value collected for a notifier. */
export type NotifierConfigField = {
  /** Config key used by the notifier. */
  name: string;
  /** Human-readable prompt/label for the key. */
  label: string;
  description?: string;
  /** Whether setup and doctor should redact this value. */
  secret?: boolean;
};

/** Host-integration metadata kept separate from delivery behavior. */
export type NotifierMetadata = {
  /** Rich fields are used by setup; bare names remain contract-compatible. */
  requiredConfig: readonly (NotifierConfigField | string)[];
  description?: string;
};

/** Canonical host-integration contract. */
export type Notifier = {
  id: string;
  label: string;
  metadata: NotifierMetadata;
  /** A rejected availability probe is treated as unavailable by the registry. */
  available(config?: Record<string, unknown>): boolean | Promise<boolean>;
  /** Config is optional so phase-1 custom notifiers remain source-compatible. */
  deliver(event: NotifyEvent, config?: Record<string, unknown>): Promise<boolean>;
};

/** A configured notifier entry. `type` is accepted as the legacy spelling of `id`. */
export type NotifierEntry = {
  id: string;
  on: string[];
  config: Record<string, unknown>;
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
      const parsed: unknown = JSON.parse(value);
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
    const line = stripComment(lines[index] ?? "").trim();
    if (!line) continue;

    const arrayTable = line.match(/^\[\[([^\]]+)\]\]$/);
    if (arrayTable) {
      const parts = (arrayTable[1] ?? "").split(".").map((part) => part.trim());
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
      current = tableAt(root, (table[1] ?? "").split(".").map((part) => part.trim()), lineNumber);
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
  const bunToml = (globalThis as { Bun?: { TOML?: { parse?: (source: string) => unknown } } }).Bun?.TOML;
  if (bunToml?.parse) return bunToml.parse(text) as TomlTable;
  return parseToml(text);
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) return null;
  return value;
}

/** Read configured notifier entries, accepting both `id` and legacy `type`. */
export function loadNotifierEntries(orchDir: string): NotifierEntry[] {
  let config: TomlTable;
  try {
    config = parseConfig(filesystem.readFileSync(path.join(orchDir, "config.toml"), "utf8"));
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return [];
    warning(`could not parse config.toml: ${oneLine(error)}`);
    return [];
  }

  const entries = config.notify;
  if (entries === undefined) return [];
  if (!Array.isArray(entries)) {
    warning("invalid notify entry: [[notify]] must be an array of tables");
    return [];
  }

  const configured: NotifierEntry[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      warning("invalid notify entry: expected a table");
      continue;
    }
    const value = entry as TomlTable;
    const id = typeof value.id === "string" ? value.id : value.type;
    const on = value.on === undefined ? ["blocked", "error"] : stringArray(value.on);
    if (!on) {
      warning("invalid notify entry: on must be an array of strings");
      continue;
    }
    if (typeof id !== "string") {
      warning(`invalid notify entry: unknown sink type ${JSON.stringify(id)}`);
      continue;
    }
    const config: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (key !== "id" && key !== "type" && key !== "on") config[key] = item;
    }
    if (id === "webhook" && (typeof config.url !== "string" || !config.url)) {
      warning("invalid notify entry: webhook sink requires url");
      continue;
    }
    if (id === "command") {
      const commandValue = typeof config.command === "string" ? ["sh", "-c", config.command] : config.command;
      const command = stringArray(commandValue);
      if (!command || !command.length || !command[0]) {
        warning("invalid notify entry: command sink requires command");
        continue;
      }
      config.command = command;
    }
    if (!["desktop", "herdr", "webhook", "command"].includes(id)) {
      warning(`invalid notify entry: unknown sink type ${JSON.stringify(id)}`);
      continue;
    }
    configured.push({ id, on, config });
  }
  return configured;
}

/** Load valid legacy sink declarations from an orch config file. */
export function loadSinks(orchDir: string): Sink[] {
  return loadNotifierEntries(orchDir).flatMap((entry): Sink[] => {
    if (entry.id === "desktop" || entry.id === "herdr") return [{ type: entry.id, on: entry.on }];
    if (entry.id === "webhook") return [{ type: "webhook", on: entry.on, url: entry.config.url as string }];
    return [{ type: "command", on: entry.on, command: entry.config.command as string[] }];
  });
}

function oneLine(error: unknown): string {
  return errorMessage(error).replace(/\s+/g, " ").trim();
}

const WORKSPACE_COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#9333ea", "#0891b2", "#db2777", "#4f46e5"] as const;
const WORKSPACE_ANSI = [34, 32, 33, 31, 35, 36, 35, 34] as const;

/** Stable palette color for a workspace. */
export function workspaceColor(workspace: string): string {
  let hash = 2166136261;
  for (let index = 0; index < workspace.length; index++) {
    hash ^= workspace.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return WORKSPACE_COLORS[(hash >>> 0) % WORKSPACE_COLORS.length]!;
}

function workspaceAnsi(workspace: string): string {
  let hash = 2166136261;
  for (let index = 0; index < workspace.length; index++) {
    hash ^= workspace.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `\u001b[${WORKSPACE_ANSI[(hash >>> 0) % WORKSPACE_ANSI.length]}m`;
}

function eventWorkspace(event: NotifyEvent): string {
  return event.workspace ?? workspaceOf(event.key) ?? event.key.split(":", 1)[0];
}

/** Structured form of the canonical notification text and event metadata. */
export type NotificationPayload = {
  title: string;
  body: string;
  workspace: string;
  workspaceColor: string;
  host: string | null;
  key: string;
  agent: string | null;
  tab: string | null;
  model: string | null;
  oldState: string;
  newState: string;
  task: string | null;
  cost: number | null;
  ts: string;
  lastError: string | null;
};

/** Build the canonical structured payload consumed by non-text sinks. */
export function notificationPayload(event: NotifyEvent): NotificationPayload {
  const workspace = eventWorkspace(event);
  const { title, body } = notificationText(event);
  return {
    title,
    body,
    workspace,
    workspaceColor: workspaceColor(workspace),
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
  };
}

function payload(event: NotifyEvent): string {
  return JSON.stringify(notificationPayload(event));
}

function commandOnPath(command: string): boolean {
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
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

export function notificationText(event: NotifyEvent, options: { colorize?: boolean } = {}): { title: string; body: string } {
  const agent = event.agent ?? event.key;
  const workspace = eventWorkspace(event);
  const color = workspaceColor(workspace);
  const state = oneLine(event.newState || "unknown").toUpperCase();
  let summary = event.task ?? "state changed";
  if (event.newState === "error") summary = event.lastError ?? event.task ?? "agent error";
  else if (event.newState === "blocked") summary = event.task ?? "agent needs input";
  summary = oneLine(summary).replace(/^Q:\s*/i, "").slice(0, 60);
  const workspaceLabel = `[${workspace}]`;
  const coloredWorkspace = options.colorize ? `${workspaceAnsi(workspace)}${workspaceLabel}\u001b[0m` : workspaceLabel;
  const title = `${state} ${coloredWorkspace} ${agent}: ${summary}`;
  const details: string[] = [title, `Workspace: ${workspace} (${color})`];
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

async function deliverHerdr(event: NotifyEvent, colorize = true): Promise<boolean> {
  const { title, body } = notificationText(event, { colorize });
  return run(["herdr", "notification", "show", title, "--body", body]);
}

async function deliverDesktop(event: NotifyEvent): Promise<boolean> {
  const { title, body } = notificationText(event);
  if (process.env.HERDR_ENV === "1" && await deliverHerdr(event, false)) return true;
  if (await run(["notify-send", title, body])) return true;
  if (commandOnPath("wsl-notify-send") && await run(["wsl-notify-send", title, body])) return true;
  return windowsToast(title, body);
}

function desktopAvailable(): boolean {
  if (process.env.HERDR_ENV === "1" && commandOnPath("herdr")) return true;
  if (commandOnPath("notify-send") || commandOnPath("wsl-notify-send")) return true;
  return commandOnPath("powershell.exe") && commandOnPath("wslpath") && filesystem.existsSync(fileURLToPath(new URL("../scripts/wsl-toast.ps1", import.meta.url)));
}

function commandAvailable(config: Record<string, unknown>): boolean {
  const command = stringArray(config.command);
  return !!command?.[0] && (command[0].includes(path.sep) ? filesystem.existsSync(command[0]) : commandOnPath(command[0]));
}

/** Built-in host integrations. Delivery always uses the canonical formatter above. */
export function createBuiltinNotifiers(): Notifier[] {
  return [
    {
      id: "herdr",
      label: "Herdr",
      metadata: { description: "Herdr native notifications", requiredConfig: [] },
      available: () => commandOnPath("herdr"),
      deliver: (event) => deliverHerdr(event),
    },
    {
      id: "desktop",
      label: "Desktop",
      metadata: { description: "Desktop notifications with WSL fallback", requiredConfig: [] },
      available: () => desktopAvailable(),
      deliver: (event) => deliverDesktop(event),
    },
    {
      id: "webhook",
      label: "Webhook",
      metadata: { description: "HTTP POST notification", requiredConfig: [{ name: "url", label: "Webhook URL" }] },
      available: (config) => typeof fetch === "function" && (config?.url === undefined || (typeof config.url === "string" && config.url.length > 0)),
      deliver: async (event, config = {}) => {
        if (typeof config.url !== "string" || !config.url) return false;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        try {
          const response = await fetch(config.url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: payload(event),
            signal: controller.signal,
          });
          return response.ok;
        } finally {
          clearTimeout(timeout);
        }
      },
    },
    {
      id: "command",
      label: "Command",
      metadata: { description: "Run a command with canonical JSON on stdin", requiredConfig: [{ name: "command", label: "Command" }] },
      available: (config) => config?.command === undefined ? commandOnPath("sh") : commandAvailable(config),
      deliver: (event, config = {}) => {
        const command = stringArray(config.command);
        return command?.length ? run(command, payload(event)) : Promise.resolve(false);
      },
    },
  ];
}

export const builtinNotifiers = createBuiltinNotifiers();

function entryFromSink(sink: Sink): NotifierEntry {
  if (sink.type === "desktop" || sink.type === "herdr") return { id: sink.type, on: sink.on, config: {} };
  if (sink.type === "webhook") return { id: sink.type, on: sink.on, config: { url: sink.url } };
  return { id: sink.type, on: sink.on, config: { command: sink.command } };
}

function timeoutResult<T>(promise: Promise<T>, timeoutMs: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), timeoutMs);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, () => { clearTimeout(timer); resolve(undefined); });
  });
}

export type AvailabilityResult = { available: boolean; reason?: string; error?: string };

/** Registry for probing, validating, and isolating configured notifier deliveries. */
export class NotifierRegistry {
  private readonly notifiers = new Map<string, Notifier>();
  private readonly emitWarning: (message: string) => void;
  readonly timeoutMs: number;

  constructor(notifiers: readonly Notifier[] = builtinNotifiers, options: { timeoutMs?: number; warn?: (message: string) => void } = {}) {
    this.timeoutMs = options.timeoutMs ?? 3000;
    this.emitWarning = options.warn ?? ((message) => warning(message));
    for (const notifier of notifiers) this.register(notifier);
  }

  register(notifier: Notifier): this {
    this.notifiers.set(notifier.id, notifier);
    return this;
  }

  get(id: string): Notifier | undefined { return this.notifiers.get(id); }
  list(): Notifier[] { return [...this.notifiers.values()]; }

  validate(id: string, config: Record<string, unknown>): string[] {
    const notifier = this.notifiers.get(id);
    if (!notifier) return [`unknown notifier: ${id}`];
    return notifier.metadata.requiredConfig.flatMap((field) => {
      const name = typeof field === "string" ? field : field.name;
      const value = config[name];
      if (name === "command" ? !stringArray(value)?.length : typeof value !== "string" || !value.trim()) {
        return [`${id} requires ${name}`];
      }
      return [];
    });
  }

  /** Probe all integrations, or one integration with its configured metadata. */
  async probe(): Promise<Record<string, boolean>>;
  async probe(id: string, config?: Record<string, unknown>): Promise<AvailabilityResult>;
  async probe(id?: string, config: Record<string, unknown> = {}): Promise<Record<string, boolean> | AvailabilityResult> {
    if (id !== undefined) {
      const notifier = this.notifiers.get(id);
      if (!notifier) return { available: false, reason: "unknown notifier" };
      const errors = this.validate(id, config);
      if (errors.length) return { available: false, reason: errors.join("; ") };
      try {
        if (id === "command" && !commandAvailable(config)) return { available: false, reason: "configured command is not on PATH" };
        return (await notifier.available(config)) ? { available: true } : { available: false, reason: "host integration unavailable" };
      } catch (error) {
        return { available: false, error: oneLine(error) };
      }
    }
    const result: Record<string, boolean> = {};
    await Promise.all(this.list().map(async (notifier) => {
      try { result[notifier.id] = await notifier.available(); } catch { result[notifier.id] = false; }
    }));
    return result;
  }

  /** Alias used by setup/doctor callers. */
  probeAvailability(): Promise<Record<string, boolean>>;
  probeAvailability(id: string, config?: Record<string, unknown>): Promise<AvailabilityResult>;
  probeAvailability(id?: string, config: Record<string, unknown> = {}): Promise<Record<string, boolean> | AvailabilityResult> {
    return id === undefined ? this.probe() : this.probe(id, config);
  }

  async deliverEntry(entry: NotifierEntry, event: NotifyEvent, checkAvailability = true): Promise<boolean> {
    if (!entry.on.includes(event.newState)) return true;
    const notifier = this.notifiers.get(entry.id);
    if (!notifier) { this.emitWarning(`${entry.id} notifier is not registered`); return false; }
    if (this.validate(entry.id, entry.config).length) { this.emitWarning(`${entry.id} notifier has invalid configuration`); return false; }
    if (checkAvailability) {
      try {
        // A command's availability depends on its configured executable, not just the
        // shell used by the adapter. Keep this check in the registry so custom
        // Notifier implementations retain the phase-1 boolean probe contract.
        if (entry.id === "command" && !commandAvailable(entry.config)) {
          this.emitWarning(`${entry.id} notifier unavailable`);
          return false;
        }
        if (!(await notifier.available(entry.config))) { this.emitWarning(`${entry.id} notifier unavailable`); return false; }
      } catch { this.emitWarning(`${entry.id} notifier unavailable`); return false; }
    }
    const result = await timeoutResult(Promise.resolve().then(() => notifier.deliver(event, entry.config)), this.timeoutMs);
    if (result !== true) { this.emitWarning(`${entry.id} sink failed`); return false; }
    return true;
  }

  /** Deliver configured entries, or one id/config/event tuple for adapter callers. */
  async deliver(event: NotifyEvent, entries: readonly (NotifierEntry | Sink)[]): Promise<boolean[]>;
  async deliver(id: string, config: Record<string, unknown>, event: NotifyEvent): Promise<boolean>;
  async deliver(eventOrId: NotifyEvent | string, entriesOrConfig: readonly (NotifierEntry | Sink)[] | Record<string, unknown>, maybeEvent?: NotifyEvent): Promise<boolean[] | boolean> {
    if (typeof eventOrId === "string") {
      if (!maybeEvent) return false;
      return this.deliverEntry({ id: eventOrId, on: [maybeEvent.newState], config: entriesOrConfig as Record<string, unknown> }, maybeEvent, true);
    }
    const entries = entriesOrConfig as readonly (NotifierEntry | Sink)[];
    return Promise.all(entries.map((entry) => this.deliverEntry("type" in entry ? entryFromSink(entry) : entry, eventOrId, true)));
  }

  /** Queue best-effort delivery without delaying or throwing into producers. */
  notify(event: NotifyEvent, entries: readonly (NotifierEntry | Sink)[]): void {
    for (const entry of entries) {
      const configured = "type" in entry ? entryFromSink(entry) : entry;
      if (!configured.on.includes(event.newState)) continue;
      queueMicrotask(() => { void this.deliverEntry(configured, event, true); });
    }
  }
}

export function createNotifierRegistry(notifiers?: readonly Notifier[], options: { timeoutMs?: number; warn?: (message: string) => void } = {}): NotifierRegistry {
  return new NotifierRegistry(notifiers ?? builtinNotifiers, options);
}

export const notifierRegistry = createNotifierRegistry();

export async function deliverToSink(sink: Sink, event: NotifyEvent): Promise<boolean> {
  const configured = entryFromSink(sink);
  // Preserve the direct sink API: it reports the adapter outcome and does not probe first.
  return notifierRegistry.deliverEntry(configured, event, false);
}

/** Queue best-effort sink delivery without delaying or throwing into the caller. */
export function notify(entries: readonly (Sink | NotifierEntry)[], event: NotifyEvent): void {
  notifierRegistry.notify(event, entries);
}
