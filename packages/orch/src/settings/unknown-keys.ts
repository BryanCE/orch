// A key this build's schema does not declare is a typo or a key a newer build added.
// A typo is refused; a newer key is kept on disk and ignored, so a new setting never
// breaks an older orch that is still running.
import { valueAtPath } from "../util.ts";
import { misspelledKey } from "./nearest.ts";
import { schemaKeyPaths } from "./schema-tree.ts";
import { SETTINGS_DEFAULTS, SETTINGS_FILE_SCHEMA, type SettingsFile } from "./schema.ts";

export interface UnknownKey {
  readonly at: readonly string[];
  readonly value: unknown;
}

/** Every key in the raw file that this build's schema does not declare. */
function unknownKeys(raw: unknown): UnknownKey[] {
  const result = SETTINGS_FILE_SCHEMA.safeParse(raw);
  if (result.success) return [];
  return result.error.issues.flatMap((issue) => issue.code !== "unrecognized_keys" ? [] : issue.keys.map((key) => {
    const at = [...issue.path.map(String), key];
    return { at, value: valueAtPath(raw, at) };
  }));
}

function parentAt(root: unknown, at: readonly string[]): object | undefined {
  const parent = valueAtPath(root, at.slice(0, -1));
  return typeof parent === "object" && parent !== null ? parent : undefined;
}

/** A deep copy of `root` without the keys. */
function withoutKeys(root: unknown, keys: readonly UnknownKey[]): unknown {
  const copy: unknown = structuredClone(root);
  for (const key of keys) {
    const parent = parentAt(copy, key.at);
    const name = key.at.at(-1);
    if (parent !== undefined && name !== undefined) Reflect.deleteProperty(parent, name);
  }
  return copy;
}

/** A deep copy of `root` with the keys put back, where their parent still exists. */
export function withKeys(root: unknown, keys: readonly UnknownKey[]): unknown {
  const copy: unknown = structuredClone(root);
  for (const key of keys) {
    const parent = parentAt(copy, key.at);
    const name = key.at.at(-1);
    if (parent !== undefined && name !== undefined) Reflect.set(parent, name, key.value);
  }
  return copy;
}

export interface Typo {
  readonly key: UnknownKey;
  readonly meant: string;
}

export interface SettingsKeyCheck {
  /** The file validated without its unknown keys. */
  readonly result: ReturnType<typeof SETTINGS_FILE_SCHEMA.safeParse>;
  readonly typos: readonly Typo[];
  readonly newer: readonly UnknownKey[];
}

function typoMaxEdits(settings: SettingsFile | undefined): number {
  return settings?.settings_file?.typo_max_edits ?? SETTINGS_DEFAULTS.settings_file.typo_max_edits;
}

/** Validate the declared keys, and sort each unknown key into a typo or a key a newer build added. */
export function checkSettingsKeys(raw: unknown): SettingsKeyCheck {
  const unknown = unknownKeys(raw);
  const result = SETTINGS_FILE_SCHEMA.safeParse(withoutKeys(raw, unknown));
  const maxEdits = typoMaxEdits(result.success ? result.data : undefined);
  const typos: Typo[] = [];
  const newer: UnknownKey[] = [];
  for (const key of unknown) {
    const meant = misspelledKey(key.at.join("."), schemaKeyPaths(), maxEdits);
    if (meant === undefined) newer.push(key);
    else typos.push({ key, meant });
  }
  return { result, typos, newer };
}
