import { schemaNode, jsonSchemaNode, type JsonSchemaNode } from "./schema-tree.ts";
import { clearSettingsValue, writeSettingsDefault, writeSettingsValue } from "./write.ts";
import { NOTIFY_DEFAULT_ON, NOTIFY_IDS, NOTIFY_SINK_FIELD, NotifyEntrySchema } from "./schema.ts";
import { isRecord, valueAtPath } from "../util.ts";
import { isAdapterId } from "../adapters/adapter.ts";
import { isBackendId } from "../backends/backend.ts";
import { NOTIFY_STATES } from "../types/settings.ts";
import type { NotifyEntry, OrchSettings, SettingKind, SettingSpec } from "../types/settings.ts";


function choicesFor(key: string, node: JsonSchemaNode): readonly string[] {
  const values = node.enum;
  if (values === undefined || values.some((value) => typeof value !== "string")) {
    throw new Error(`settings schema has no string choices for ${key}`);
  }
  return values.filter((value): value is string => typeof value === "string");
}

function kindFor(key: string): SettingKind {
  // Sinks are checked off a list; the ones that carry a value declare the field to ask for.
  if (key === "notify") {
    return {
      kind: "sinks",
      choices: NOTIFY_IDS,
      fields: Object.fromEntries(Object.entries(NOTIFY_SINK_FIELD).map(([id, name]) => [id, { name }])),
      states: NOTIFY_STATES,
      defaultStates: NOTIFY_DEFAULT_ON,
    };
  }
  const node = schemaNode(key);
  if (node.enum !== undefined) return { kind: "choice", choices: choicesFor(key, node) };
  if (node.type === "boolean") return { kind: "boolean" };
  if (node.type === "integer") {
    const min = node.minimum ?? (node.exclusiveMinimum === undefined ? undefined : node.exclusiveMinimum + 1);
    const max = node.maximum;
    return { kind: "integer", ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }) };
  }
  if (node.type === "array") {
    const item = jsonSchemaNode(node.items);
    if (item?.enum !== undefined) return { kind: "multi", choices: choicesFor(key, item) };
    return { kind: "list" };
  }
  if (node.type === "string") return { kind: "text" };
  return { kind: "list" };
}

function readAt(settings: OrchSettings, key: string): unknown {
  let current: unknown = settings;
  for (const segment of key.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    const record: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(current)) record[name] = value;
    if (!(segment in record)) return undefined;
    current = record[segment];
  }
  return current;
}

type SettingWriter = (orchDir: string, value: unknown) => void;

function writeDefaultAdapter(orchDir: string, value: unknown): void {
  if (!isAdapterId(value)) throw new Error(`defaults.adapter must be a known adapter id`);
  writeSettingsDefault(orchDir, "adapter", value);
}

function writeDefaultBackend(orchDir: string, value: unknown): void {
  if (!isBackendId(value)) throw new Error(`defaults.backend must be a known backend id`);
  writeSettingsDefault(orchDir, "backend", value);
}

function readNotifySinks(settings: OrchSettings): NotifyEntry[] {
  return settings.notify;
}

/** One picked sink, checked against the schema that owns its shape. */
function notifyEntry(candidate: unknown): NotifyEntry {
  if (!isRecord(candidate)) throw new Error(`each notify sink is an object with an id; choose from ${NOTIFY_IDS.join(", ")}`);
  const id: unknown = candidate.id;
  if (typeof id !== "string" || !NOTIFY_IDS.includes(id)) {
    throw new Error(`unknown notify sink ${JSON.stringify(id)}; choose from ${NOTIFY_IDS.join(", ")}`);
  }
  const field = NOTIFY_SINK_FIELD[id];
  const carried: unknown = field === undefined ? undefined : valueAtPath(candidate, [field]);
  if (field !== undefined && (carried === undefined || carried === "")) {
    throw new Error(`the ${id} sink needs a ${field}`);
  }
  const parsed = NotifyEntrySchema.safeParse(candidate);
  if (!parsed.success) throw new Error(`${id}: ${parsed.error.issues[0]?.message ?? "not a valid sink"}`);
  return parsed.data;
}

function writeNotifySinks(orchDir: string, value: unknown): void {
  if (!Array.isArray(value)) throw new Error("notify must be a list of sinks");
  writeNotifyEntries(orchDir, value.map(notifyEntry));
}

/** Persist whole notify entries - `orch settings notify add`'s writer, and this row's.
 *  A REPLACE: unchecking a sink and `notify remove` both have to be able to take one away,
 *  which setup's additive `writeSettingsNotify` cannot say. */
export function writeNotifyEntries(orchDir: string, entries: readonly NotifyEntry[]): void {
  writeSettingsValue(orchDir, "notify", [...entries]);
}


function writerFor(key: string): SettingWriter | undefined {
  if (key === "defaults.adapter") return writeDefaultAdapter;
  if (key === "defaults.backend") return writeDefaultBackend;
  if (key === "notify") return writeNotifySinks;
  return undefined;
}

function readerFor(key: string): ((settings: OrchSettings) => unknown) | undefined {
  if (key === "notify") return readNotifySinks;
  return undefined;
}

function setting(key: string, group: string, help: string, env?: string, writable = true, writer?: SettingWriter): SettingSpec {
  return {
    key,
    group,
    help,
    type: kindFor(key),
    read: readerFor(key) ?? ((settings) => readAt(settings, key)),
    ...(writable ? { write: writer ?? ((orchDir: string, value: unknown) => writeSettingsValue(orchDir, key, value)) } : {}),
    ...(env === undefined ? {} : { env }),
  };
}

/**
 * Every setting orch declares, in display order, with its one-line help.
 *
 * This object is the ONLY roster. The registry's key list is DERIVED from it, so a
 * setting can no longer be declared in one place and documented in another: the two
 * used to be parallel 42-entry lists kept in step by hand, and the `?? "Set
 * <key>."` fallback that papered over a missing entry meant drift shipped silently.
 */
const HELP: Readonly<Record<string, string>> = {
  runtime: "JavaScript runtime used to execute orch.",
  "enabled.adapters": "Harnesses enabled for spawning agents.",
  "enabled.backends": "Plexers and process backends enabled for spawning agents.",
  "defaults.adapter": "Harness used when none is specified.",
  "defaults.backend": "Backend used when none is specified.",
  "defaults.models": "Default model for each harness.",
  "defaults.thinking": "Default thinking effort for launches.",
  "defaults.thinking_by_harness": "Per-harness thinking effort overrides.",
  "defaults.worktree": "Whether launches use worktrees by default.",
  "fleet.max_depth": "How many levels deep spawning may go. 1 = only a root spawns. Counts levels, not agents.",
  "fleet.max_agents_per_pack": "Most live agents under one root, root included. Counts agents at every depth.",
  "fleet.max_agents_per_space": "Most live agents in one space, keyed by space name.",
  "fleet.max_agents_total": "Most live agents on this machine across every space and pack.",
  "fleet.worker_peer_tools": "Whether workers may use peer tools.",
  "fleet.cross_space": "Whether workers may cross space boundaries.",
  "models.allowed": "Model allowlist patterns by harness.",
  "models.preferred": "Model quicklists by harness.",
  "workers.inherit_extensions": "Whether workers inherit harness extensions.",
  "workers.exclude_extensions": "Extensions workers must not load.",
  "workers.builtin_tools": "Whether workers receive built-in tools.",
  "workers.allow_tools": "Tools workers may use.",
  "queue.max_retries": "Maximum retries for queued tasks.",
  "logging.level": "Minimum level written to logs.",
  "retention.ended_agents_days": "Days to retain ended agents.",
  "retention.queue_days": "Days to retain settled queue tasks.",
  "retention.events_days": "Days to retain events.",
  "retention.runs_days": "Days to retain completed runs.",
  "retention.outbox_days": "Days to retain delivered outbox messages.",
  "retention.logs_days": "Days to retain headless logs.",
  "timeouts.dispatch_ack_ms": "Dispatch acknowledgement timeout in milliseconds.",
  "timeouts.wait_ms": "Wait timeout in milliseconds.",
  "timeouts.adapter_command_ms": "Adapter command timeout in milliseconds.",
  "timeouts.notify_ms": "Notification timeout in milliseconds.",
  notify: "Where agent state changes are delivered. enter picks the sinks - sound (a ding on this machine), desktop, herdr, webhook (a URL), command (any command line you want) - space turns one on, e sets what it carries, w picks which states it fires on.",
  locked_commands: "Commands workers must run through the lock.",
  hosts: "Named remote hosts.",
  spaces: "Named space paths.",
  "daemon.tcp_port": "TCP port used by the daemon.",
  "daemon.idle_shutdown_minutes": "Minutes before an idle daemon shuts down.",
  "doctor.unclaimed_after_ms": "How long after spawn an agent may stay unclaimed before doctor reports it. Milliseconds.",
  "tiling.first_split": "Direction used for the first pane split.",
  "skills.install": "Whether orch installs packaged skills.",
  "skills.roots": "Harness skill directories managed by orch.",
};

/** Env var that overrides a setting, for the few that take one. */
const ENV_OVERRIDES: Readonly<Record<string, string>> = {
  "defaults.worktree": "ORCH_WORKTREE",
  "defaults.thinking": "ORCH_THINKING",
  "defaults.adapter": "ORCH_ADAPTER",
  "defaults.backend": "ORCH_BACKEND",
  "daemon.tcp_port": "ORCH_DAEMON_PORT",
};

/** `runtime` is the one declared setting orch will not rewrite: it names how orch
 *  itself is executed, so changing it from inside a running orch is not honourable. */
const READ_ONLY_KEYS: readonly string[] = ["runtime"];

export const SETTINGS_REGISTRY: readonly SettingSpec[] = Object.entries(HELP).map(([key, help]) =>
  setting(key, key.split(".")[0] ?? key, help, ENV_OVERRIDES[key], !READ_ONLY_KEYS.includes(key), writerFor(key)));

/** Find one declared setting or throw a plain settings error. */
export function registeredSetting(key: string): SettingSpec {
  const found = SETTINGS_REGISTRY.find((entry) => entry.key === key);
  if (found === undefined) throw new Error(`unknown setting ${JSON.stringify(key)}`);
  return found;
}

/** Persist a value through the declaration that owns the setting. */
export function writeRegisteredSetting(orchDir: string, key: string, value: unknown): void {
  const spec = registeredSetting(key);
  if (spec.write === undefined) throw new Error(`${key} is read-only`);
  spec.write(orchDir, value);
}

/** Remove a setting from settings.json so its default wins again. Guarded by the same
 *  declaration as writes: a read-only setting cannot be cleared either. */
export function clearRegisteredSetting(orchDir: string, key: string): void {
  const spec = registeredSetting(key);
  if (spec.write === undefined) throw new Error(`${key} is read-only`);
  clearSettingsValue(orchDir, key);
}
