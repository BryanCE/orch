import * as filesystem from "node:fs";
import * as path from "node:path";
import { z } from "zod";
// config.ts is a leaf module imported during almost every module graph's init
// (notify.ts → config.ts among others). It must never import the provider
// registries — they evaluate every concrete adapter/backend, re-entering this
// graph mid-initialization. The closed id sets live in the pure port modules.
import { ADAPTER_IDS, type AdapterId } from "./adapters/adapter.ts";
import { BACKEND_IDS, HERDR_SINK_ID, type BackendId } from "./backends/backend.ts";
import { TILE_FIRST_SPLITS, type TileFirstSplit } from "./backends/tiling.ts";
import { ORCH_RUNTIMES, type OrchRuntime } from "./runtime.ts";
import { errorMessage } from "./util.ts";

/** The one settings.json schema version. This stays 1 until the project owner
 * says otherwise — DO NOT BUMP IT, ever, for any shape change. Pre-publish there
 * is no legacy support: exactly ONE live schema, no reader accepts two, a file
 * with any other version is invalid and recreated by `orch setup`. On a shape
 * change, alter the one live schema below and fix every writer/reader/test in
 * the same commit; the stamp itself does not move. */
export const SETTINGS_SCHEMA = 2;

const PositiveInt = z.number().int().positive();

const HostSchema = z.strictObject({
  /** SSH destination (for example, user@example.org). */
  dest: z.string().min(1),
  orch_dir: z.string().optional(),
  timeout_ms: z.number().int().positive().optional(),
});

export const NOTIFY_STATES = ["idle", "working", "blocked", "done", "error", "aborted", "exited", "unknown"] as const;
export type NotifyState = (typeof NOTIFY_STATES)[number];
/** The states a notify entry delivers on when it declares no `on` list of its own. */
export const NOTIFY_DEFAULT_ON: readonly NotifyState[] = ["blocked", "error"];
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
      z.tuple([z.string().min(1)], z.string()),
    ]),
  }),
  z.strictObject({ id: z.literal(HERDR_SINK_ID), on: NotifyOnSchema }),
]);
export type NotifyEntry = z.infer<typeof NotifyEntrySchema>;

export const SETTINGS_DEFAULTS = {
  fleet: { spawn_cap: 8, worker_peer_tools: false, cross_workspace: false },
  queue: { max_retries: 1 },
  timeouts: { dispatch_ack_ms: 10_000, wait_ms: 300_000, adapter_command_ms: 60_000, notify_ms: 3_000 },
  defaults: { worktree: false },
  daemon: { tcp_port: 3716, idle_shutdown_minutes: 30 },
  workers: { inherit_extensions: true, builtin_tools: true },
  tiling: { first_split: "rows" },
  // Writing into a user's harness directories needs their say-so, so setup asks and
  // records the answer here. Both roots ship the same skills: `.claude` is Claude Code's
  // own, `.agents` is the cross-harness convention every other harness reads.
  skills: { install: true, roots: ["~/.claude/skills", "~/.agents/skills"] },
} as const;

/** The full contract for `$ORCH_DIR/settings.json` — user-editable, whole-file
 * JSON round-trip, schemaVersion-stamped, validated loudly on every load. */
const SettingsFileSchema = z.strictObject({
  schemaVersion: z.literal(SETTINGS_SCHEMA),
  /** The JS runtime this install executes under — a REQUIRED top-level scalar, chosen at
   * `orch setup`. Not a member of `defaults` (no spawn may pick its own runtime) and not
   * an `enabled` set (exactly one runtime executes an install). Never defaulted on read. */
  runtime: z.enum(ORCH_RUNTIMES),
  /** Providers whose integrations setup enabled; any of them can be spawned. */
  enabled: z.strictObject({
    adapters: z.array(z.enum(ADAPTER_IDS)),
    backends: z.array(z.enum(BACKEND_IDS)),
  }).optional(),
  defaults: z.strictObject({
    adapter: z.enum(ADAPTER_IDS).optional(),
    backend: z.enum(BACKEND_IDS).optional(),
    /** One model per harness: each names models in its own vocabulary, so a single
     *  string can only ever be launchable by one of them. */
    models: z.partialRecord(z.enum(ADAPTER_IDS), z.string()).optional(),
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
    /** The launch gate PER HARNESS: a spawn is refused unless its model matches one of
     *  these patterns. A pattern is written in that harness's own vocabulary, so one
     *  shared list could only ever restrict one of them. Empty allows every offered model. */
    allowed: z.partialRecord(z.enum(ADAPTER_IDS), z.array(z.string())).optional(),
    /** The quicklist PER HARNESS, passed to that harness's native cycle/picker and nothing
     *  else. It never gates a launch: a model outside it stays launchable. Empty passes none. */
    preferred: z.partialRecord(z.enum(ADAPTER_IDS), z.array(z.string())).optional(),
  }).optional(),
  /** What a spawned worker loads. Inherits the user's own harness setup by default;
   * name the extensions that misbehave under concurrency rather than dropping all. */
  workers: z.strictObject({
    inherit_extensions: z.boolean().optional(),
    exclude_extensions: z.array(z.string()).optional(),
    builtin_tools: z.boolean().optional(),
    allow_tools: z.array(z.string()).optional(),
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
  daemon: z.strictObject({
    tcp_port: PositiveInt.optional(),
    /** Minutes of no live agents, no subscribers, and no RPC before orchd exits; 0 = never. */
    idle_shutdown_minutes: z.number().int().min(0).optional(),
  }).optional(),
  /** How a tab lays its agents out. `first_split` runs the tab's opening split;
   * every split after it halves the biggest pane's longer side regardless. */
  tiling: z.strictObject({
    first_split: z.enum(TILE_FIRST_SPLITS).optional(),
  }).optional(),
  /** Whether orch may copy its packaged skills into the user's harness directories, and
   * where. Setup asks before the first install and records the answer; a user who wants
   * to manage the files themselves turns `install` off and orch never writes them again. */
  skills: z.strictObject({
    install: z.boolean().optional(),
    roots: z.array(z.string().min(1)).optional(),
  }).optional(),
});

export type SettingsFile = z.infer<typeof SettingsFileSchema>;
export type HostConfig = z.infer<typeof HostSchema>;

/** Settings normalized for consumers: every section present and defaults applied. */
export interface OrchConfig {
  runtime: OrchRuntime;
  enabled: { adapters: AdapterId[]; backends: BackendId[] };
  defaults: { adapter?: AdapterId; backend?: BackendId; models: Partial<Record<AdapterId, string>>; worktree: boolean };
  fleet: { spawn_cap: number; max_agents?: number; workspace_caps: Record<string, number>; worker_peer_tools: boolean; cross_workspace: boolean };
  models: { allowed: Partial<Record<AdapterId, string[]>>; preferred: Partial<Record<AdapterId, string[]>> };
  workers: { inherit_extensions: boolean; exclude_extensions: string[]; builtin_tools: boolean; allow_tools: string[] };
  queue: { max_retries: number };
  timeouts: { dispatch_ack_ms: number; wait_ms: number; adapter_command_ms: number; notify_ms: number };
  notify: NotifyEntry[];
  locked_commands: string[];
  hosts: Record<string, HostConfig>;
  workspaces: Record<string, string>;
  daemon: { tcp_port: number; idle_shutdown_minutes: number };
  tiling: { first_split: TileFirstSplit };
  skills: { install: boolean; roots: string[] };
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

function valueAtPath(root: unknown, path: readonly PropertyKey[]): unknown {
  let cursor: unknown = root;
  for (const step of path) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<PropertyKey, unknown>)[step];
  }
  return cursor;
}

/** Describe a rejected provider id so the operator sees the value and the closed set,
 *  never a raw enum dump. `enabled.adapters[0]` and `defaults.adapter` both name one adapter. */
function unknownProviderId(root: unknown, path: readonly PropertyKey[]):
  { noun: string; at: string; found: unknown; supported: readonly string[] } | null {
  const supported = { adapter: ADAPTER_IDS, adapters: ADAPTER_IDS, backend: BACKEND_IDS, backends: BACKEND_IDS };
  const key = String(path[1] ?? "");
  if (!Object.hasOwn(supported, key)) return null;
  return {
    noun: key.replace(/s$/, ""),
    at: path.join("."),
    found: valueAtPath(root, path),
    supported: supported[key as keyof typeof supported],
  };
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
    const provider = result.error.issues.map((issue) => unknownProviderId(root, issue.path)).find(Boolean);
    if (provider) {
      throw new Error(`${file}: ${provider.at}: unknown ${provider.noun} ${JSON.stringify(provider.found)} - supported ${provider.noun}s: ${provider.supported.join(", ")}\nRun: orch setup`);
    }
    throw new Error(`${file}: this settings file has invalid values:\n${z.prettifyError(result.error)}\nFix those keys by hand, or re-record the file with: orch setup`);
  }
  return result.data;
}

/** Move an unreadable `settings.json` aside so `orch setup` can re-record from scratch, and
 * return the backup path; null when the file is absent or already readable. Pre-publish, a file
 * from an older schema is malformed data rather than something to migrate (Rule 8) — setup reaps
 * it. This is the ONE place that does so, and it is never reached by an ordinary command. */
export function reapUnreadableSettings(orchDir: string, suffix = "invalid"): string | null {
  const file = settingsPath(orchDir);
  if (!filesystem.existsSync(file)) return null;
  try {
    readSettingsFile(file);
    return null;
  } catch {
    const backup = `${file}.${suffix}`;
    filesystem.rmSync(backup, { force: true });
    filesystem.renameSync(file, backup);
    return backup;
  }
}

/** Reject defaults outside the enabled sets — composition validation the pure schema can't do.
 *  Unknown ids never reach here: the schema's enums are the closed provider sets. */
function requireEnabledComposition(file: string, root: SettingsFile): void {
  const enabled = root.enabled ?? { adapters: [], backends: [] };
  const adapter = root.defaults?.adapter;
  if (adapter !== undefined && !enabled.adapters.includes(adapter)) {
    throw new Error(`${file}: defaults.adapter: "${adapter}" is not an enabled adapter - enabled: ${enabled.adapters.join(", ") || "(none)"}; re-run orch setup`);
  }
  const backend = root.defaults?.backend;
  if (backend !== undefined && !enabled.backends.includes(backend)) {
    throw new Error(`${file}: defaults.backend: "${backend}" is not an enabled backend - enabled: ${enabled.backends.join(", ") || "(none)"}; re-run orch setup`);
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
      throw new Error(`${legacy}: legacy config.toml detected - settings now live in ${file}; re-run orch setup (the old values are not read)`);
    }
    return null;
  }
  requireEnabledComposition(file, root);
  return {
    runtime: root.runtime,
    enabled: { adapters: root.enabled?.adapters ?? [], backends: root.enabled?.backends ?? [] },
    defaults: { ...root.defaults, models: root.defaults?.models ?? {}, worktree: root.defaults?.worktree ?? SETTINGS_DEFAULTS.defaults.worktree },
    fleet: {
      spawn_cap: root.fleet?.spawn_cap ?? SETTINGS_DEFAULTS.fleet.spawn_cap,
      max_agents: root.fleet?.max_agents,
      workspace_caps: root.fleet?.workspace_caps ?? {},
      worker_peer_tools: root.fleet?.worker_peer_tools ?? SETTINGS_DEFAULTS.fleet.worker_peer_tools,
      cross_workspace: root.fleet?.cross_workspace ?? SETTINGS_DEFAULTS.fleet.cross_workspace,
    },
    models: { allowed: root.models?.allowed ?? {}, preferred: root.models?.preferred ?? {} },
    workers: {
      inherit_extensions: root.workers?.inherit_extensions ?? SETTINGS_DEFAULTS.workers.inherit_extensions,
      exclude_extensions: root.workers?.exclude_extensions ?? [],
      builtin_tools: root.workers?.builtin_tools ?? SETTINGS_DEFAULTS.workers.builtin_tools,
      allow_tools: root.workers?.allow_tools ?? [],
    },
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
    daemon: {
      tcp_port: root.daemon?.tcp_port ?? SETTINGS_DEFAULTS.daemon.tcp_port,
      idle_shutdown_minutes: root.daemon?.idle_shutdown_minutes ?? SETTINGS_DEFAULTS.daemon.idle_shutdown_minutes,
    },
    tiling: { first_split: root.tiling?.first_split ?? SETTINGS_DEFAULTS.tiling.first_split },
    skills: {
      install: root.skills?.install ?? SETTINGS_DEFAULTS.skills.install,
      roots: root.skills?.roots ?? [...SETTINGS_DEFAULTS.skills.roots],
    },
  };
}

/** Load and validate `$orchDir/settings.json`. orch has NO built-in defaults: an absent
 * settings.json is a loud error naming the file and `orch setup`, never a silent empty
 * config. Use `loadConfigOrNull` only where first-run really must be distinguished. */
/** A non-throwing settings load used only by setup recovery. Missing is a clean null;
 * malformed data returns its validation error so setup can reap the whole file. */
export function tryLoadSettings(orchDir: string): { config: OrchConfig | null; error: Error | null } {
  try {
    return { config: loadConfigOrNull(orchDir), error: null };
  } catch (error: unknown) {
    return { config: null, error: error instanceof Error ? error : new Error(errorMessage(error)) };
  }
}

export function loadConfig(orchDir: string): OrchConfig {
  const config = loadConfigOrNull(orchDir);
  if (config === null) {
    throw new Error(`${settingsPath(orchDir)} does not exist - orch has no built-in configuration and does nothing by default.\nRun: orch setup`);
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

/**
 * Configured model-allowlist patterns, empty when the user set none.
 *
 * Empty means EVERY model that harness offers is allowed. Orch ships no built-in
 * allowlist: a hardcoded default silently pinned every spawn to the one family that
 * happened to be listed, and an orchestrator could not tell a rejected model from an
 * applied one. Restricting models is an explicit `models.allowed` opt-in, per harness.
 */
export function allowedModelPatterns(orchDir: string, harness: AdapterId): string[] {
  try {
    return loadConfig(orchDir).models.allowed[harness] ?? [];
  } catch {
    // A malformed config restricts nothing; the write path still reports failures.
    return [];
  }
}

/** Drop the harnesses whose list is empty: for both model maps an empty list means the same
 *  thing as no entry, and recording `[]` leaves settings.json claiming a selection nobody made. */
function withoutEmptyLists(lists: Partial<Record<AdapterId, string[]>>): Partial<Record<AdapterId, string[]>> {
  const kept: Partial<Record<AdapterId, string[]>> = {};
  for (const [harness, models] of Object.entries(lists) as [AdapterId, string[] | undefined][]) {
    if (models?.length) kept[harness] = models;
  }
  return kept;
}

/** Record which models each harness may launch, replacing any previous set. */
export function writeSettingsAllowedModels(orchDir: string, allowed: Partial<Record<AdapterId, string[]>>): void {
  updateSettingsFile(orchDir, (root) => ({ ...root, models: { ...root.models, allowed: withoutEmptyLists(allowed) } }));
}

/** Record the preferred quicklist each harness exposes to its native picker. */
export function writeSettingsPreferredModels(orchDir: string, preferred: Partial<Record<AdapterId, string[]>>): void {
  updateSettingsFile(orchDir, (root) => ({ ...root, models: { ...root.models, preferred: withoutEmptyLists(preferred) } }));
}

/** Apply one schema-validated mutation to `$orchDir/settings.json` via whole-file JSON round-trip. An invalid composition (defaults outside the enabled sets) never lands on disk — write `enabled` before `defaults`. The write is tmp+rename so a crash mid-write cannot truncate settings.json — the config watcher only ever reads a complete file. */
function updateSettingsFile(orchDir: string, mutate: (root: Partial<SettingsFile>) => Partial<SettingsFile>): void {
  const file = settingsPath(orchDir);
  // The seed for a brand-new file is deliberately incomplete: `runtime` is required and has
  // no default, so setup must record it (writeSettingsRuntime) before any other write lands.
  const root: Partial<SettingsFile> = readSettingsFile(file) ?? { schemaVersion: SETTINGS_SCHEMA };
  const updated = SettingsFileSchema.parse(mutate(root));
  requireEnabledComposition(file, updated);
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
export function writeSettingsDefault(orchDir: string, key: "adapter", value: AdapterId): void;
export function writeSettingsDefault(orchDir: string, key: "backend", value: BackendId): void;
export function writeSettingsDefault(orchDir: string, key: "adapter" | "backend", value: string): void {
  updateSettingsFile(orchDir, (root) => ({ ...root, defaults: { ...root.defaults, [key]: value } }));
}

/** Record the model each enabled harness launches on, replacing any previous set. */
export function writeSettingsModels(orchDir: string, models: Partial<Record<AdapterId, string>>): void {
  updateSettingsFile(orchDir, (root) => ({ ...root, defaults: { ...root.defaults, models: { ...models } } }));
}

/** Record the user's answer to "may orch write its skills into your harness directories?"
 *  and, when they named them, which directories. */
export function writeSettingsSkills(orchDir: string, skills: { install: boolean; roots?: readonly string[] }): void {
  updateSettingsFile(orchDir, (root) => ({
    ...root,
    skills: { install: skills.install, roots: [...(skills.roots ?? root.skills?.roots ?? SETTINGS_DEFAULTS.skills.roots)] },
  }));
}

/** Record the setup-enabled provider sets in settings.json. */
export function writeSettingsEnabled(orchDir: string, enabled: { adapters: readonly AdapterId[]; backends: readonly BackendId[] }): void {
  updateSettingsFile(orchDir, (root) => ({ ...root, enabled: { adapters: [...enabled.adapters], backends: [...enabled.backends] } }));
}

/** Seed the complete settings tree while preserving every value already present. */
export function writeSettingsFullTree(orchDir: string): void {
  updateSettingsFile(orchDir, (root) => ({
    ...root,
    enabled: root.enabled ?? { adapters: [], backends: [] },
    defaults: { ...root.defaults, models: root.defaults?.models ?? {}, worktree: root.defaults?.worktree ?? SETTINGS_DEFAULTS.defaults.worktree },
    fleet: {
      spawn_cap: root.fleet?.spawn_cap ?? SETTINGS_DEFAULTS.fleet.spawn_cap,
      ...(root.fleet?.max_agents === undefined ? {} : { max_agents: root.fleet.max_agents }),
      workspace_caps: root.fleet?.workspace_caps ?? {},
      worker_peer_tools: root.fleet?.worker_peer_tools ?? SETTINGS_DEFAULTS.fleet.worker_peer_tools,
      cross_workspace: root.fleet?.cross_workspace ?? SETTINGS_DEFAULTS.fleet.cross_workspace,
    },
    models: { allowed: root.models?.allowed ?? {}, preferred: root.models?.preferred ?? {} },
    workers: {
      inherit_extensions: root.workers?.inherit_extensions ?? SETTINGS_DEFAULTS.workers.inherit_extensions,
      exclude_extensions: root.workers?.exclude_extensions ?? [],
      builtin_tools: root.workers?.builtin_tools ?? SETTINGS_DEFAULTS.workers.builtin_tools,
      allow_tools: root.workers?.allow_tools ?? [],
    },
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
    daemon: {
      tcp_port: root.daemon?.tcp_port ?? SETTINGS_DEFAULTS.daemon.tcp_port,
      idle_shutdown_minutes: root.daemon?.idle_shutdown_minutes ?? SETTINGS_DEFAULTS.daemon.idle_shutdown_minutes,
    },
    tiling: { first_split: root.tiling?.first_split ?? SETTINGS_DEFAULTS.tiling.first_split },
    skills: {
      install: root.skills?.install ?? SETTINGS_DEFAULTS.skills.install,
      roots: root.skills?.roots ?? [...SETTINGS_DEFAULTS.skills.roots],
    },
  }));
}

/** Upsert notifier entries into the settings.json `notify` array, keyed by sink id: an id
 *  already configured is replaced where it sits, a new one is appended. One sink id, one entry. */
export function writeSettingsNotify(orchDir: string, entries: readonly NotifyEntry[]): void {
  updateSettingsFile(orchDir, (root) => {
    const written = new Map(entries.map((entry) => [entry.id, entry]));
    const upserted = (root.notify ?? []).map((entry) => written.get(entry.id) ?? entry);
    const configured = new Set(upserted.map((entry) => entry.id));
    return { ...root, notify: [...upserted, ...entries.filter((entry) => !configured.has(entry.id))] };
  });
}

/** Drop the `notify` entry for one sink id. Callers gate on it being configured. */
export function deleteSettingsNotify(orchDir: string, id: NotifyEntry["id"]): void {
  updateSettingsFile(orchDir, (root) => ({ ...root, notify: (root.notify ?? []).filter((entry) => entry.id !== id) }));
}
