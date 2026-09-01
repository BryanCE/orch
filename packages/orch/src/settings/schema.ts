import * as path from "node:path";
import { z } from "zod";
import { ADAPTER_IDS } from "../types/adapter.ts";
import { HERDR_SINK_ID } from "../backends/backend.ts";
import { BACKEND_IDS, TILE_FIRST_SPLITS } from "../types/backend.ts";
import { THINKING_LEVELS } from "../types/policy.ts";
import { ORCH_RUNTIMES } from "../runtimes.ts";
import { NOTIFY_STATES, type NotifyState } from "../types/settings.ts";

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
  z.strictObject({ id: z.literal("sound"), on: NotifyOnSchema }),
  z.strictObject({ id: z.literal(HERDR_SINK_ID), on: NotifyOnSchema }),
]);

/** Every sink id, read off the schema so nothing re-lists the union. A sink named
 *  for a plexer must not put that plexer's name in core (Rule 10). */
export const NOTIFY_IDS: readonly string[] = NotifyEntrySchema.options.map((option) => option.shape.id.value);

/** The one field a sink carries beyond its id and states, keyed by sink id. Read off the
 *  schema, so a new sink is offered everywhere without a second list to keep in step. */
export const NOTIFY_SINK_FIELD: Readonly<Record<string, string>> = Object.fromEntries(
  NotifyEntrySchema.options.flatMap((option) => {
    const field = Object.keys(option.shape).find((key) => key !== "id" && key !== "on");
    return field === undefined ? [] : [[option.shape.id.value, field]];
  }),
);

/** The sinks whose whole entry is an id and its states - nothing to type, so a plain checkbox. */
export const NOTIFY_SIMPLE_IDS: readonly string[] = NOTIFY_IDS.filter((id) => NOTIFY_SINK_FIELD[id] === undefined);

export const SETTINGS_DEFAULTS = {
  fleet: { max_agents_per_pack: 10, max_depth: 1, worker_peer_tools: false, cross_space: false },
  queue: { max_retries: 1 },
  retention: { ended_agents_days: 90, queue_days: 14, events_days: 7, runs_days: 30, outbox_days: 7, control_outcomes_days: 30, logs_days: 7 },
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
    /** Recorded control outcomes older than this many days. */
    control_outcomes_days: PositiveInt.optional(),
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

export type SettingsFile = z.infer<typeof SETTINGS_FILE_SCHEMA>;

/** The settings filename, as a directory watcher sees it. */
export const SETTINGS_FILE = "settings.json";

/** User-editable composition storage: `$orchDir/settings.json`. */
export function settingsPath(orchDir: string): string {
  return path.join(orchDir, SETTINGS_FILE);
}

export function settingsTemporaryPath(file: string): string {
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
export function namesSettingsFile(filename: string | Buffer | null | undefined): boolean {
  const name = filename?.toString();
  if (name === undefined) return false;
  return name === SETTINGS_FILE || (name.startsWith(`${SETTINGS_FILE}.`) && name.endsWith(".tmp"));
}
