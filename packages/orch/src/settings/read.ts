import * as filesystem from "node:fs";
import * as path from "node:path";
import { z } from "zod";
// settings.ts is a leaf module imported during almost every module graph's init
// (notify.ts → settings.ts among others). It must never import the provider
// registries — they evaluate every concrete adapter/backend, re-entering this
// graph mid-initialization. The closed id sets live in the pure port modules.
import { ADAPTER_IDS } from "../types/adapter.ts";
import { BACKEND_IDS } from "../types/backend.ts";
import { ORCH_RUNTIMES, type OrchRuntime } from "../runtimes.ts";
import { errnoCode, errorMessage, isRecord } from "../util.ts";
import { isLogLevel } from "../log.ts";
import type { AdapterId } from "../types/adapter.ts";
import { SETTINGS_DEFAULTS, SETTINGS_FILE_SCHEMA, SETTINGS_SCHEMA, type SettingsFile, settingsPath } from "./schema.ts";
import type { OrchSettings, SettingSource } from "../types/settings.ts";
import type { LogLevel } from "../types/core.ts";

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
export function readSettingsFile(file: string): SettingsFile | null {
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
export function requireEnabledComposition(file: string, root: SettingsFile): void {
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
function settingOr<T>(value: T | undefined, fallback: T): T {
  return value ?? fallback;
}

/** Extract each settings section independently so adding a field cannot grow one branch ladder. */
const settingsValueExtractors = {
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
    ended_agents_days: settingOr(root.retention?.ended_agents_days, SETTINGS_DEFAULTS.retention.ended_agents_days),
    queue_days: settingOr(root.retention?.queue_days, SETTINGS_DEFAULTS.retention.queue_days),
    events_days: settingOr(root.retention?.events_days, SETTINGS_DEFAULTS.retention.events_days),
    runs_days: settingOr(root.retention?.runs_days, SETTINGS_DEFAULTS.retention.runs_days),
    outbox_days: settingOr(root.retention?.outbox_days, SETTINGS_DEFAULTS.retention.outbox_days),
    logs_days: settingOr(root.retention?.logs_days, SETTINGS_DEFAULTS.retention.logs_days),
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
export function settingsValues(root: Partial<SettingsFile>): Omit<OrchSettings, "runtime" | "enabled"> {
  return {
    defaults: settingsValueExtractors.defaults(root),
    fleet: settingsValueExtractors.fleet(root),
    models: settingsValueExtractors.models(root),
    workers: settingsValueExtractors.workers(root),
    queue: settingsValueExtractors.queue(root),
    retention: settingsValueExtractors.retention(root),
    logging: settingsValueExtractors.logging(root),
    timeouts: settingsValueExtractors.timeouts(root),
    notify: settingsValueExtractors.notify(root),
    locked_commands: settingsValueExtractors.locked_commands(root),
    hosts: settingsValueExtractors.hosts(root),
    spaces: settingsValueExtractors.spaces(root),
    daemon: settingsValueExtractors.daemon(root),
    doctor: settingsValueExtractors.doctor(root),
    tiling: settingsValueExtractors.tiling(root),
    skills: settingsValueExtractors.skills(root),
  };
}

/** Load and validate `$orchDir/settings.json`, or null when the file does not exist yet.
 *
 * ONLY for the callers that must genuinely distinguish a first run from a settings-recorded
 * install — setup's own gate. Every other caller uses `loadSettings`, which treats an
 * absent file as the loud error it is. A malformed file still throws here. */
export function loadSettingsOrNull(orchDir: string): OrchSettings | null {
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
    ...settingsValues(root),
  };
}

/** Load and validate `$orchDir/settings.json`. orch has NO built-in defaults: an absent
 * settings.json is a loud error naming the file and `orch setup`, never a silent empty
 * settings. Use `loadSettingsOrNull` only where first-run really must be distinguished. */
export function loadSettings(orchDir: string): OrchSettings {
  const settings = loadSettingsOrNull(orchDir);
  if (settings === null) {
    throw new Error(`${settingsPath(orchDir)} does not exist - orch has no built-in settings and does nothing by default.\nRun: orch setup`);
  }
  return settings;
}

/** The declared JS runtime for this install. The ONE read of the runtime key — nothing
 * anywhere DERIVES this value from PATH, from `process.execPath`, or from an adapter's own
 * list. `src/doctor/runtime.ts` does detect the runtime actually executing orch, which is
 * not the same thing: it establishes reality in order to compare it against this
 * declaration. Detecting-to-verify is the point of the key; detecting-to-default would
 * defeat it, because a value inferred from reality can never disagree with reality. */
export function declaredRuntime(orchDir: string): OrchRuntime {
  return loadSettings(orchDir).runtime;
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
export function resolveWithSource<T>(opts: { flag?: T; env?: string; settings?: unknown; fallback: T }): { value: T; source: SettingSource } {
  if (opts.flag !== undefined) return { value: opts.flag, source: "flag" };
  if (opts.env) {
    const value = process.env[opts.env];
    if (value !== undefined) return { value: coerceEnvironment(value, opts.fallback, opts.env), source: "env" };
  }
  if (opts.settings !== undefined && hasFallbackShape(opts.settings, opts.fallback)) {
    return { value: opts.settings, source: "settings.json" };
  }
  return { value: opts.fallback, source: "default" };
}

/** Resolve a setting with flag, ORCH_* environment, settings, and fallback precedence. */
export function resolveSetting<T>(opts: { flag?: T; env?: string; settings?: T; fallback: T }): T {
  return resolveWithSource(opts).value;
}

/**
 * Settings model-allowlist patterns, empty when the user set none.
 *
 * Empty means EVERY model that harness offers is allowed. Orch ships no built-in
 * allowlist: a hardcoded default silently pinned every spawn to the one family that
 * happened to be listed, and an orchestrator could not tell a rejected model from an
 * applied one. Restricting models is an explicit `models.allowed` opt-in, per harness.
 */
export function allowedModelPatterns(orchDir: string, harness: AdapterId): string[] {
  try {
    return loadSettings(orchDir).models.allowed[harness] ?? [];
  } catch {
    // Malformed settings restrict nothing; the write path still reports failures.
    return [];
  }
}
/**
 * The log level every logger must use: ORCH_LOG_LEVEL, else `logging.level` from
 * settings.json, else the default. One resolver, because four call sites had
 * hardcoded `"info"` and the setting was accepted, displayed by `orch settings`
 * and then ignored. An unrecognised env value is not a level, so it does not get
 * to outrank the file the user actually wrote.
 */
export function settingsLogLevel(directory: string): LogLevel {
  const env = process.env.ORCH_LOG_LEVEL;
  if (env !== undefined && isLogLevel(env)) return env;
  let settings: OrchSettings | null;
  try {
    settings = loadSettingsOrNull(directory);
  } catch {
    settings = null;
  }
  return settings?.logging?.level ?? SETTINGS_DEFAULTS.logging.level;
}
