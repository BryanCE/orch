import * as filesystem from "node:fs";
import * as path from "node:path";
import { z } from "zod";
// config.ts is a leaf module imported during almost every module graph's init
// (notify.ts → config.ts among others). It must never import the provider
// registries — they evaluate every concrete adapter/backend, re-entering this
// graph mid-initialization. The closed id sets live in the pure port modules.
import { ADAPTER_IDS } from "./adapters/adapter.ts";
import { BACKEND_IDS } from "./backends/backend.ts";
import { ORCH_RUNTIMES, type OrchRuntime } from "./runtime.ts";
import { errorMessage } from "./util.ts";

/** The one settings.json schema version. This stays 1 until the project owner
 * says otherwise — DO NOT BUMP IT, ever, for any shape change. Pre-publish there
 * is no legacy support: exactly ONE live schema, no reader accepts two, a file
 * with any other version is invalid and recreated by `orch setup`. On a shape
 * change, alter the one live schema below and fix every writer/reader/test in
 * the same commit; the stamp itself does not move. */
export const SETTINGS_SCHEMA = 1;

const PositiveInt = z.number().int().positive();

const HostSchema = z.strictObject({
  /** SSH destination (for example, user@example.org). */
  dest: z.string().min(1),
  orch_dir: z.string().optional(),
  timeout_ms: z.number().int().positive().optional(),
});

export const NOTIFY_STATES = ["idle", "working", "blocked", "done", "error", "aborted", "exited", "unknown"] as const;
const NotifyOnSchema = z.array(z.enum(NOTIFY_STATES)).optional();
const NotifyEntrySchema = z.discriminatedUnion("id", [
  z.strictObject({ id: z.literal("desktop"), on: NotifyOnSchema }),
  z.strictObject({
    id: z.literal("webhook"),
    on: NotifyOnSchema,
    url: z.string().min(1).refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    }, "must be an http or https URL"),
  }),
  z.strictObject({
    id: z.literal("command"),
    on: NotifyOnSchema,
    command: z.union([
      z.string().min(1),
      z.array(z.string().min(1)).min(1),
    ]),
  }),
  z.strictObject({ id: z.literal("herdr"), on: NotifyOnSchema }),
]);
export type NotifyEntry = z.infer<typeof NotifyEntrySchema>;

export const SETTINGS_DEFAULTS = {
  fleet: { spawn_cap: 8, worker_peer_tools: false, cross_workspace: false },
  queue: { max_retries: 1 },
  timeouts: { dispatch_ack_ms: 10_000, wait_ms: 300_000, adapter_command_ms: 60_000, notify_ms: 3_000 },
  defaults: { worktree: false },
} as const;

/** The full contract for `$ORCH_DIR/settings.json` — user-editable, whole-file
 * JSON round-trip, schemaVersion-stamped, validated loudly on every load. */
const SettingsFileSchema = z.strictObject({
  schemaVersion: z.literal(SETTINGS_SCHEMA),
  /** The JS runtime this install executes under — a REQUIRED top-level scalar, chosen at
   * `orch setup`. Not a member of `defaults` (no spawn may pick its own runtime) and not
   * an `installed` set (exactly one runtime executes an install). Never defaulted on read. */
  runtime: z.enum(ORCH_RUNTIMES),
  /** Providers whose integrations setup installed; any of them can be spawned. */
  installed: z.strictObject({
    adapters: z.array(z.string()),
    backends: z.array(z.string()),
  }).optional(),
  defaults: z.strictObject({
    adapter: z.string().optional(),
    backend: z.string().optional(),
    model: z.string().optional(),
    worktree: z.boolean().optional(),
  }).optional(),
  fleet: z.strictObject({
    spawn_cap: PositiveInt.optional(),
    max_agents: PositiveInt.optional(),
    workspace_caps: z.record(z.string(), PositiveInt).optional(),
    worker_peer_tools: z.boolean().optional(),
    cross_workspace: z.boolean().optional(),
  }).optional(),
  models: z.strictObject({
    allowed: z.array(z.string()).optional(),
  }).optional(),
  queue: z.strictObject({
    max_retries: z.number().int().nonnegative().optional(),
  }).optional(),
  timeouts: z.strictObject({
    dispatch_ack_ms: PositiveInt.optional(),
    wait_ms: PositiveInt.optional(),
    adapter_command_ms: PositiveInt.optional(),
    notify_ms: PositiveInt.optional(),
  }).optional(),
  notify: z.array(NotifyEntrySchema).optional(),
  locked_commands: z.array(z.string()).optional(),
  hosts: z.record(z.string(), HostSchema).optional(),
  workspaces: z.record(z.string(), z.string()).optional(),
});

export type SettingsFile = z.infer<typeof SettingsFileSchema>;
export type HostConfig = z.infer<typeof HostSchema>;

/** Settings normalized for consumers: every section present and defaults applied. */
export interface OrchConfig {
  runtime: OrchRuntime;
  installed: { adapters: string[]; backends: string[] };
  defaults: { adapter?: string; backend?: string; model?: string; worktree: boolean };
  fleet: { spawn_cap: number; max_agents?: number; workspace_caps: Record<string, number>; worker_peer_tools: boolean; cross_workspace: boolean };
  models: { allowed: string[] };
  queue: { max_retries: number };
  timeouts: { dispatch_ack_ms: number; wait_ms: number; adapter_command_ms: number; notify_ms: number };
  notify: NotifyEntry[];
  locked_commands: string[];
  hosts: Record<string, HostConfig>;
  workspaces: Record<string, string>;
}

/** The settings filename, as a directory watcher sees it. */
const SETTINGS_FILE = "settings.json";

/** User-editable composition storage: `$orchDir/settings.json`. */
export function settingsPath(orchDir: string): string {
  return path.join(orchDir, SETTINGS_FILE);
}

function settingsTemporaryPath(file: string): string {
  return `${file}.${process.pid}.tmp`;
}

/**
 * True when `filename` names settings.json or the temp file its write renames on.
 *
 * A directory watcher must accept both. The write lands as create+rename, and
 * which of the two names the platform reports is not guaranteed — a watcher
 * matching only `settings.json` can miss the write outright, and this watcher
 * has no poll to fall back on. The convention lives beside the writer that mints
 * it so the two cannot drift.
 */
function namesSettingsFile(filename: string | Buffer | null | undefined): boolean {
  const name = filename?.toString();
  if (name === undefined) return false;
  return name === SETTINGS_FILE || (name.startsWith(`${SETTINGS_FILE}.`) && name.endsWith(".tmp"));
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
    // Every rejection below is rendered as plain guidance naming the file, what is wrong, and
    // the exact command that fixes it. A raw zod issue dump never reaches the operator.
    const root = parsed as Record<string, unknown> | null;
    if (result.error.issues.some((issue) => issue.path[0] === "schemaVersion")) {
      throw new Error(`${file}: this settings file was written by an older orch (schemaVersion ${JSON.stringify(root?.schemaVersion)}; this orch reads ${SETTINGS_SCHEMA}) and cannot be read.\nRun: orch setup`);
    }
    // The runtime is declared, never inferred: an absent or unrecognized value is a hard error
    // naming the three accepted values. There is deliberately no default-on-read.
    if (result.error.issues.some((issue) => issue.path[0] === "runtime")) {
      const found = root?.runtime;
      const problem = found === undefined
        ? `has no top-level "runtime" key, so orch does not know which JS runtime to run its harness shims under`
        : `declares runtime ${JSON.stringify(found)}, which is not a runtime orch supports`;
      throw new Error(`${file}: ${problem}. Accepted values: ${ORCH_RUNTIMES.join(", ")}.\nRun: orch setup`);
    }
    throw new Error(`${file}: this settings file has invalid values:\n${z.prettifyError(result.error)}\nFix those keys by hand, or re-record the file with: orch setup`);
  }
  return result.data;
}

/** Move an unreadable `settings.json` aside so `orch setup` can re-record from scratch, and
 * return the backup path; null when the file is absent or already readable. Pre-publish, a file
 * from an older schema is malformed data rather than something to migrate (Rule 8) — setup reaps
 * it. This is the ONE place that does so, and it is never reached by an ordinary command. */
export function reapUnreadableSettings(orchDir: string): string | null {
  const file = settingsPath(orchDir);
  if (!filesystem.existsSync(file)) return null;
  try {
    readSettingsFile(file);
    return null;
  } catch {
    const backup = `${file}.invalid`;
    filesystem.rmSync(backup, { force: true });
    filesystem.renameSync(file, backup);
    return backup;
  }
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

/** Load and validate `$orchDir/settings.json`, or null when the file does not exist yet.
 *
 * ONLY for the callers that must genuinely distinguish a first run from a configured
 * install — setup's own gate. Every other caller uses `loadConfig`, which treats an
 * absent file as the loud error it is. A malformed file still throws here. */
export function loadConfigOrNull(orchDir: string): OrchConfig | null {
  const file = settingsPath(orchDir);
  const root = readSettingsFile(file);
  if (root === null) {
    // Rule 8: a legacy config.toml is never read or migrated — its presence is an error.
    const legacy = path.join(orchDir, "config.toml");
    if (filesystem.existsSync(legacy)) {
      throw new Error(`${legacy}: legacy config.toml detected — settings now live in ${file}; re-run orch setup (the old values are not read)`);
    }
    return null;
  }
  requireInstalledComposition(file, root);
  return {
    runtime: root.runtime,
    installed: { adapters: root.installed?.adapters ?? [], backends: root.installed?.backends ?? [] },
    defaults: { ...root.defaults, worktree: root.defaults?.worktree ?? SETTINGS_DEFAULTS.defaults.worktree },
    fleet: {
      spawn_cap: root.fleet?.spawn_cap ?? SETTINGS_DEFAULTS.fleet.spawn_cap,
      max_agents: root.fleet?.max_agents,
      workspace_caps: root.fleet?.workspace_caps ?? {},
      worker_peer_tools: root.fleet?.worker_peer_tools ?? SETTINGS_DEFAULTS.fleet.worker_peer_tools,
      cross_workspace: root.fleet?.cross_workspace ?? SETTINGS_DEFAULTS.fleet.cross_workspace,
    },
    models: { allowed: root.models?.allowed ?? [] },
    queue: { max_retries: root.queue?.max_retries ?? SETTINGS_DEFAULTS.queue.max_retries },
    timeouts: {
      dispatch_ack_ms: root.timeouts?.dispatch_ack_ms ?? SETTINGS_DEFAULTS.timeouts.dispatch_ack_ms,
      wait_ms: root.timeouts?.wait_ms ?? SETTINGS_DEFAULTS.timeouts.wait_ms,
      adapter_command_ms: root.timeouts?.adapter_command_ms ?? SETTINGS_DEFAULTS.timeouts.adapter_command_ms,
      notify_ms: root.timeouts?.notify_ms ?? SETTINGS_DEFAULTS.timeouts.notify_ms,
    },
    notify: root.notify ?? [],
    locked_commands: root.locked_commands ?? [],
    hosts: root.hosts ?? {},
    workspaces: root.workspaces ?? {},
  };
}

/** Load and validate `$orchDir/settings.json`. orch has NO built-in defaults: an absent
 * settings.json is a loud error naming the file and `orch setup`, never a silent empty
 * config. Use `loadConfigOrNull` only where first-run really must be distinguished. */
export function loadConfig(orchDir: string): OrchConfig {
  const config = loadConfigOrNull(orchDir);
  if (config === null) {
    throw new Error(`${settingsPath(orchDir)} does not exist — orch has no built-in configuration and does nothing by default.\nRun: orch setup`);
  }
  return config;
}

/** The declared JS runtime for this install. The ONE read of the runtime key — nothing
 * anywhere DERIVES this value from PATH, from `process.execPath`, or from an adapter's own
 * list. `src/doctor/runtime.ts` does detect the runtime actually executing orch, which is
 * not the same thing: it establishes reality in order to compare it against this
 * declaration. Detecting-to-verify is the point of the key; detecting-to-default would
 * defeat it, because a value inferred from reality can never disagree with reality. */
export function declaredRuntime(orchDir: string): OrchRuntime {
  return loadConfig(orchDir).runtime;
}

/** Manual reload trigger: touching this file reloads config without editing it. */
const RELOAD_SIGNAL_FILE = "reload.signal";

export interface ConfigWatchOptions {
  onChange: (config: OrchConfig) => void;
  onWarn?: (message: string) => void;
  debounceMs?: number;
  pollMs?: number;
};

export interface ConfigWatch {
  stop: () => void;
};

function triggersReload(filename: string | Buffer | null | undefined): boolean {
  return namesSettingsFile(filename) || filename?.toString() === RELOAD_SIGNAL_FILE;
}

/**
 * The ONE config watcher: watch settings.json and publish only configurations
 * that loaded cleanly. Every caller — the daemon and the CLI alike — uses this;
 * a second implementation drifts on exactly the properties that matter here
 * (whether it polls, whether it keeps a last-good, whether it repeats warnings).
 *
 * Watches the DIRECTORY, not the file: settings.json is written tmp+rename, so a
 * file watcher follows the old inode and goes deaf after the first write. The
 * stat poll is the backstop for platforms that drop directory events entirely.
 *
 * An invalid edit keeps the last-good config and warns once per distinct failure
 * — a config file saved broken mid-edit must not spam the log on every keystroke.
 */
export function watchConfig(orchDir: string, opts: ConfigWatchOptions): ConfigWatch {
  const { onChange, onWarn } = opts;
  const file = settingsPath(orchDir);
  const debounceMs = opts.debounceMs ?? 250;
  const pollMs = opts.pollMs ?? 5_000;
  let stopped = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let watcher: filesystem.FSWatcher | undefined;
  let lastStat = statSignature(file);
  let badState: string | undefined;

  // Keeping the last-good config is the absence of a call, not a cached copy:
  // a failed reload simply never reaches onChange, so the caller still holds
  // the last configuration that loaded cleanly.
  const reload = (): void => {
    debounceTimer = undefined;
    if (stopped) return;
    try {
      const config = loadConfig(orchDir);
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
    filesystem.mkdirSync(orchDir, { recursive: true });
    // The first load is deliberately unguarded: a config that cannot be read at
    // startup is fatal to the caller, not something to warn about and continue on.
    const initial = loadConfig(orchDir);
    watcher = filesystem.watch(orchDir, { persistent: false }, (_event, filename) => {
      if (triggersReload(filename)) scheduleReload();
    });
    watcher.on("error", (error: Error) => {
      if (!stopped) onWarn?.(errorMessage(error));
    });
    pollTimer = setInterval(poll, pollMs);
    pollTimer.unref();
    onChange(initial);
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

/** Model allowlist applied when `models.allowed` is unset. */
export const DEFAULT_ALLOWED_MODELS = ["openrouter/moonshotai/kimi-k2.7-code", "openrouter/x-ai/grok-4.5"];

/** Return the configured model-allowlist patterns, or the built-in defaults when unset or unreadable. */
export function allowedModelPatterns(orchDir: string): string[] {
  try {
    const patterns = loadConfig(orchDir).models.allowed;
    if (patterns.length) return patterns;
  } catch {
    // A malformed config falls back to the built-in allowlist rather than failing closed.
  }
  return DEFAULT_ALLOWED_MODELS;
}

/** Apply one schema-validated mutation to `$orchDir/settings.json` via whole-file JSON round-trip. An invalid composition (defaults outside the installed sets) never lands on disk — write `installed` before `defaults`. The write is tmp+rename so a crash mid-write cannot truncate settings.json — the config watcher only ever reads a complete file. */
function updateSettingsFile(orchDir: string, mutate: (root: Partial<SettingsFile>) => Partial<SettingsFile>): void {
  const file = settingsPath(orchDir);
  // The seed for a brand-new file is deliberately incomplete: `runtime` is required and has
  // no default, so setup must record it (writeSettingsRuntime) before any other write lands.
  const root: Partial<SettingsFile> = readSettingsFile(file) ?? { schemaVersion: SETTINGS_SCHEMA };
  const updated = SettingsFileSchema.parse(mutate(root));
  requireInstalledComposition(file, updated);
  filesystem.mkdirSync(orchDir, { recursive: true });
  const tmp = settingsTemporaryPath(file);
  filesystem.writeFileSync(tmp, JSON.stringify(updated, null, 2) + "\n");
  filesystem.renameSync(tmp, file);
}

/** Record the declared JS runtime as the top-level `runtime` key. Idempotent: re-recording the
 * same selection leaves the file byte-identical, and a different selection replaces the single
 * scalar in place — the shape has no room to accumulate a second runtime entry. */
export function writeSettingsRuntime(orchDir: string, runtime: OrchRuntime): void {
  updateSettingsFile(orchDir, (root) => ({ ...root, runtime }));
}

/** Upsert one string entry in the `defaults` section of settings.json. */
export function writeSettingsDefault(orchDir: string, key: "adapter" | "backend" | "model", value: string): void {
  updateSettingsFile(orchDir, (root) => ({ ...root, defaults: { ...root.defaults, [key]: value } }));
}

/** Record the setup-installed provider sets in settings.json. */
export function writeSettingsInstalled(orchDir: string, installed: { adapters: readonly string[]; backends: readonly string[] }): void {
  updateSettingsFile(orchDir, (root) => ({ ...root, installed: { adapters: [...installed.adapters], backends: [...installed.backends] } }));
}

/** Seed the complete settings tree while preserving every value already present. */
export function writeSettingsFullTree(orchDir: string): void {
  updateSettingsFile(orchDir, (root) => ({
    ...root,
    installed: root.installed ?? { adapters: [], backends: [] },
    defaults: { ...root.defaults, worktree: root.defaults?.worktree ?? SETTINGS_DEFAULTS.defaults.worktree },
    fleet: {
      spawn_cap: root.fleet?.spawn_cap ?? SETTINGS_DEFAULTS.fleet.spawn_cap,
      ...(root.fleet?.max_agents === undefined ? {} : { max_agents: root.fleet.max_agents }),
      workspace_caps: root.fleet?.workspace_caps ?? {},
      worker_peer_tools: root.fleet?.worker_peer_tools ?? SETTINGS_DEFAULTS.fleet.worker_peer_tools,
      cross_workspace: root.fleet?.cross_workspace ?? SETTINGS_DEFAULTS.fleet.cross_workspace,
    },
    models: { allowed: root.models?.allowed ?? [] },
    queue: { max_retries: root.queue?.max_retries ?? SETTINGS_DEFAULTS.queue.max_retries },
    timeouts: {
      dispatch_ack_ms: root.timeouts?.dispatch_ack_ms ?? SETTINGS_DEFAULTS.timeouts.dispatch_ack_ms,
      wait_ms: root.timeouts?.wait_ms ?? SETTINGS_DEFAULTS.timeouts.wait_ms,
      adapter_command_ms: root.timeouts?.adapter_command_ms ?? SETTINGS_DEFAULTS.timeouts.adapter_command_ms,
      notify_ms: root.timeouts?.notify_ms ?? SETTINGS_DEFAULTS.timeouts.notify_ms,
    },
    notify: root.notify ?? [],
    locked_commands: root.locked_commands ?? [],
    hosts: root.hosts ?? {},
    workspaces: root.workspaces ?? {},
  }));
}

/** Append setup-selected notifier entries to the settings.json `notify` array, skipping ids already configured. */
export function writeSettingsNotify(orchDir: string, entries: readonly NotifyEntry[]): void {
  updateSettingsFile(orchDir, (root) => {
    const existing = root.notify ?? [];
    const configured = new Set(existing.map((entry) => entry.id));
    const added = entries.filter((entry) => !configured.has(entry.id));
    return { ...root, notify: [...existing, ...added] };
  });
}
