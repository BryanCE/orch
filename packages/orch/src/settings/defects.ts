import { readFileSync } from "node:fs";
import type { SettingsDefect } from "../types/settings.ts";
import { errorMessage, errnoCode, valueAtPath } from "../util.ts";
import { pinnedSchemaValue } from "./schema-tree.ts";
import { checkSettingsKeys } from "./unknown-keys.ts";

type RawSettings = { readonly found: false } | { readonly found: true; readonly parsed: unknown } | { readonly found: true; readonly broken: string };

function readRawSettings(file: string): RawSettings {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (error: unknown) {
    if (errnoCode(error) === "ENOENT") return { found: false };
    throw error;
  }
  try {
    return { found: true, parsed: JSON.parse(text) };
  } catch (error: unknown) {
    return { found: true, broken: errorMessage(error) };
  }
}

/** What this build cannot read: bad JSON, a misspelled key, or a bad value. A newer build's key is not a defect. */
export function settingsDefects(file: string): readonly SettingsDefect[] {
  const raw = readRawSettings(file);
  if (!raw.found) return [];
  if ("broken" in raw) return [{ path: "", value: undefined, problem: `not valid JSON: ${raw.broken}` }];
  const { result, typos } = checkSettingsKeys(raw.parsed);
  const misspelled = typos.map((typo): SettingsDefect => ({ path: typo.key.at.join("."), value: typo.key.value, problem: "not a settings key", suggestion: typo.meant }));
  if (result.success) return misspelled;
  return [...misspelled, ...result.error.issues.map((issue): SettingsDefect => {
    const path = issue.path.join(".");
    const expected = pinnedSchemaValue(path);
    return { path, value: valueAtPath(raw.parsed, issue.path), problem: issue.message, ...(expected === undefined ? {} : { expected }) };
  })];
}

/** The keys a newer build added: this build keeps them on disk and ignores them. */
export function newerSettingsKeys(file: string): string[] {
  const raw = readRawSettings(file);
  if (!raw.found || "broken" in raw) return [];
  return checkSettingsKeys(raw.parsed).newer.map((key) => key.at.join("."));
}
