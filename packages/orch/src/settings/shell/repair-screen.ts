import { getColumns, getRows, isCancel, Prompt } from "@clack/core";
import type { SettingsManager } from "../../types/services.ts";
import { errorMessage } from "../../util.ts";
import { CLEAR_SCREEN } from "../../tui/screen.ts";
import type { RepairChoice, RepairState } from "../../types/settings.ts";
import type { RepairScreen } from "../view.ts";
import { repairFrame } from "../view.ts";
import { settingsDefects } from "../defects.ts";
import { createRepairState, plannedRepairs, repairReducer } from "../repair.ts";
import { applySettingsRepairs } from "../write.ts";

/** The keys the repair screen answers to, and what each one chooses. */
const REPAIR_KEYS: Record<string, RepairChoice> = { r: "rename", s: "set", d: "drop", l: "leave" };

/** One repair pass: choose an action per defect until Enter saves or Escape leaves. */
async function repairOnce(state: RepairState, file: string, status: string | undefined): Promise<RepairState | null> {
  const session = { state, status };
  process.stdout.write(CLEAR_SCREEN);
  const screen = (): RepairScreen => ({
    file,
    defects: session.state.defects,
    choices: session.state.choices,
    focusedIndex: session.state.focusedIndex,
    status: session.state.reason ?? session.status,
  });
  const prompt = new Prompt<undefined>({
    render: () => repairFrame(screen(), getColumns(process.stdout), getRows(process.stdout)),
  }, false);
  prompt.on("key", (char, info) => {
    if (info.name === "return" || info.name === "escape") return;
    session.status = undefined;
    if (info.name === "up" || info.name === "down") {
      session.state = repairReducer(session.state, { type: "move", direction: info.name });
      return;
    }
    const choice = typeof char === "string" ? REPAIR_KEYS[char.toLowerCase()] : undefined;
    if (choice !== undefined) session.state = repairReducer(session.state, { type: "choose", choice });
  });
  const answer = await prompt.prompt();
  return isCancel(answer) ? null : session.state;
}

/**
 * Bring settings.json to a state the schema accepts, or report that the person chose to
 * leave it as it is.
 *
 * This runs BEFORE the editor because the editor cannot exist without a file it can load —
 * and refusing to open is what left a person with a diagnosis and no tool. Nothing is
 * written until they save, and a defect they leave alone survives untouched: a key one
 * letter off a real one holds a value they typed, and orch is not entitled to decide it
 * was junk.
 */
export async function repairSettingsFile(manager: SettingsManager): Promise<boolean> {
  const file = manager.file;
  let status: string | undefined;
  for (;;) {
    const defects = settingsDefects(file);
    if (defects.length === 0) return true;
    const chosen = await repairOnce(createRepairState(defects), file, status);
    if (chosen === null) return false;
    const repairs = plannedRepairs(chosen);
    if (repairs.length === 0) {
      status = "nothing chosen yet - r/s/d picks a fix for the focused key, esc leaves the file untouched";
      continue;
    }
    try {
      applySettingsRepairs(manager, repairs);
      status = `applied ${repairs.length} ${repairs.length === 1 ? "repair" : "repairs"}`;
    } catch (error: unknown) {
      status = errorMessage(error);
    }
  }
}
