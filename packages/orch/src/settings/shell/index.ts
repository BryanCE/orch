import { ENTER_ALT_SCREEN, EXIT_ALT_SCREEN } from "../../tui/screen.ts";
import type { SettingsManager } from "../../types/services.ts";
import { createEditorState } from "../editor.ts";
import { browseOnce, editFocused } from "./edit.ts";
import { repairSettingsFile } from "./repair-screen.ts";
import { loadEntries, type Session } from "./state.ts";

/** Run the interactive settings editor. It owns no settings logic: all edits go through the reducer. */
export async function runSettingsEditor(manager: SettingsManager): Promise<void> {
  process.stdout.write(ENTER_ALT_SCREEN);
  try {
    if (!await repairSettingsFile(manager)) return;
    const session: Session = {
      state: createEditorState(loadEntries(manager)),
      filter: "",
      searching: false,
      status: undefined,
      quit: false,
      filterKeySpent: false,
    };
    while (!session.quit) {
      const outcome = await browseOnce(session, manager);
      if (outcome === "quit") return;
      if (outcome === "again") continue;
      await editFocused(session, manager);
    }
  } finally {
    process.stdout.write(EXIT_ALT_SCREEN);
  }
}
