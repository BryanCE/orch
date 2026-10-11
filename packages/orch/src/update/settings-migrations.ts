import { isRecord } from "../util.ts";

/** One step that moves a raw settings.json root up exactly one schemaVersion. Which version it moves
 *  from is its index in SETTINGS_MIGRATIONS (index i: version i+1 -> i+2); it carries no number of its own. */
export interface SettingsMigration {
  /** One plain sentence a person reads before it runs, e.g. "locked_commands is now { commands, applies_to }; your commands carry over". */
  readonly summary: string;
  readonly migrate: (root: Readonly<Record<string, unknown>>) => Record<string, unknown>;
}

/** Every released settings shape change, oldest first. A breaking change appends one step; a released
 *  step is never edited or removed. SETTINGS_SCHEMA is derived from this list's length. */
export const SETTINGS_MIGRATIONS: readonly SettingsMigration[] = [];

export type SettingsMigrationOutcome =
  | { readonly kind: "current" }
  /** No integer schemaVersion, or not an object: the defect path reports it; nothing to migrate. */
  | { readonly kind: "unversioned" }
  | { readonly kind: "newer"; readonly found: number; readonly current: number }
  | {
      readonly kind: "migrate";
      readonly from: number;
      readonly to: number;
      /** One line per step: `schemaVersion <n> -> <n+1>: <summary>`. */
      readonly steps: readonly string[];
      readonly migrated: Record<string, unknown>;
    };

export function planSettingsMigration(
  root: unknown,
  migrations: readonly SettingsMigration[] = SETTINGS_MIGRATIONS,
): SettingsMigrationOutcome {
  const current = migrations.length + 1;
  if (!isRecord(root) || !Number.isInteger(root.schemaVersion) || typeof root.schemaVersion !== "number" || root.schemaVersion <= 0) {
    return { kind: "unversioned" };
  }

  const from = root.schemaVersion;
  if (from === current) return { kind: "current" };
  if (from > current) return { kind: "newer", found: from, current };

  let migrated: Record<string, unknown> = { ...root };
  const steps: string[] = [];
  for (const [index, migration] of migrations.entries()) {
    const version = index + 1;
    if (version < from) continue;
    migrated = { ...migration.migrate(migrated), schemaVersion: version + 1 };
    steps.push(`schemaVersion ${version} -> ${version + 1}: ${migration.summary}`);
  }

  return { kind: "migrate", from, to: current, steps, migrated };
}
