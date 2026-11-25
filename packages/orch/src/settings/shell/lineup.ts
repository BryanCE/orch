import type { HarnessOffers } from "../../setup/composition.ts";
import type { EditingState } from "../../types/settings.ts";
import { CLEAR_SCREEN } from "../../tui/screen.ts";
import { resolveCouncilModels } from "../../setup/composition.ts";
import { editTarget, type Session } from "./state.ts";
import { commitPick } from "./save.ts";

/** Pick the council's members harness by harness, from the models each one lists and may
 *  launch, so the row never takes a model `models.allowed` would refuse. */
export async function editLineup(session: Session, offers: HarnessOffers, editing: EditingState): Promise<void> {
  process.stdout.write(CLEAR_SCREEN);
  const current = editTarget(session).current();
  return commitPick(session, editing, await resolveCouncilModels(current, offers, current.enabled.adapters));
}
