import { ENTER_ALT_SCREEN, EXIT_ALT_SCREEN } from "../../tui/screen.ts";
import type { HarnessOffers } from "../../setup/composition.ts";
import { createEditorState } from "../editor.ts";
import { browseOnce, editFocused } from "./edit.ts";
import { repairSettingsFile } from "./repair-screen.ts";
import { loadEntries, type SaveMode, type Session, type SettingsLayers } from "./state.ts";

/** Run the interactive settings editor: every row as it stands here, every edit to the file `save`
 *  names. It owns no settings logic: all edits go through the reducer. */
export async function runSettingsEditor(layers: SettingsLayers, save: SaveMode, offers: HarnessOffers): Promise<void> {
  process.stdout.write(ENTER_ALT_SCREEN);
  try {
    if (!await repairSettingsFile(layers.install)) return;
    const session: Session = {
      state: createEditorState(loadEntries(layers)),
      layers,
      save,
      filter: "",
      searching: false,
      status: undefined,
      quit: false,
      filterKeySpent: false,
    };
    while (!session.quit) {
      const outcome = await browseOnce(session);
      if (outcome === "quit") return;
      if (outcome === "again") continue;
      await editFocused(session, offers);
    }
  } finally {
    process.stdout.write(EXIT_ALT_SCREEN);
  }
}
