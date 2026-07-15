import {
  createBuiltinNotifiers,
  type Notifier,
  type NotifierConfigField,
} from "../notify.ts";

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
  if (name === "command") {
    return Array.isArray(value) && value.length > 0 && value.every((part) => typeof part === "string" && part.length > 0);
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

function tomlValue(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return String(value);
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
  }
  throw new Error("notifier config contains a value that cannot be represented in TOML");
}

/** Render one selected notifier in the config parser's [[notify]] shape. */
export function renderNotifyEntry(id: string, config: Record<string, unknown>): string {
  if (!findNotifier(id)) throw new Error(`unknown notifier: ${id}`);
  const lines = [`[[notify]]`, `id = ${JSON.stringify(id)}`];
  for (const [key, value] of Object.entries(config)) lines.push(`${key} = ${tomlValue(value)}`);
  return `${lines.join("\n")}\n`;
}

export async function buildSelectedNotifyEntries(
  selections: { id: string; config: Record<string, unknown> }[],
): Promise<{ toml: string; errors: { id: string; missing: string[] }[] }> {
  const entries: string[] = [];
  const errors: { id: string; missing: string[] }[] = [];
  for (const selection of selections) {
    const result = collectRequiredConfig(selection.id, selection.config);
    if (!result.ok) errors.push({ id: selection.id, missing: result.missing });
    else entries.push(renderNotifyEntry(selection.id, result.config));
  }
  await Promise.resolve();
  return { toml: entries.join("\n"), errors };
}
