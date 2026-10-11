import { describe, expect, test } from "bun:test";
import { planSettingsRepair } from "../src/settings/auto-repair.ts";
import type { SettingsMigration } from "../src/update/settings-migrations.ts";
import { isRecord } from "../src/util.ts";

function settingsRoot(schemaVersion: number): Record<string, unknown> {
  return {
    schemaVersion,
    runtime: "node",
    enabled: { adapters: [], backends: [] },
    fleet: { max_dpeth: 3 },
  };
}

const migrations: readonly SettingsMigration[] = [
  {
    summary: "the settings shape advances",
    migrate: (root) => {
      const fleet = root.fleet;
      if (!isRecord(fleet)) throw new Error("expected a fleet settings object");
      return { ...root, fleet: { ...fleet, max_agents_total: 8 } };
    },
  },
];

describe("settings repair planning", () => {
  test("migrates before repairing misspelled keys", () => {
    const plan = planSettingsRepair(settingsRoot(migrations.length), migrations);
    expect(plan.kind).toBe("repair");
    if (plan.kind !== "repair") throw new Error("expected a repair plan");
    expect(plan.changes[0]).toBe("schemaVersion 1 -> 2: the settings shape advances");
    expect(plan.repaired.schemaVersion).toBe(migrations.length + 1);
    expect(plan.repaired.fleet).toMatchObject({ max_depth: 3, max_agents_total: 8 });
  });

  test("refuses a settings file from a newer schema", () => {
    expect(planSettingsRepair(settingsRoot(migrations.length + 2), migrations)).toMatchObject({ kind: "unrepairable" });
  });

  test("leaves a clean current root alone", () => {
    expect(planSettingsRepair({ schemaVersion: 1, runtime: "node", enabled: { adapters: [], backends: [] } })).toEqual({ kind: "clean" });
  });
});
