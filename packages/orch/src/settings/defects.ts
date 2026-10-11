import { readFileSync } from "node:fs";
import type { SettingsDefect } from "../types/settings.ts";
import { errorMessage, errnoCode, valueAtPath } from "../util.ts";
import { pinnedSchemaValue } from "./schema-tree.ts";
import { checkSettingsKeys } from "./unknown-keys.ts";

export type RawSettings =
  | { readonly kind: "absent" }
  | { readonly kind: "parsed"; readonly parsed: unknown }
  | { readonly kind: "broken"; readonly reason: string };

export function readSettingsFile(file: string): RawSettings {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (error: unknown) {
    if (errnoCode(error) === "ENOENT") return { kind: "absent" };
    throw error;
  }
  try {
    return { kind: "parsed", parsed: JSON.parse(text) };
  } catch (error: unknown) {
    return { kind: "broken", reason: errorMessage(error) };
  }
}

/** What this build cannot read: a misspelled key or a bad value. A newer build's key is not a defect. */
export function settingsDefectsOf(parsed: unknown): readonly SettingsDefect[] {
  const { result, typos } = checkSettingsKeys(parsed);
  const misspelled = typos.map((typo): SettingsDefect => ({ path: typo.key.at.join("."), value: typo.key.value, problem: "not a settings key", suggestion: typo.meant }));
  if (result.success) return misspelled;
  return [...misspelled, ...result.error.issues.map((issue): SettingsDefect => {
    const path = issue.path.join(".");
    const expected = pinnedSchemaValue(path);
    return { path, value: valueAtPath(parsed, issue.path), problem: issue.message, ...(expected === undefined ? {} : { expected }) };
  })];
}

/** What this build cannot read: bad JSON, a misspelled key, or a bad value. A newer build's key is not a defect. */
export function settingsDefects(file: string): readonly SettingsDefect[] {
  const raw = readSettingsFile(file);
  if (raw.kind === "absent") return [];
  if (raw.kind === "broken") return [{ path: "", value: undefined, problem: `not valid JSON: ${raw.reason}` }];
  return settingsDefectsOf(raw.parsed);
}

/** The keys a newer build added: this build keeps them on disk and ignores them. */
export function newerSettingsKeys(file: string): string[] {
  const raw = readSettingsFile(file);
  if (raw.kind !== "parsed") return [];
  return checkSettingsKeys(raw.parsed).newer.map((key) => key.at.join("."));
}
