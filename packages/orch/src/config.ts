import * as filesystem from "node:fs";
import * as path from "node:path";
import { z } from "zod";
// config.ts is a leaf module imported during almost every module graph's init
// (notify.ts → config.ts among others). It must never import the provider
// registries — they evaluate every concrete adapter/backend, re-entering this
// graph mid-initialization. The closed id sets live in the pure port modules.
import { ADAPTER_IDS } from "./types/adapter.ts";
import { HERDR_SINK_ID } from "./backends/backend.ts";
import { BACKEND_IDS, TILE_FIRST_SPLITS } from "./types/backend.ts";
import { THINKING_LEVELS } from "./types/policy.ts";
import { ORCH_RUNTIMES, type OrchRuntime } from "./runtimes.ts";
import { ensurePrivateDir, errnoCode, errorMessage, isRecord } from "./util.ts";
import { isLogLevel } from "./log.ts";
import type { BackendId } from "./types/backend.ts";
import type { AdapterId } from "./types/adapter.ts";
import type { ThinkingLevel } from "./types/policy.ts";
import { NOTIFY_STATES, type ConfigWatch, type ConfigWatchOptions, type NotifyEntry, type NotifyState, type OrchConfig, type SettingSource } from "./types/config.ts";
import type { LogLevel } from "./types/core.ts";

/** The one settings.json schema version. Pre-publish there is no legacy support:
 * exactly ONE live schema, no reader accepts two, and a file with any other version is
 * invalid and recreated by `orch setup`. This stamp is 1 and DOES NOT MOVE (CLAUDE.md
 * Rule 14): nothing has published, so there is no installed base to version against.
 * On a shape change, fix every writer/reader/test — never the number. */
export const SETTINGS_SCHEMA = 1;

const PositiveInt = z.number().int().positive();

export const HostSchema = z.strictObject({
  /** SSH destination (for example, user@example.org). */
  dest: z.string().min(1),
  orch_dir: z.string().optional(),
  timeout_ms: z.number().int().positive().optional(),
});

/** The states a notify entry delivers on when it declares no `on` list of its own:
 *  work needs you, work broke, work finished. A notifier silent on `done` never
 *  tells you the thing you were waiting for. */
export const NOTIFY_DEFAULT_ON: readonly NotifyState[] = ["blocked", "error", "done"];
const NotifyOnSchema = z.array(z.enum(NOTIFY_STATES)).optional();
export const NotifyEntrySchema = z.discriminatedUnion("id", [
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

/** Every sink id, read off the schema so nothing re-lists the union. A sink named
 *  for a plexer must not put that plexer's name in core (Rule 10). */
export const NOTIFY_IDS: readonly string[] = NotifyEntrySchema.options.map((option) => option.shape.id.value);

export const SETTINGS_DEFAULTS = {
  fleet: { max_agents_per_pack: 10, max_depth: 1, worker_peer_tools: false, cross_space: false },
  queue: { max_retries: 1 },
  retention: { ended_agents_days: 90, queue_days: 14, events_days: 7, runs_days: 30, outbox_days: 7, logs_days: 7 },
  logging: { level: "info" },
  timeouts: { dispatch_ack_ms: 10_000, wait_ms: 300_000, adapter_command_ms: 60_000, notify_ms: 3_000 },
  defaults: { worktree: false, thinking: "medium", thinking_by_harness: {} },
  daemon: { tcp_port: 3716, idle_shutdown_minutes: 30 },
  doctor: { unclaimed_after_ms: 120_000 },
  workers: { inherit_extensions: true, builtin_tools: true },
  tiling: { first_split: "rows" },
  // Writing into a user's harness directories needs their say-so, so setup asks and
  // records the answer here. Both roots ship the same skills: `.claude` is Claude Code's
  // own, `.agents` is the cross-harness convention every other harness reads.
  skills: { install: true, roots: ["~/.claude/skills", "~/.agents/skills"] },
} as const;

/** The full contract for `$ORCH_DIR/settings.json` — user-editable, whole-file
 * JSON round-trip, schemaVersion-stamped, validated loudly on every load. */
export const SETTINGS_FILE_SCHEMA = z.strictObject({
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
    thinking: z.enum(THINKING_LEVELS).optional(),
    thinking_by_harness: z.partialRecord(z.enum(ADAPTER_IDS), z.enum(THINKING_LEVELS)).optional(),
    worktree: z.boolean().optional(),
  }).optional(),
  fleet: z.strictObject({
    max_agents_per_pack: PositiveInt.optional(),
    /** How deep a provenance tree may grow by spawning: 1 = only a root may spawn
     *  (a slave calling `orch spawn` is refused); N lets an agent at depth < N spawn.
     */
    max_depth: PositiveInt.optional(),
    max_agents_total: PositiveInt.optional(),
    max_agents_per_space: z.record(z.string(), PositiveInt).optional(),
    worker_peer_tools: z.boolean().optional(),
    cross_space: z.boolean().optional(),
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
  /** Retention windows in days for ended agents, settled queue tasks, stored events,
   * completed runs, delivered outbox messages, and logs. */
  logging: z.strictObject({ level: z.enum(["error", "warn", "info", "debug", "trace"]).optional() }).optional(),
  retention: z.strictObject({
    /** Ended agent records and presence directories older than this many days. */
    ended_agents_days: PositiveInt.optional(),
    /** Settled queue tasks older than this many days. */
    queue_days: PositiveInt.optional(),
    /** Stored events older than this many days. */
    events_days: PositiveInt.optional(),
    /** Completed runs older than this many days. */
    runs_days: PositiveInt.optional(),
    /** Delivered outbox messages older than this many days. */
    outbox_days: PositiveInt.optional(),
    /** Headless log files older than this many days. */
    logs_days: PositiveInt.optional(),
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
  spaces: z.record(z.string(), z.string()).optional(),
  daemon: z.strictObject({
    tcp_port: PositiveInt.optional(),
    /** Minutes of no live agents, no subscribers, and no RPC before orchd exits; 0 = never. */
    idle_shutdown_minutes: z.number().int().min(0).optional(),
  }).optional(),
  doctor: z.strictObject({
    /** Milliseconds an agent may remain unclaimed after spawn before doctor reports it. */
    unclaimed_after_ms: PositiveInt.optional(),
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

type SettingsFile = z.infer<typeof SETTINGS_FILE_SCHEMA>;

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
    cursor = Object.getOwnPropertyDescriptor(cursor, step)?.value;
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
  const supportedIds = key === "adapter" || key === "adapters"
    ? supported.adapter
    : key === "backend" || key === "backends"
      ? supported.backend
      : undefined;
  if (supportedIds === undefined) return null;
  return {
    noun: key.replace(/s$/, ""),
    at: path.join("."),
    found: valueAtPath(root, path),
    supported: supportedIds,
  };
}

/** Parse and schema-validate `settings.json`, or null when the file is absent. Throws loudly on any defect. */
function readSettingsFile(file: string): SettingsFile | null {
  let text: string;
  try {
    text = filesystem.readFileSync(file, "utf8");
  } catch (error: unknown) {
    if (errnoCode(error) === "ENOENT") return null;
    throw error;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error: unknown) {
    throw new Error(`${file}: expected valid JSON, found ${errorMessage(error)}`);
  }
  const result = SETTINGS_FILE_SCHEMA.safeParse(parsed);
  if (!result.success) {
    // Every rejection below is rendered as plain guidance naming the file, what is wrong, and
    // the exact command that fixes it. A raw zod issue dump never reaches the operator.
    const root = isRecord(parsed) ? parsed : null;
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

/** Keep section extractors declarative; each field follows the same absent-value rule. */
function configuredOr<T>(value: T | undefined, fallback: T): T {
  return value ?? fallback;
}

/** Extract each settings section independently so adding a field cannot grow one branch ladder. */
const configValueExtractors = {
  defaults: (root: Partial<SettingsFile>) => ({
    ...root.defaults,
    models: root.defaults?.models ?? {},
    thinking: root.defaults?.thinking ?? SETTINGS_DEFAULTS.defaults.thinking,
    thinking_by_harness: root.defaults?.thinking_by_harness ?? {},
    worktree: root.defaults?.worktree ?? SETTINGS_DEFAULTS.defaults.worktree,
  }),
  fleet: (root: Partial<SettingsFile>) => ({
    max_agents_per_pack: root.fleet?.max_agents_per_pack ?? SETTINGS_DEFAULTS.fleet.max_agents_per_pack,
    max_depth: root.fleet?.max_depth ?? SETTINGS_DEFAULTS.fleet.max_depth,
    max_agents_total: root.fleet?.max_agents_total,
    max_agents_per_space: root.fleet?.max_agents_per_space ?? {},
    worker_peer_tools: root.fleet?.worker_peer_tools ?? SETTINGS_DEFAULTS.fleet.worker_peer_tools,
    cross_space: root.fleet?.cross_space ?? SETTINGS_DEFAULTS.fleet.cross_space,
  }),
  models: (root: Partial<SettingsFile>) => ({ allowed: root.models?.allowed ?? {}, preferred: root.models?.preferred ?? {} }),
  workers: (root: Partial<SettingsFile>) => ({
    inherit_extensions: root.workers?.inherit_extensions ?? SETTINGS_DEFAULTS.workers.inherit_extensions,
    exclude_extensions: root.workers?.exclude_extensions ?? [],
    builtin_tools: root.workers?.builtin_tools ?? SETTINGS_DEFAULTS.workers.builtin_tools,
    allow_tools: root.workers?.allow_tools ?? [],
  }),
  queue: (root: Partial<SettingsFile>) => ({ max_retries: root.queue?.max_retries ?? SETTINGS_DEFAULTS.queue.max_retries }),
  logging: (root: Partial<SettingsFile>) => ({ level: root.logging?.level ?? SETTINGS_DEFAULTS.logging.level }),
  retention: (root: Partial<SettingsFile>) => ({
    ended_agents_days: configuredOr(root.retention?.ended_agents_days, SETTINGS_DEFAULTS.retention.ended_agents_days),
    queue_days: configuredOr(root.retention?.queue_days, SETTINGS_DEFAULTS.retention.queue_days),
    events_days: configuredOr(root.retention?.events_days, SETTINGS_DEFAULTS.retention.events_days),
    runs_days: configuredOr(root.retention?.runs_days, SETTINGS_DEFAULTS.retention.runs_days),
    outbox_days: configuredOr(root.retention?.outbox_days, SETTINGS_DEFAULTS.retention.outbox_days),
    logs_days: configuredOr(root.retention?.logs_days, SETTINGS_DEFAULTS.retention.logs_days),
  }),
  timeouts: (root: Partial<SettingsFile>) => ({
    dispatch_ack_ms: root.timeouts?.dispatch_ack_ms ?? SETTINGS_DEFAULTS.timeouts.dispatch_ack_ms,
    wait_ms: root.timeouts?.wait_ms ?? SETTINGS_DEFAULTS.timeouts.wait_ms,
    adapter_command_ms: root.timeouts?.adapter_command_ms ?? SETTINGS_DEFAULTS.timeouts.adapter_command_ms,
    notify_ms: root.timeouts?.notify_ms ?? SETTINGS_DEFAULTS.timeouts.notify_ms,
  }),
  notify: (root: Partial<SettingsFile>) => root.notify ?? [],
  locked_commands: (root: Partial<SettingsFile>) => root.locked_commands ?? [],
  hosts: (root: Partial<SettingsFile>) => root.hosts ?? {},
  spaces: (root: Partial<SettingsFile>) => root.spaces ?? {},
  daemon: (root: Partial<SettingsFile>) => ({
    tcp_port: root.daemon?.tcp_port ?? SETTINGS_DEFAULTS.daemon.tcp_port,
    idle_shutdown_minutes: root.daemon?.idle_shutdown_minutes ?? SETTINGS_DEFAULTS.daemon.idle_shutdown_minutes,
  }),
  doctor: (root: Partial<SettingsFile>) => ({
    unclaimed_after_ms: root.doctor?.unclaimed_after_ms ?? SETTINGS_DEFAULTS.doctor.unclaimed_after_ms,
  }),
  tiling: (root: Partial<SettingsFile>) => ({ first_split: root.tiling?.first_split ?? SETTINGS_DEFAULTS.tiling.first_split }),
  skills: (root: Partial<SettingsFile>) => ({
    install: root.skills?.install ?? SETTINGS_DEFAULTS.skills.install,
    roots: root.skills?.roots ?? [...SETTINGS_DEFAULTS.skills.roots],
  }),
};

/** Fill every settings section that has a built-in value, preserving user entries. */
function configValues(root: Partial<SettingsFile>): Omit<OrchConfig, "runtime" | "enabled"> {
  return {
    defaults: configValueExtractors.defaults(root),
    fleet: configValueExtractors.fleet(root),
    models: configValueExtractors.models(root),
    workers: configValueExtractors.workers(root),
    queue: configValueExtractors.queue(root),
    retention: configValueExtractors.retention(root),
    logging: configValueExtractors.logging(root),
    timeouts: configValueExtractors.timeouts(root),
    notify: configValueExtractors.notify(root),
    locked_commands: configValueExtractors.locked_commands(root),
    hosts: configValueExtractors.hosts(root),
    spaces: configValueExtractors.spaces(root),
    daemon: configValueExtractors.daemon(root),
    doctor: configValueExtractors.doctor(root),
    tiling: configValueExtractors.tiling(root),
    skills: configValueExtractors.skills(root),
  };
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
    ...configValues(root),
  };
}

/** Load and validate `$orchDir/settings.json`. orch has NO built-in defaults: an absent
 * settings.json is a loud error naming the file and `orch setup`, never a silent empty
 * config. Use `loadConfigOrNull` only where first-run really must be distinguished. */
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
    ensurePrivateDir(orchDir);
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

function hasFallbackShape<T>(value: unknown, fallback: T): value is T {
  if (typeof fallback === "number") return typeof value === "number";
  if (typeof fallback === "boolean") return typeof value === "boolean";
  if (typeof fallback === "string") return typeof value === "string";
  if (Array.isArray(fallback)) return Array.isArray(value);
  return isRecord(fallback) && isRecord(value);
}

function coerceEnvironment<T>(value: string, fallback: T, name: string): T {
  let converted: unknown = value;
  if (typeof fallback === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`${name}: expected number, found ${JSON.stringify(value)}`);
    converted = parsed;
  } else if (typeof fallback === "boolean") {
    if (value === "true" || value === "1") converted = true;
    else if (value === "false" || value === "0") converted = false;
    else throw new Error(`${name}: expected boolean, found ${JSON.stringify(value)}`);
  }
  if (!hasFallbackShape(converted, fallback)) {
    const expected = fallback === null ? "null" : typeof fallback;
    throw new Error(`${name}: expected ${expected}, found ${JSON.stringify(value)}`);
  }
  return converted;
}

/** Resolve a setting with its winning source. The ONE precedence order — flag > env > settings.json > default; `resolveSetting` delegates here so the two can never drift. */
export function resolveWithSource<T>(opts: { flag?: T; env?: string; config?: unknown; fallback: T }): { value: T; source: SettingSource } {
  if (opts.flag !== undefined) return { value: opts.flag, source: "flag" };
  if (opts.env) {
    const value = process.env[opts.env];
    if (value !== undefined) return { value: coerceEnvironment(value, opts.fallback, opts.env), source: "env" };
  }
  if (opts.config !== undefined && hasFallbackShape(opts.config, opts.fallback)) {
    return { value: opts.config, source: "settings.json" };
  }
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
  for (const harness of ADAPTER_IDS) {
    const models = lists[harness];
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
  const updated = SETTINGS_FILE_SCHEMA.parse(mutate(root));
  requireEnabledComposition(file, updated);
  ensurePrivateDir(orchDir);
  const tmp = settingsTemporaryPath(file);
  filesystem.writeFileSync(tmp, JSON.stringify(updated, null, 2) + "\n");
  filesystem.renameSync(tmp, file);
}

function setSettingsPath(root: Partial<SettingsFile>, segments: readonly string[], value: unknown): Partial<SettingsFile> {
  const candidate: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(root)) candidate[key] = entry;
  const first = segments[0];
  if (first === undefined) throw new Error("settings key must not be empty");
  let cursor = candidate;
  for (const segment of segments.slice(0, -1)) {
    const existing = cursor[segment];
    const next: Record<string, unknown> = {};
    if (existing !== null && typeof existing === "object" && !Array.isArray(existing)) {
      for (const [key, entry] of Object.entries(existing)) next[key] = entry;
    }
    cursor[segment] = next;
    cursor = next;
  }
  const last = segments.at(-1);
  if (last === undefined) throw new Error("settings key must not be empty");
  cursor[last] = value;
  return SETTINGS_FILE_SCHEMA.parse(candidate);
}

/** Write one schema setting through the same whole-file validator as every specialised writer. */
export function writeSettingsValue(orchDir: string, key: string, value: unknown): void {
  const segments = key.split(".");
  updateSettingsFile(orchDir, (root) => setSettingsPath(root, segments, value));
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

/**
 * Record the thinking effort a launch uses when nothing overrides it.
 *
 * Thinking is its OWN axis: it applies to any model and any harness, so it is never
 * a suffix on a stored model id. `byHarness` carries a
 * per-harness override for a ladder that genuinely does not line up; a `null` entry
 * CLEARS that override and falls back to the global default.
 */
export function writeSettingsThinking(
  orchDir: string,
  update: { thinking?: ThinkingLevel; byHarness?: Partial<Record<AdapterId, ThinkingLevel | null>> },
): void {
  updateSettingsFile(orchDir, (root) => {
    const current = { ...root.defaults?.thinking_by_harness };
    for (const harness of ADAPTER_IDS) {
      const level = update.byHarness?.[harness];
      if (level === null) delete current[harness];
      else if (level !== undefined) current[harness] = level;
    }
    return {
      ...root,
      defaults: {
        ...root.defaults,
        ...(update.thinking === undefined ? {} : { thinking: update.thinking }),
        thinking_by_harness: current,
      },
    };
  });
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
  updateSettingsFile(orchDir, (root) => {
    const values = configValues(root);
    const { max_agents_total: maxAgents, ...fleet } = values.fleet;
    return {
      ...root,
      enabled: root.enabled ?? { adapters: [], backends: [] },
      ...values,
      fleet: { ...fleet, ...(maxAgents === undefined ? {} : { max_agents_total: maxAgents }) },
    };
  });
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

/**
 * The log level every logger must use: ORCH_LOG_LEVEL, else `logging.level` from
 * settings.json, else the default. One resolver, because four call sites had
 * hardcoded `"info"` and the setting was accepted, displayed by `orch settings`
 * and then ignored. An unrecognised env value is not a level, so it does not get
 * to outrank the file the user actually wrote.
 */
export function configuredLogLevel(directory: string): LogLevel {
  const env = process.env.ORCH_LOG_LEVEL;
  if (env !== undefined && isLogLevel(env)) return env;
  let configured: OrchConfig | null;
  try {
    configured = loadConfigOrNull(directory);
  } catch {
    configured = null;
  }
  return configured?.logging?.level ?? SETTINGS_DEFAULTS.logging.level;
}
