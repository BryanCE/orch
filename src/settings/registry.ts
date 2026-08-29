import { z } from "zod";
import { SETTINGS_FILE_SCHEMA, writeSettingsValue, type OrchConfig } from "../config.ts";
import type { SettingKind, SettingSpec } from "./spec.ts";

interface JsonSchemaNode {
  readonly type?: string;
  readonly enum?: readonly unknown[];
  readonly properties?: Record<string, unknown>;
  readonly items?: unknown;
  readonly minimum?: number;
  readonly exclusiveMinimum?: number;
  readonly maximum?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function jsonSchemaNode(value: unknown): JsonSchemaNode | null {
  if (!isRecord(value)) return null;
  return {
    type: typeof value.type === "string" ? value.type : undefined,
    enum: Array.isArray(value.enum) ? value.enum : undefined,
    properties: isRecord(value.properties) ? value.properties : undefined,
    items: value.items,
    minimum: typeof value.minimum === "number" ? value.minimum : undefined,
    exclusiveMinimum: typeof value.exclusiveMinimum === "number" ? value.exclusiveMinimum : undefined,
    maximum: typeof value.maximum === "number" ? value.maximum : undefined,
  };
}

const JSON_SCHEMA = z.toJSONSchema(SETTINGS_FILE_SCHEMA);

function schemaNode(key: string): JsonSchemaNode {
  let current: unknown = JSON_SCHEMA;
  for (const segment of key.split(".")) {
    const node = jsonSchemaNode(current);
    const properties = node?.properties;
    if (properties === undefined) throw new Error(`settings schema has no object path for ${key}`);
    current = properties[segment];
  }
  const result = jsonSchemaNode(current);
  if (result === null) throw new Error(`settings schema has no value for ${key}`);
  return result;
}

function choicesFor(key: string, node: JsonSchemaNode): readonly string[] {
  const values = node.enum;
  if (values === undefined || values.some((value) => typeof value !== "string")) {
    throw new Error(`settings schema has no string choices for ${key}`);
  }
  return values.filter((value): value is string => typeof value === "string");
}

function kindFor(key: string): SettingKind {
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

function readAt(config: OrchConfig, key: string): unknown {
  let current: unknown = config;
  for (const segment of key.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    const record: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(current)) record[name] = value;
    if (!(segment in record)) return undefined;
    current = record[segment];
  }
  return current;
}

function setting(key: string, group: string, help: string, env?: string, writable = true): SettingSpec {
  return {
    key,
    group,
    help,
    type: kindFor(key),
    read: (config) => readAt(config, key),
    ...(writable ? { write: (orchDir: string, value: unknown) => writeSettingsValue(orchDir, key, value) } : {}),
    ...(env === undefined ? {} : { env }),
  };
}

const KEYS = [
  "runtime",
  "enabled.adapters",
  "enabled.backends",
  "defaults.adapter",
  "defaults.backend",
  "defaults.models",
  "defaults.thinking",
  "defaults.thinking_by_harness",
  "defaults.worktree",
  "fleet.spawn_cap",
  "fleet.pack_cap",
  "fleet.max_agents",
  "fleet.space_caps",
  "fleet.worker_peer_tools",
  "fleet.cross_space",
  "models.allowed",
  "models.preferred",
  "workers.inherit_extensions",
  "workers.exclude_extensions",
  "workers.builtin_tools",
  "workers.allow_tools",
  "queue.max_retries",
  "logging.level",
  "retention.ended_agents_days",
  "retention.queue_days",
  "retention.events_days",
  "retention.runs_days",
  "retention.outbox_days",
  "retention.logs_days",
  "timeouts.dispatch_ack_ms",
  "timeouts.wait_ms",
  "timeouts.adapter_command_ms",
  "timeouts.notify_ms",
  "notify",
  "locked_commands",
  "hosts",
  "spaces",
  "daemon.tcp_port",
  "daemon.idle_shutdown_minutes",
  "tiling.first_split",
  "skills.install",
  "skills.roots",
];

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
  "fleet.spawn_cap": "Maximum concurrent agents.",
  "fleet.pack_cap": "Maximum agents in a pack.",
  "fleet.max_agents": "Optional global agent limit.",
  "fleet.space_caps": "Agent limits by space.",
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
  notify: "Notification sinks and their delivery settings.",
  locked_commands: "Commands workers must run through the lock.",
  hosts: "Named remote hosts.",
  spaces: "Named space paths.",
  "daemon.tcp_port": "TCP port used by the daemon.",
  "daemon.idle_shutdown_minutes": "Minutes before an idle daemon shuts down.",
  "tiling.first_split": "Direction used for the first pane split.",
  "skills.install": "Whether orch installs packaged skills.",
  "skills.roots": "Harness skill directories managed by orch.",
};

export const SETTINGS_REGISTRY: readonly SettingSpec[] = KEYS.map((key) => {
  const group = key.split(".")[0] ?? key;
  return setting(key, group, HELP[key] ?? `Configure ${key}.`,
    key === "defaults.worktree" ? "ORCH_WORKTREE"
      : key === "defaults.thinking" ? "ORCH_THINKING"
        : key === "defaults.adapter" ? "ORCH_ADAPTER"
          : key === "defaults.backend" ? "ORCH_BACKEND"
            : key === "daemon.tcp_port" ? "ORCH_DAEMON_PORT"
              : key === "fleet.spawn_cap" ? "ORCH_SPAWN_CAP" : undefined,
    key !== "runtime");
});

/** Find one declared setting or throw a plain configuration error. */
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
