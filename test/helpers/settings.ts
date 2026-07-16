import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SETTINGS_SCHEMA } from "../../src/config.ts";

/** Derive an `installed` composition from `defaults.adapter`/`defaults.backend` so fixtures that only set
 * a default stay valid under settings.json's membership validation, unless the fixture already specifies one. */
function deriveInstalled(settings: Record<string, unknown>): { adapters: string[]; backends: string[] } | undefined {
  if ("installed" in settings) return undefined;
  const defaults = settings.defaults as Record<string, unknown> | undefined;
  const adapter = defaults?.adapter;
  const backend = defaults?.backend;
  if (typeof adapter !== "string" && typeof backend !== "string") return undefined;
  return {
    adapters: typeof adapter === "string" ? [adapter] : [],
    backends: typeof backend === "string" ? [backend] : [],
  };
}

/** Write a schemaVersion-stamped settings.json fixture into an orch dir. Returns the file path. */
export function writeSettingsFixture(orchDir: string, settings: Record<string, unknown> = {}): string {
  mkdirSync(orchDir, { recursive: true });
  const file = join(orchDir, "settings.json");
  const installed = deriveInstalled(settings);
  const body = installed ? { installed, ...settings } : settings;
  writeFileSync(file, JSON.stringify({ schemaVersion: SETTINGS_SCHEMA, ...body }, null, 2) + "\n");
  return file;
}
