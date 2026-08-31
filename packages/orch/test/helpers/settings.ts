import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SETTINGS_SCHEMA } from "../../src/settings/schema.ts";
import { isRecord } from "../../src/util.ts";

/** Derive an `enabled` composition from `defaults.adapter`/`defaults.backend` so fixtures that only set
 * a default stay valid under settings.json's membership validation, unless the fixture already specifies one. */
function deriveEnabled(settings: Record<string, unknown>): { adapters: string[]; backends: string[] } | undefined {
  if ("enabled" in settings) return undefined;
  const defaults = isRecord(settings.defaults) ? settings.defaults : undefined;
  const adapter = defaults?.adapter;
  const backend = defaults?.backend;
  if (typeof adapter !== "string" && typeof backend !== "string") return undefined;
  return {
    adapters: typeof adapter === "string" ? [adapter] : [],
    backends: typeof backend === "string" ? [backend] : [],
  };
}

/** Write a schemaVersion-stamped settings.json fixture into an orch dir. Returns the file path.
 * `runtime` is a required top-level key with no default-on-read, so fixtures get `node` unless
 * they declare their own — a fixture testing the absent/invalid runtime passes it explicitly. */
export function writeSettingsFixture(orchDir: string, settings: Record<string, unknown> = {}): string {
  mkdirSync(orchDir, { recursive: true });
  const file = join(orchDir, "settings.json");
  const enabled = deriveEnabled(settings);
  // Any daemon a test auto-starts must reap itself fast: one idle minute, not
  // the production default — a leaked test daemon pins its temp dir and lives
  // past the whole run.
  const daemon = "daemon" in settings ? {} : { daemon: { idle_shutdown_minutes: 1 } };
  const body = enabled ? { enabled, ...daemon, ...settings } : { ...daemon, ...settings };
  writeFileSync(file, JSON.stringify({ schemaVersion: SETTINGS_SCHEMA, runtime: "node", ...body }, null, 2) + "\n");
  return file;
}
