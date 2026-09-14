import { ENTER_ALT_SCREEN, EXIT_ALT_SCREEN } from "../../tui/screen.ts";
import type { SettingsManager } from "../../types/services.ts";
import type { OrchSettings } from "../../types/settings.ts";
import { createEditorState } from "../editor.ts";
import { browseOnce, editFocused } from "./edit.ts";
import { repairSettingsFile } from "./repair-screen.ts";
import { loadEntries, type Session } from "./state.ts";

/** Run the interactive settings editor. It owns no settings logic: all edits go through the reducer. */
export async function runSettingsEditor(manager: SettingsManager, settings: OrchSettings): Promise<void> {
  process.stdout.write(ENTER_ALT_SCREEN);
  try {
    if (!await repairSettingsFile(manager)) return;
    const session: Session = {
      state: createEditorState(loadEntries(manager, settings)),
      filter: "",
      status: undefined,
      quit: false,
      escapeClearedFilter: false,
    };
    while (!session.quit) {
      const outcome = await browseOnce(session, manager, settings);
      if (outcome === "quit") return;
      if (outcome === "again") continue;
      await editFocused(session, manager, settings);
    }
  } finally {
    process.stdout.write(EXIT_ALT_SCREEN);
  }
}
