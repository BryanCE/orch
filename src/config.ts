import * as filesystem from "node:fs";
import * as path from "node:path";
import { z } from "zod";
// config.ts is a leaf module imported during almost every module graph's init
// (notify.ts → config.ts among others). It must never import the provider
// registries — they evaluate every concrete adapter/backend, re-entering this
// graph mid-initialization. The closed id sets live in the pure port modules.
import { ADAPTER_IDS } from "./adapters/adapter.ts";
import { BACKEND_IDS } from "./backends/backend.ts";
import { errorMessage } from "./util.ts";

/** The one settings.json schema version. Pre-publish there is no legacy support:
 * a file with any other version is invalid and must be fixed by hand or recreated
 * by `orch setup`. Pre-publish (0.1.0) there is exactly ONE live schema and it
 * stays `1` — never bump it. On a shape change, edit the shape and fix every
 * writer/reader/test in the same commit; there is no old data to migrate, so the
 * stamp does not increment. */
export const SETTINGS_SCHEMA = 1;

const PositiveInt = z.number().int().positive();

const HostSchema = z.strictObject({
  /** SSH destination (for example, user@example.org). */
  dest: z.string().min(1),
  orch_dir: z.string().optional(),
  timeout_ms: z.number().int().positive().optional(),
});

/** The full contract for `$ORCH_DIR/settings.json` — user-editable, whole-file
 * JSON round-trip, schemaVersion-stamped, validated loudly on every load. */
const SettingsFileSchema = z.strictObject({
  schemaVersion: z.literal(SETTINGS_SCHEMA),
  /** Providers whose integrations setup installed; any of them can be spawned. */
  installed: z.strictObject({
    adapters: z.array(z.string()),
    backends: z.array(z.string()),
  }).optional(),
  defaults: z.strictObject({
    adapter: z.string().optional(),
    backend: z.string().optional(),
    model: z.string().optional(),
    allowed_models: z.array(z.string()).optional(),
    spawn_cap: z.number().optional(),
    worktree: z.boolean().optional(),
    worker_peer_tools: z.boolean().optional(),
  }).optional(),
  queue: z.strictObject({
    max_retries: z.number().optional(),
  }).optional(),
  notify: z.array(z.unknown()).optional(),
  locked_commands: z.array(z.string()).optional(),
  hosts: z.record(z.string(), HostSchema).optional(),
  workspaces: z.record(z.string(), z.string()).optional(),
  limits: z.strictObject({
    maxAgents: PositiveInt.optional(),
    workspaces: z.record(z.string(), PositiveInt).optional(),
  }).optional(),
});

export type SettingsFile = z.infer<typeof SettingsFileSchema>;
export type HostConfig = z.infer<typeof HostSchema>;

/** Settings normalized for consumers: every section present, queue defaults applied. */
export interface OrchConfig {
  installed: { adapters: string[]; backends: string[] };
  defaults: NonNullable<SettingsFile["defaults"]>;
  queue: { max_retries: number };
  notify: unknown[];
  locked_commands: string[];
  hosts: Record<string, HostConfig>;
  workspaces: Record<string, string>;
  limits: { maxAgents?: number; workspaces?: Record<string, number> };
}

/** User-editable composition storage: `$orchDir/settings.json`. */
export function settingsPath(orchDir: string): string {
  return path.join(orchDir, "settings.json");
}

/** Parse and schema-validate `settings.json`, or null when the file is absent. Throws loudly on any defect. */
function readSettingsFile(file: string): SettingsFile | null {
  let text: string;
  try {
    text = filesystem.readFileSync(file, "utf8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error: unknown) {
    throw new Error(`${file}: expected valid JSON, found ${errorMessage(error)}`);
  }
  const result = SettingsFileSchema.safeParse(parsed);
  if (!result.success) {
    // A version mismatch means the whole file predates the current schema; every
    // other defect gets the per-key prettified message.
    if (result.error.issues.some((issue) => issue.path[0] === "schemaVersion")) {
      throw new Error(`${file}: schemaVersion must be ${SETTINGS_SCHEMA} — this file predates the current schema; re-run orch setup`);
    }
    throw new Error(`${file}: invalid settings:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** Reject unknown provider ids and defaults outside the installed sets — composition validation the pure schema can't do. */
function requireInstalledComposition(file: string, root: SettingsFile): void {
  const adapterIds: readonly string[] = ADAPTER_IDS;
  const backendIds: readonly string[] = BACKEND_IDS;
  const installed = root.installed ?? { adapters: [], backends: [] };
  for (const id of installed.adapters) {
    if (!adapterIds.includes(id)) throw new Error(`${file}: installed.adapters: unknown adapter "${id}" — supported adapters: ${adapterIds.join(", ")}`);
  }
  for (const id of installed.backends) {
    if (!backendIds.includes(id)) throw new Error(`${file}: installed.backends: unknown backend "${id}" — supported backends: ${backendIds.join(", ")}`);
  }
  const adapter = root.defaults?.adapter;
  if (adapter !== undefined && !installed.adapters.includes(adapter)) {
    throw new Error(`${file}: defaults.adapter: "${adapter}" is not an installed adapter — installed: ${installed.adapters.join(", ") || "(none)"}; re-run orch setup`);
  }
  const backend = root.defaults?.backend;
  if (backend !== undefined && !installed.backends.includes(backend)) {
    throw new Error(`${file}: defaults.backend: "${backend}" is not an installed backend — installed: ${installed.backends.join(", ") || "(none)"}; re-run orch setup`);
  }
}

/** Load and validate `$orchDir/settings.json`; a missing file uses built-in defaults. */
export function loadConfig(orchDir: string): OrchConfig {
  const file = settingsPath(orchDir);
  const root = readSettingsFile(file);
  if (root === null) {
    // Rule 8: a legacy config.toml is never read or migrated — its presence is an error.
    const legacy = path.join(orchDir, "config.toml");
    if (filesystem.existsSync(legacy)) {
      throw new Error(`${legacy}: legacy config.toml detected — settings now live in ${file}; re-run orch setup (the old values are not read)`);
    }
    return { installed: { adapters: [], backends: [] }, defaults: {}, queue: { max_retries: 1 }, notify: [], locked_commands: [], hosts: {}, workspaces: {}, limits: {} };
  }
  requireInstalledComposition(file, root);
  return {
    installed: { adapters: root.installed?.adapters ?? [], backends: root.installed?.backends ?? [] },
    defaults: root.defaults ?? {},
    queue: { max_retries: root.queue?.max_retries ?? 1 },
    notify: root.notify ?? [],
    locked_commands: root.locked_commands ?? [],
    hosts: root.hosts ?? {},
    workspaces: root.workspaces ?? {},
    limits: root.limits ?? {},
  };
}

/** Watch settings.json and publish successfully loaded configurations. */
export function watchConfig(
  orchDir: string,
  onChange: (config: OrchConfig) => void,
  onWarn?: (msg: string) => void,
): { stop(): void } {
  const file = settingsPath(orchDir);
  const debounceMs = 250;
  const pollMs = 5_000;
  let stopped = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let watcher: filesystem.FSWatcher | undefined;
  let lastGood = loadConfig(orchDir);
  let lastStat = statSignature(file);
  let badState: string | undefined;

  const reload = (): void => {
    debounceTimer = undefined;
    if (stopped) return;
    try {
      const config = loadConfig(orchDir);
      lastGood = config;
      badState = undefined;
      onChange(config);
    } catch (error: unknown) {
      const message = errorMessage(error);
      const state = `${statSignature(file)}:${message}`;
      if (state !== badState) {
        badState = state;
        onWarn?.(message);
      }
    }
  };

  const scheduleReload = (): void => {
    if (stopped) return;
    if (debounceTimer !== undefined) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(reload, debounceMs);
  };

  const poll = (): void => {
    const currentStat = statSignature(file);
    if (currentStat !== lastStat) {
      lastStat = currentStat;
      scheduleReload();
    }
  };

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    if (debounceTimer !== undefined) clearTimeout(debounceTimer);
    if (pollTimer !== undefined) clearInterval(pollTimer);
    watcher?.close();
  };

  try {
    watcher = filesystem.watch(file, { persistent: false }, scheduleReload);
    watcher.on("error", (error: Error) => {
      if (!stopped) onWarn?.(errorMessage(error));
    });
    pollTimer = setInterval(poll, pollMs);
    pollTimer.unref();
    onChange(lastGood);
  } catch (error: unknown) {
    stop();
    throw error;
  }

  return { stop };
}

function statSignature(file: string): string {
  try {
    const stat = filesystem.statSync(file);
    return `${stat.mtimeMs}:${stat.size}:${stat.ino}`;
  } catch {
    return "missing";
  }
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

/** Where a resolved setting's winning value came from. */
export type SettingSource = "flag" | "env" | "settings.json" | "default";

/** Resolve a setting with its winning source. The ONE precedence order — flag > env > settings.json > default; `resolveSetting` delegates here so the two can never drift. */
export function resolveWithSource<T>(opts: { flag?: T; env?: string; config?: T; fallback: T }): { value: T; source: SettingSource } {
  if (opts.flag !== undefined) return { value: opts.flag, source: "flag" };
  if (opts.env && process.env[opts.env] !== undefined) {
    return { value: coerceEnvironment(process.env[opts.env]!, opts.fallback, opts.env) as T, source: "env" };
  }
  if (opts.config !== undefined) return { value: opts.config, source: "settings.json" };
  return { value: opts.fallback, source: "default" };
}

/** Resolve a setting with flag, ORCH_* environment, config, and fallback precedence. */
export function resolveSetting<T>(opts: { flag?: T; env?: string; config?: T; fallback: T }): T {
  return resolveWithSource(opts).value;
}

/** Model allowlist applied when `defaults.allowed_models` is unset. `openai-codex/*` is always allowed. */
export const DEFAULT_ALLOWED_MODELS = ["openrouter/moonshotai/kimi-k2.7-code", "openrouter/x-ai/grok-4.5"];

/** Return the configured model-allowlist patterns, or the built-in defaults when unset or unreadable. */
export function allowedModelPatterns(orchDir: string): string[] {
  try {
    const patterns = loadConfig(orchDir).defaults.allowed_models;
    if (patterns?.length) return patterns;
  } catch {
    // A malformed config falls back to the built-in allowlist rather than failing closed.
  }
  return DEFAULT_ALLOWED_MODELS;
}

/** Apply one schema-validated mutation to `$orchDir/settings.json` via whole-file JSON round-trip. An invalid composition (defaults outside the installed sets) never lands on disk — write `installed` before `defaults`. The write is tmp+rename so a crash mid-write cannot truncate settings.json — the config watcher only ever reads a complete file. */
function updateSettingsFile(orchDir: string, mutate: (root: SettingsFile) => SettingsFile): void {
  const file = settingsPath(orchDir);
  const root = readSettingsFile(file) ?? { schemaVersion: SETTINGS_SCHEMA };
  const updated = SettingsFileSchema.parse(mutate(root));
  requireInstalledComposition(file, updated);
  filesystem.mkdirSync(orchDir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  filesystem.writeFileSync(tmp, JSON.stringify(updated, null, 2) + "\n");
  filesystem.renameSync(tmp, file);
}

/** Upsert one string entry in the `defaults` section of settings.json. */
export function writeSettingsDefault(orchDir: string, key: "adapter" | "backend" | "model", value: string): void {
  updateSettingsFile(orchDir, (root) => ({ ...root, defaults: { ...root.defaults, [key]: value } }));
}

/** Record the setup-installed provider sets in settings.json. */
export function writeSettingsInstalled(orchDir: string, installed: { adapters: readonly string[]; backends: readonly string[] }): void {
  updateSettingsFile(orchDir, (root) => ({ ...root, installed: { adapters: [...installed.adapters], backends: [...installed.backends] } }));
}

/** Append setup-selected notifier entries to the settings.json `notify` array, skipping ids already configured. */
export function writeSettingsNotify(orchDir: string, entries: readonly Record<string, unknown>[]): void {
  updateSettingsFile(orchDir, (root) => {
    const existing = root.notify ?? [];
    const configured = new Set(existing.map((entry) => (entry as { id?: unknown })?.id).filter((id) => typeof id === "string"));
    const added = entries.filter((entry) => typeof entry.id === "string" && !configured.has(entry.id));
    return { ...root, notify: [...existing, ...added] };
  });
}
