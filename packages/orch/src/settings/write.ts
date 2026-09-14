import { ADAPTER_IDS } from "../types/adapter.ts";
import type { AdapterId } from "../types/adapter.ts";
import type { BackendId } from "../types/backend.ts";
import type { OrchRuntime } from "../runtimes.ts";
import { isRecord } from "../util.ts";
import {
  SETTINGS_DEFAULTS, SETTINGS_FILE_SCHEMA, SETTINGS_SCHEMA,
  type SettingsFile,
} from "./schema.ts";
import { parseSettingsText, settingsValues, requireEnabledComposition } from "./read.ts";
import type { NotifyEntry, SettingsRepair } from "../types/settings.ts";
import type { ThinkingLevel } from "../types/policy.ts";
import type { SettingsManager } from "../types/services.ts";

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
export function writeSettingsAllowedModels(settings: SettingsManager, allowed: Partial<Record<AdapterId, string[]>>): void {
  updateSettingsFile(settings, (root) => ({ ...root, models: { ...root.models, allowed: withoutEmptyLists(allowed) } }));
}

/** Record the preferred quicklist each harness exposes to its native picker. */
export function writeSettingsPreferredModels(settings: SettingsManager, preferred: Partial<Record<AdapterId, string[]>>): void {
  updateSettingsFile(settings, (root) => ({ ...root, models: { ...root.models, preferred: withoutEmptyLists(preferred) } }));
}

/** Validate and serialize a settings root for the storage layer to write. */
function serializeSettingsRoot(file: string, candidate: unknown): string {
  const updated = SETTINGS_FILE_SCHEMA.parse(candidate);
  requireEnabledComposition(file, updated);
  return JSON.stringify(updated, null, 2) + "\n";
}

/** Apply one schema-validated mutation under the settings storage lock. */
function updateSettingsFile(settings: SettingsManager, mutate: (root: Partial<SettingsFile>) => Partial<SettingsFile>): void {
  settings.update((current) => serializeSettingsRoot(
    settings.file,
    mutate(current === null ? { schemaVersion: SETTINGS_SCHEMA } : parseSettingsText(current, settings.file)),
  ));
}

function copyRecord(root: object): Record<string, unknown> {
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(root)) copy[key] = value;
  return copy;
}

interface CopiedSettingsPath {
  readonly candidate: Record<string, unknown>;
  readonly cursor: Record<string, unknown> | null;
}

/** Copy the root and each existing object along a dotted path. */
function copySettingsPath(root: object, segments: readonly string[], createMissing: boolean): CopiedSettingsPath {
  const candidate = copyRecord(root);
  let cursor = candidate;
  for (const segment of segments.slice(0, -1)) {
    const existing = cursor[segment];
    if (!isRecord(existing) && !createMissing) return { candidate, cursor: null };
    const next = isRecord(existing) ? copyRecord(existing) : {};
    cursor[segment] = next;
    cursor = next;
  }
  return { candidate, cursor };
}

function setSettingsPathRecord(root: object, segments: readonly string[], value: unknown): Record<string, unknown> {
  const first = segments[0];
  if (first === undefined) throw new Error("settings key must not be empty");
  const { candidate, cursor } = copySettingsPath(root, segments, true);
  if (cursor === null) throw new Error("settings key must not be empty");
  const last = segments.at(-1);
  if (last === undefined) throw new Error("settings key must not be empty");
  cursor[last] = value;
  return candidate;
}

function setSettingsPath(root: Partial<SettingsFile>, segments: readonly string[], value: unknown): Partial<SettingsFile> {
  return SETTINGS_FILE_SCHEMA.parse(setSettingsPathRecord(root, segments, value));
}

/** Write one schema setting through the same whole-file validator as every specialised writer. */
export function writeSettingsValue(settings: SettingsManager, key: string, value: unknown): void {
  const segments = key.split(".");
  updateSettingsFile(settings, (root) => setSettingsPath(root, segments, value));
}

function deleteSettingsPathRecord(root: object, segments: readonly string[]): Record<string, unknown> {
  const { candidate, cursor } = copySettingsPath(root, segments, false);
  if (cursor === null) return candidate;
  const last = segments.at(-1);
  if (last === undefined) throw new Error("settings key must not be empty");
  delete cursor[last];
  return candidate;
}

function deleteSettingsPath(root: Partial<SettingsFile>, segments: readonly string[]): Partial<SettingsFile> {
  return SETTINGS_FILE_SCHEMA.parse(deleteSettingsPathRecord(root, segments));
}

interface SettingsPathValue {
  readonly found: boolean;
  readonly value?: unknown;
}

function settingsPathValue(root: unknown, segments: readonly string[]): SettingsPathValue {
  let cursor: unknown = root;
  for (const segment of segments) {
    if (!isRecord(cursor) || !Object.hasOwn(cursor, segment)) return { found: false };
    cursor = cursor[segment];
  }
  return { found: true, value: cursor };
}

/** Apply explicit repairs to a raw settings file, validating only after all repairs are made. */
export function applySettingsRepairs(settings: SettingsManager, repairs: readonly SettingsRepair[]): void {
  // Choosing nothing writes nothing. Falling through to the validator would reject the very
  // file the person just decided to leave as it is, and report that decision as an error.
  if (repairs.length === 0) return;
  settings.update((current) => {
    if (current === null) throw new Error(`${settings.file}: settings.json is absent`);
    const parsed: unknown = JSON.parse(current);
    if (!isRecord(parsed)) throw new Error(`${settings.file}: settings root must be an object`);
    let candidate = copyRecord(parsed);

    for (const repair of repairs) {
      switch (repair.kind) {
        case "rename": {
          const source = settingsPathValue(candidate, repair.from.split("."));
          const destination = settingsPathValue(candidate, repair.to.split("."));
          if (destination.found) {
            throw new Error(`cannot rename ${JSON.stringify(repair.from)} to ${JSON.stringify(repair.to)}: destination already holds a value`);
          }
          if (!source.found) continue;
          candidate = deleteSettingsPathRecord(candidate, repair.from.split("."));
          candidate = setSettingsPathRecord(candidate, repair.to.split("."), source.value);
          continue;
        }
        case "set":
          candidate = setSettingsPathRecord(candidate, repair.path.split("."), repair.value);
          continue;
        case "drop":
          candidate = deleteSettingsPathRecord(candidate, repair.path.split("."));
          continue;
        default: {
          const exhaustive: never = repair;
          return exhaustive;
        }
      }
    }

    return serializeSettingsRoot(settings.file, candidate);
  });
}

/** Remove one setting from settings.json so its default wins again, through the same
 *  whole-file validator as every write. Removing an absent key is a no-op, not an error. */
export function clearSettingsValue(settings: SettingsManager, key: string): void {
  const segments = key.split(".");
  updateSettingsFile(settings, (root) => deleteSettingsPath(root, segments));
}

/** Record the declared JS runtime as the top-level `runtime` key. Idempotent: re-recording the
 * same selection leaves the file byte-identical, and a different selection replaces the single
 * scalar in place — the shape has no room to accumulate a second runtime entry. */
export function writeSettingsRuntime(settings: SettingsManager, runtime: OrchRuntime): void {
  updateSettingsFile(settings, (root) => ({ ...root, runtime }));
}

/** Upsert one string entry in the `defaults` section of settings.json. */
export function writeSettingsDefault(settings: SettingsManager, key: "adapter", value: AdapterId): void;
export function writeSettingsDefault(settings: SettingsManager, key: "backend", value: BackendId): void;
export function writeSettingsDefault(settings: SettingsManager, key: "adapter" | "backend", value: string): void {
  updateSettingsFile(settings, (root) => ({ ...root, defaults: { ...root.defaults, [key]: value } }));
}

/** Record the model each enabled harness launches on, replacing any previous set. */
export function writeSettingsModels(settings: SettingsManager, models: Partial<Record<AdapterId, string>>): void {
  updateSettingsFile(settings, (root) => ({ ...root, defaults: { ...root.defaults, models: { ...models } } }));
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
  settings: SettingsManager,
  update: { thinking?: ThinkingLevel; byHarness?: Partial<Record<AdapterId, ThinkingLevel | null>> },
): void {
  updateSettingsFile(settings, (root) => {
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

/** Record the user's answer to "may orch install its skills?" and, when they named them,
 *  which store holds the files and which harness directories link into it. */
export function writeSettingsSkills(
  settings: SettingsManager,
  skills: { install: boolean; store?: string; link?: readonly string[] },
): void {
  updateSettingsFile(settings, (root) => ({
    ...root,
    skills: {
      install: skills.install,
      store: skills.store ?? root.skills?.store ?? SETTINGS_DEFAULTS.skills.store,
      link: [...(skills.link ?? root.skills?.link ?? SETTINGS_DEFAULTS.skills.link)],
    },
  }));
}

/** Record the setup-enabled provider sets in settings.json. */
export function writeSettingsEnabled(settings: SettingsManager, enabled: { adapters: readonly AdapterId[]; backends: readonly BackendId[] }): void {
  updateSettingsFile(settings, (root) => ({ ...root, enabled: { adapters: [...enabled.adapters], backends: [...enabled.backends] } }));
}

/** Seed the complete settings tree while preserving every value already present. */
export function writeSettingsFullTree(settings: SettingsManager): void {
  updateSettingsFile(settings, (root) => {
    const values = settingsValues(root);
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
export function writeSettingsNotify(settings: SettingsManager, entries: readonly NotifyEntry[]): void {
  updateSettingsFile(settings, (root) => {
    const written = new Map(entries.map((entry) => [entry.id, entry]));
    const upserted = (root.notify ?? []).map((entry) => written.get(entry.id) ?? entry);
    const configured = new Set(upserted.map((entry) => entry.id));
    return { ...root, notify: [...upserted, ...entries.filter((entry) => !configured.has(entry.id))] };
  });
}
