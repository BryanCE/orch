import { settingsDefects } from "./defects.ts";
import { automaticRepairState, plannedRepairs } from "./repair.ts";
import { repairActionLabel } from "./view.ts";
import { applySettingsRepairs } from "./write.ts";
import type { SettingsManager } from "../types/services.ts";

/** What the automatic repair will change, one line per key; null when nothing needs it. */
export interface AutomaticSettingsRepair {
  readonly changes: readonly string[];
  readonly apply: () => void;
}

/** Bring a settings.json this build cannot read forward to the current shape, keeping every key
 *  it can still read. Null when the file reads clean, or holds a defect no repair can fix (bad
 *  JSON), which only a person or a full re-record can mend. */
export function automaticSettingsRepair(settings: SettingsManager): AutomaticSettingsRepair | null {
  const defects = settingsDefects(settings.file);
  if (defects.length === 0) return null;
  const state = automaticRepairState(defects);
  if (state === null) return null;
  const repairs = plannedRepairs(state);
  return {
    changes: state.defects.map((defect, index) => `${defect.path}: ${repairActionLabel(defect, state.choices[index] ?? "leave")}`),
    apply: () => applySettingsRepairs(settings, repairs),
  };
}
