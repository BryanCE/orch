import type { HarnessOffers } from "../../setup/composition.ts";
import type { EditingState } from "../../types/settings.ts";
import type { SettingsManager } from "../../types/services.ts";
import { CLEAR_SCREEN } from "../../tui/screen.ts";
import { resolveCouncilModels } from "../../setup/composition.ts";
import { commitPick, type Session } from "./state.ts";

/** Pick the council's members harness by harness, from the models each one lists and may
 *  launch, so the row never takes a model `models.allowed` would refuse. */
export async function editLineup(session: Session, manager: SettingsManager, offers: HarnessOffers, editing: EditingState): Promise<void> {
  process.stdout.write(CLEAR_SCREEN);
  const current = manager.current();
  commitPick(session, manager, editing, await resolveCouncilModels(current, offers, current.enabled.adapters));
}
