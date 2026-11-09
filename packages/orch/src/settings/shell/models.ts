import type { HarnessOffers } from "../../setup/composition.ts";
import type { EditingState } from "../../types/settings.ts";
import type { SettingsManager } from "../../types/services.ts";
import { CLEAR_SCREEN } from "../../tui/screen.ts";
import { errorMessage } from "../../util.ts";
import { recordHarnessModels, resolveHarnessModels } from "../../setup/composition.ts";
import { cancelEdit, reloadRows, type Session } from "./state.ts";

/** Pick each enabled harness's default and allowed models from what the harness lists, the
 *  same picker `orch settings models` runs, so a model row never takes a name no harness knows. */
export async function editModels(session: Session, manager: SettingsManager, offers: HarnessOffers, editing: EditingState): Promise<void> {
  process.stdout.write(CLEAR_SCREEN);
  const current = manager.current();
  const chosen = await resolveHarnessModels(current, offers, undefined, current.enabled.adapters, true);
  if (chosen === null) return cancelEdit(session, editing);
  try {
    recordHarnessModels(manager, current, chosen);
    session.status = "models saved";
  } catch (error: unknown) {
    session.status = errorMessage(error);
  }
  reloadRows(session, manager, editing.focused.spec.key);
}
