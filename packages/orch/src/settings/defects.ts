import { readFileSync } from "node:fs";
import type { SettingsDefect } from "../types/settings.ts";
import { errorMessage, errnoCode, valueAtPath } from "../util.ts";
import { misspelledKey } from "./nearest.ts";
import { pinnedSchemaValue, schemaKeyPaths } from "./schema-tree.ts";
import { SETTINGS_FILE_SCHEMA } from "./schema.ts";

function candidatePaths(root: unknown): readonly string[] {
  return schemaKeyPaths().filter((candidate) => valueAtPath(root, candidate.split(".")) === undefined);
}

export function settingsDefects(file: string): readonly SettingsDefect[] {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (error: unknown) {
    if (errnoCode(error) === "ENOENT") return [];
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error: unknown) {
    return [{ path: "", value: undefined, problem: `not valid JSON: ${errorMessage(error)}` }];
  }

  const result = SETTINGS_FILE_SCHEMA.safeParse(parsed);
  if (result.success) return [];

  const candidates = candidatePaths(parsed);
  const defects: SettingsDefect[] = [];
  for (const issue of result.error.issues) {
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) {
        const issuePath = [...issue.path, key];
        const path = issuePath.join(".");
        const suggestion = misspelledKey(path, candidates);
        defects.push({
          path,
          value: valueAtPath(parsed, issuePath),
          problem: "not a settings key",
          ...(suggestion === undefined ? {} : { suggestion }),
        });
      }
      continue;
    }

    const path = issue.path.join(".");
    const expected = pinnedSchemaValue(path);
    defects.push({
      path,
      value: valueAtPath(parsed, issue.path),
      problem: issue.message,
      ...(expected === undefined ? {} : { expected }),
    });
  }
  return defects;
}

