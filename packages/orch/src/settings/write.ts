import * as filesystem from "node:fs";
import { ADAPTER_IDS } from "../types/adapter.ts";
import type { AdapterId } from "../types/adapter.ts";
import type { BackendId } from "../types/backend.ts";
import type { OrchRuntime } from "../runtimes.ts";
import { ensurePrivateDir, isRecord } from "../util.ts";
import {
  SETTINGS_DEFAULTS, SETTINGS_FILE_SCHEMA, SETTINGS_SCHEMA,
  type SettingsFile, settingsPath, settingsTemporaryPath,
} from "./schema.ts";
import { settingsValues, readSettingsFile, requireEnabledComposition } from "./read.ts";
import type { NotifyEntry, SettingsRepair } from "../types/settings.ts";
import type { ThinkingLevel } from "../types/policy.ts";

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

/** Write a candidate settings root only after schema and composition validation. The write is
 * tmp+rename so a crash mid-write cannot truncate settings.json — the settings watcher only ever
 * reads a complete file. */
export function writeSettingsRoot(orchDir: string, candidate: unknown): void {
  const file = settingsPath(orchDir);
  const updated = SETTINGS_FILE_SCHEMA.parse(candidate);
  requireEnabledComposition(file, updated);
  ensurePrivateDir(orchDir);
  const tmp = settingsTemporaryPath(file);
  filesystem.writeFileSync(tmp, JSON.stringify(updated, null, 2) + "\n");
  filesystem.renameSync(tmp, file);
}

/** Apply one schema-validated mutation to `$orchDir/settings.json` via whole-file JSON round-trip. An invalid composition (defaults outside the enabled sets) never lands on disk — write `enabled` before `defaults`. */
function updateSettingsFile(orchDir: string, mutate: (root: Partial<SettingsFile>) => Partial<SettingsFile>): void {
  const file = settingsPath(orchDir);
  // The seed for a brand-new file is deliberately incomplete: `runtime` is required and has
  // no default, so setup must record it (writeSettingsRuntime) before any other write lands.
  const root: Partial<SettingsFile> = readSettingsFile(file) ?? { schemaVersion: SETTINGS_SCHEMA };
  writeSettingsRoot(orchDir, mutate(root));
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
export function writeSettingsValue(orchDir: string, key: string, value: unknown): void {
  const segments = key.split(".");
  updateSettingsFile(orchDir, (root) => setSettingsPath(root, segments, value));
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
export function applySettingsRepairs(orchDir: string, repairs: readonly SettingsRepair[]): void {
  // Choosing nothing writes nothing. Falling through to the validator would reject the very
  // file the person just decided to leave as it is, and report that decision as an error.
  if (repairs.length === 0) return;
  const file = settingsPath(orchDir);
  const parsed: unknown = JSON.parse(filesystem.readFileSync(file, "utf8"));
  if (!isRecord(parsed)) throw new Error(`${file}: settings root must be an object`);
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

  writeSettingsRoot(orchDir, candidate);
}

/** Remove one setting from settings.json so its default wins again, through the same
 *  whole-file validator as every write. Removing an absent key is a no-op, not an error. */
export function clearSettingsValue(orchDir: string, key: string): void {
  const segments = key.split(".");
  updateSettingsFile(orchDir, (root) => deleteSettingsPath(root, segments));
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
