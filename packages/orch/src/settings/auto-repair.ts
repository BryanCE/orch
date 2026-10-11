import { settingsDefectsOf, readSettingsFile } from "./defects.ts";
import { automaticRepairState, plannedRepairs } from "./repair.ts";
import { repairActionLabel } from "./view.ts";
import { repairSettingsRoot, writeSettingsRoot } from "./write.ts";
import { planSettingsMigration, type SettingsMigration } from "../update/settings-migrations.ts";
import { isRecord } from "../util.ts";
import type { SettingsManager } from "../types/services.ts";

export type SettingsRepairPlan =
  | { readonly kind: "clean" }
  /** Bad JSON, or a file from a newer orch: nothing here can mend it. */
  | { readonly kind: "unrepairable"; readonly reason: string }
  | { readonly kind: "repair"; readonly changes: readonly string[]; readonly repaired: Record<string, unknown> };

/** Pure: converter chain first (one change line per step), then automatic key repairs on the migrated root. */
export function planSettingsRepair(raw: unknown, migrations?: readonly SettingsMigration[]): SettingsRepairPlan {
  const migration = planSettingsMigration(raw, migrations);
  let root: unknown;
  let migrationTarget: number | undefined;
  let changes: readonly string[];
  switch (migration.kind) {
    case "current":
    case "unversioned":
      root = raw;
      changes = [];
      break;
    case "newer":
      return { kind: "unrepairable", reason: `settings schema ${migration.found} is newer than this orch's schema ${migration.current}. Run: orch update` };
    case "migrate":
      root = migration.migrated;
      migrationTarget = migration.to;
      changes = migration.steps;
      break;
    default: {
      const exhaustive: never = migration;
      return exhaustive;
    }
  }

  const defects = settingsDefectsOf(root).filter((defect) =>
    !(defect.path === "schemaVersion" && migrationTarget !== undefined && isRecord(root) && root.schemaVersion === migrationTarget),
  );
  let repaired: Record<string, unknown>;
  if (defects.length === 0) {
    if (!isRecord(root)) return { kind: "clean" };
    repaired = { ...root };
  } else {
    const state = automaticRepairState(defects);
    if (state === null) {
      const defect = defects[0];
      return { kind: "unrepairable", reason: defect === undefined ? "settings defects cannot be repaired automatically" : `${defect.path || "settings.json"}: ${defect.problem}` };
    }
    const repairs = plannedRepairs(state);
    changes = [
      ...changes,
      ...state.defects.map((defect, index) => `${defect.path}: ${repairActionLabel(defect, state.choices[index] ?? "leave")}`),
    ];
    repaired = repairSettingsRoot(isRecord(root) ? root : {}, repairs);
  }

  return changes.length === 0 ? { kind: "clean" } : { kind: "repair", changes, repaired };
}

/** Read settings.json, plan, and on `repair` return the plan plus an apply that re-plans under the write lock (the file may have changed since). */
export function settingsRepair(settings: SettingsManager): { readonly plan: SettingsRepairPlan; readonly apply: () => void } {
  const raw = readSettingsFile(settings.file);
  if (raw.kind === "absent") return { plan: { kind: "clean" }, apply: () => undefined };
  if (raw.kind === "broken") {
    return { plan: { kind: "unrepairable", reason: `settings.json is not valid JSON: ${raw.reason}` }, apply: () => undefined };
  }
  const plan = planSettingsRepair(raw.parsed);
  if (plan.kind !== "repair") return { plan, apply: () => undefined };
  return {
    plan,
    apply: () => writeSettingsRoot(settings, (current) => {
      const currentPlan = planSettingsRepair(current);
      switch (currentPlan.kind) {
        case "repair":
          return currentPlan.repaired;
        case "clean":
          if (!isRecord(current)) throw new Error(`${settings.file}: settings root must be an object`);
          return { ...current };
        case "unrepairable":
          throw new Error(`${settings.file}: ${currentPlan.reason}`);
        default: {
          const exhaustive: never = currentPlan;
          return exhaustive;
        }
      }
    }),
  };
}
