// Load backend-owned providers before building the setup choices. The registry
// import is intentionally side-effect-only: notify.ts stays harness-neutral.
import "../backends/registry.ts";
import {
  createBuiltinNotifiers,
  type Notifier,
  type NotifierConfigField,
} from "../notify/sinks.ts";
import type { NotifyEntry } from "../config.ts";
import { HERDR_SINK_ID } from "../backends/backend.ts";

export interface NotifierChoice {
  id: string;
  available: boolean;
  requiredFields: NotifierConfigField[];
}

const notifiers = createBuiltinNotifiers();

function fieldDetails(field: NotifierConfigField | string): NotifierConfigField {
  return typeof field === "string" ? { name: field, label: field } : field;
}

function findNotifier(id: string): Notifier | undefined {
  return notifiers.find((notifier) => notifier.id === id);
}

/** Probe each built-in integration; rejected probes are reported as unavailable. */
export async function probeNotifiers(): Promise<NotifierChoice[]> {
  return Promise.all(notifiers.map(async (notifier) => {
    let available = false;
    try {
      available = await notifier.available();
    } catch {
      available = false;
    }
    return {
      id: notifier.id,
      available,
      requiredFields: notifier.metadata.requiredConfig.map(fieldDetails),
    };
  }));
}

function validFieldValue(name: string, value: unknown): boolean {
  if (name === "url") {
    if (typeof value !== "string" || value.trim().length === 0) return false;
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }
  if (name === "command") {
    return (typeof value === "string" && value.trim().length > 0)
      || (Array.isArray(value) && value.length > 0 && value.every((part) => typeof part === "string" && part.length > 0));
  }
  return typeof value === "string" && value.trim().length > 0;
}

/** Keep only declared fields and validate their adapter-specific value shapes. */
export function collectRequiredConfig(
  id: string,
  provided: Record<string, unknown>,
): { ok: true; config: Record<string, unknown> } | { ok: false; missing: string[] } {
  const notifier = findNotifier(id);
  if (!notifier) return { ok: false, missing: [`unknown notifier: ${id}`] };

  const config: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const field of notifier.metadata.requiredConfig.map(fieldDetails)) {
    const value = provided[field.name];
    if (!validFieldValue(field.name, value)) missing.push(field.name);
    else config[field.name] = value;
  }
  return missing.length ? { ok: false, missing } : { ok: true, config };
}

function isCommandArgv(value: unknown): value is [string, ...string[]] {
  return Array.isArray(value) && value.length > 0 && value.every((part) => typeof part === "string");
}

/** Render one selected notifier as a strict settings.json `notify` entry. */
export function renderNotifyEntry(id: string, config: Record<string, unknown>): NotifyEntry {
  switch (id) {
    case "desktop":
      return { id: "desktop", ...(config.on === undefined ? {} : { on: config.on as NotifyEntry["on"] }) };
    case HERDR_SINK_ID:
      return { id: HERDR_SINK_ID, ...(config.on === undefined ? {} : { on: config.on as NotifyEntry["on"] }) };
    case "webhook":
      if (typeof config.url !== "string" || !validFieldValue("url", config.url)) throw new Error("webhook notifier requires an http/https URL");
      return { id: "webhook", url: config.url, ...(config.on === undefined ? {} : { on: config.on as NotifyEntry["on"] }) };
    case "command": {
      const command = config.command;
      if (typeof command !== "string" && !isCommandArgv(command)) {
        throw new Error("command notifier requires a command");
      }
      return { id: "command", command, ...(config.on === undefined ? {} : { on: config.on as NotifyEntry["on"] }) };
    }
    default:
      throw new Error(`unknown notifier: ${id}`);
  }
}

export async function buildSelectedNotifyEntries(
  selections: { id: string; config: Record<string, unknown> }[],
): Promise<{ entries: NotifyEntry[]; errors: { id: string; missing: string[] }[] }> {
  const entries: NotifyEntry[] = [];
  const errors: { id: string; missing: string[] }[] = [];
  for (const selection of selections) {
    const result = collectRequiredConfig(selection.id, selection.config);
    if (!result.ok) errors.push({ id: selection.id, missing: result.missing });
    else entries.push(renderNotifyEntry(selection.id, result.config));
  }
  await Promise.resolve();
  return { entries, errors };
}
