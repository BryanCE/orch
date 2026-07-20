import { PRESENCE_SCHEMA } from "../../src/presence/schema.ts";
import { presenceAgentDir, writeStatus } from "../../src/presence/writer.ts";
import { mkdirSync } from "node:fs";

/** Seed a presence status record the way a real harness writer does: stamped with
 *  the current PRESENCE_SCHEMA and written through the shared presence writer, so
 *  a schema bump carries every fixture with it instead of rotting them. */
export function seedStatus(root: string, key: string, status: Record<string, unknown>): string {
  const directory = presenceAgentDir(key, root);
  mkdirSync(directory, { recursive: true });
  writeStatus(directory, { schema: PRESENCE_SCHEMA, ...status });
  return directory;
}

/** Seed a status record into an already-resolved presence directory. */
export function seedStatusInDir(directory: string, status: Record<string, unknown>): void {
  mkdirSync(directory, { recursive: true });
  writeStatus(directory, { schema: PRESENCE_SCHEMA, ...status });
}
