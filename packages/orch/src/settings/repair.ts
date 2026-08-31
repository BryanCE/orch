import type {
  RepairAction,
  RepairChoice,
  RepairState,
  SettingsDefect,
  SettingsRepair,
} from "../types/settings.ts";

/** Return the choices that are meaningful for one settings defect. */
export function repairChoicesFor(defect: SettingsDefect): readonly RepairChoice[] {
  const choices: RepairChoice[] = [];
  if (defect.suggestion !== undefined) choices.push("rename");
  if (defect.expected !== undefined) choices.push("set");
  if (defect.path !== "") choices.push("drop");
  choices.push("leave");
  return choices;
}

/** Create a repair screen state with every defect initially left untouched. */
export function createRepairState(defects: readonly SettingsDefect[]): RepairState {
  return {
    defects,
    choices: defects.map((): RepairChoice => "leave"),
    focusedIndex: 0,
  };
}

/** Apply one repair-screen action without mutating the existing state. */
export function repairReducer(state: RepairState, action: RepairAction): RepairState {
  if (state.defects.length === 0) return state;

  switch (action.type) {
    case "move": {
      const delta = action.direction === "down" ? 1 : -1;
      const focusedIndex = Math.max(
        0,
        Math.min(state.defects.length - 1, state.focusedIndex + delta),
      );
      return { ...state, focusedIndex, reason: undefined };
    }
    case "choose": {
      const defect = state.defects[state.focusedIndex];
      if (defect === undefined) return state;
      if (!repairChoicesFor(defect).includes(action.choice)) {
        return { ...state, reason: refusedChoiceReason(defect, action.choice) };
      }
      const choices = state.choices.map((choice, index) =>
        index === state.focusedIndex ? action.choice : choice,
      );
      return { ...state, choices, reason: undefined };
    }
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

function refusedChoiceReason(defect: SettingsDefect, choice: RepairChoice): string {
  const label = defect.path === "" ? "The settings file" : defect.path;
  switch (choice) {
    case "rename":
      return `${label} has no suggested key to rename to`;
    case "set":
      return `${label} has no expected value to set`;
    case "drop":
      return `${label} cannot be dropped`;
    case "leave":
      return `${label} cannot refuse leaving the defect`;
    default: {
      const _exhaustive: never = choice;
      return _exhaustive;
    }
  }
}

/** Convert the choices in state into the edits a caller may apply. */
export function plannedRepairs(state: RepairState): readonly SettingsRepair[] {
  const repairs: SettingsRepair[] = [];
  for (const [index, defect] of state.defects.entries()) {
    const choice = state.choices[index];
    if (choice === undefined || choice === "leave") continue;

    switch (choice) {
      case "rename":
        if (defect.suggestion !== undefined) {
          repairs.push({ kind: "rename", from: defect.path, to: defect.suggestion });
        }
        break;
      case "set":
        if (defect.expected !== undefined) {
          repairs.push({ kind: "set", path: defect.path, value: defect.expected });
        }
        break;
      case "drop":
        repairs.push({ kind: "drop", path: defect.path });
        break;
      default: {
        const _exhaustive: never = choice;
        return _exhaustive;
      }
    }
  }
  return repairs;
}
