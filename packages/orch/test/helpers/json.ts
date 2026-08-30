import { readFileSync } from "node:fs";
import { isRecord } from "../../src/util.ts";

/** Read a JSON file that must contain an object, failing at the boundary otherwise. */
export function readJsonRecord(file: string): Record<string, unknown> {
  const value: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!isRecord(value)) throw new Error(`JSON file ${file} must contain an object`);
  return value;
}
