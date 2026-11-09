// A plexer home for orch's own structure. orchd drives the caller's plexer, which runs on this
// machine, and records the coordinate it hands back in the same breath.
import { clearHome, homeHandle, recordHome } from "../../store/home-rows.ts";
import { spendGrant } from "../../store/grant-rows.ts";
import { withTransaction } from "../../store/connection.ts";
import type { OrchDir } from "../../types/core.ts";
import type { GrantAction } from "../../types/store.ts";
import type { CreatedHome, HomeSubject, SpaceHomeRole } from "../../types/backend.ts";
import type { OpenHomeRequest } from "../../types/command.ts";
import type { DaemonClient } from "../../types/services.ts";

/** The mark every home orch opens carries: allowable, but never unmarked.
 *  Without it a fleet's home is indistinguishable from the human's own panes and
 *  its agents read as random agents with no discoverable origin. */
export const ORCH_HOME_LABEL = "orch";

/** The label orch asks a plexer to put on a home it opens for itself. */
export function homeLabel(name: string): string {
  return `${ORCH_HOME_LABEL}/${name}`;
}

/**
 * Open a plexer home for one space or pack and record its coordinate. A home
 * opened on a human's approval passes that approval, and orchd spends it with
 * the record.
 *
 * Returns the home as the plexer created it — coordinate, root group and root
 * place. The coordinate is for orch to STORE and to hand back to the plexer —
 * never to display and never to use as an orch id.
 */
export function openHome(request: OpenHomeRequest): CreatedHome {
  const { services, subject, plexerId, home, cwd, label, env, grant, actor } = request;
  const created = home.create(subject, { cwd, label: homeLabel(label), env });
  recordSubjectHome(services.orchDir, { subject, plexerId, handle: created.coordinate, grant: grant ?? null, actor });
  return created;
}

/** The recorded home coordinate the plexer still lists. A home the human closed
 *  from the plexer side leaves its row open; that row is dropped here so the
 *  subject is owed a fresh home instead of a spawn into a coordinate that is gone. */
export function listedHomeHandle(services: DaemonClient, subject: HomeSubject, plexerId: string, role: SpaceHomeRole | null): string | null {
  const handle = homeHandle(services.orchDir, subject, plexerId);
  if (handle === null) return null;
  if (role === null || role.list().some((home) => home.coordinate === handle)) return handle;
  clearHome(services.orchDir, subject);
  return null;
}

/** Record a home the caller's plexer opened. A home opened on a human's approval spends that
 *  approval here, by `actor`, in the same transaction as the record, so a home that never opened
 *  costs no grant and a retry finds the approval unspent. */
function recordSubjectHome(directory: OrchDir, record: { readonly subject: HomeSubject; readonly plexerId: string; readonly handle: string; readonly grant: GrantAction | null; readonly actor: string | null }): void {
  withTransaction(directory, () => {
    if (record.grant !== null && !spendGrant(directory, record.grant, record.actor)) {
      throw new Error("the approval to open this home was already spent by another spawn; run the spawn again to ask for a new one");
    }
    recordHome(directory, record.subject, record.plexerId, record.handle);
  });
}
