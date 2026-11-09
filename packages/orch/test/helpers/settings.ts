import type { OrchDir } from "../../src/types/core.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import { SETTINGS_SCHEMA, settingsPath } from "../../src/settings/schema.ts";
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

/** The settings.json text a fixture would write. Same shape rules as `writeSettingsFixture`. */
export function settingsFixtureText(settings: Record<string, unknown> = {}): string {
  const enabled = deriveEnabled(settings);
  const body = enabled ? { enabled, ...settings } : { ...settings };
  return JSON.stringify({ schemaVersion: SETTINGS_SCHEMA, runtime: "node", ...body }, null, 2) + "\n";
}

/** Write a schemaVersion-stamped settings.json fixture into an orch dir. Returns the file path.
 * `runtime` is a required top-level key with no default-on-read, so fixtures get `node` unless
 * they declare their own — a fixture testing the absent/invalid runtime passes it explicitly. */
export function writeSettingsFixture(orchDir: OrchDir, settings: Record<string, unknown> = {}): string {
  mkdirSync(orchDir, { recursive: true });
  const file = settingsPath(orchDir);
  writeFileSync(file, settingsFixtureText(settings));
  return file;
}
