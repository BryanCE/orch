import { ENTER_ALT_SCREEN, EXIT_ALT_SCREEN } from "../../tui/screen.ts";
import type { SettingsManager } from "../../types/services.ts";
import type { HarnessOffers } from "../../setup/composition.ts";
import { createEditorState } from "../editor.ts";
import { browseOnce, editFocused } from "./edit.ts";
import { repairSettingsFile } from "./repair-screen.ts";
import { activeManager, loadEntries, type Session } from "./state.ts";

export interface SettingsViews { readonly install: SettingsManager; readonly project: SettingsManager | null }

/** Run the interactive settings editor. It owns no settings logic: all edits go through the reducer. */
export async function runSettingsEditor(views: SettingsViews, offers: HarnessOffers): Promise<void> {
  process.stdout.write(ENTER_ALT_SCREEN);
  try {
    if (!await repairSettingsFile(views.install)) return;
    const session: Session = {
      state: createEditorState(loadEntries(views.project ?? views.install)),
      views,
      view: views.project === null ? "install" : "project",
      filter: "",
      searching: false,
      status: undefined,
      quit: false,
      filterKeySpent: false,
    };
    while (!session.quit) {
      const outcome = await browseOnce(session, activeManager(session));
      if (outcome === "quit") return;
      if (outcome === "again") continue;
      await editFocused(session, activeManager(session), offers);
    }
  } finally {
    process.stdout.write(EXIT_ALT_SCREEN);
  }
}
