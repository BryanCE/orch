// A plexer home for orch's own structure, driven from the caller's session.
// The plexer action runs here, in the process that holds the plexer; the row
// that records the coordinate is written by orchd.
import { askDaemon, callDaemon } from "./daemon.ts";
import type { CreatedHome, HomeSubject, SpaceHomeRole } from "../types/backend.ts";
import type { OpenHomeRequest } from "../types/command.ts";
import type { DaemonClient } from "../types/services.ts";

/** The mark every home orch opens carries: allowable, but never unmarked.
 *  Without it a fleet's home is indistinguishable from the human's own panes and
 *  its agents read as random agents with no discoverable origin. */
export const ORCH_HOME_LABEL = "orch";

/** The label orch asks a plexer to put on a home it opens for itself. */
export function homeLabel(name: string): string {
  return `${ORCH_HOME_LABEL}/${name}`;
}

/**
 * Open a plexer home for one space or pack and record its coordinate.
 *
 * Returns the home as the plexer created it — coordinate, root group and root
 * place. The coordinate is for orch to STORE and to hand back to the plexer —
 * never to display and never to use as an orch id.
 */
export async function openHome(request: OpenHomeRequest): Promise<CreatedHome> {
  const { services, subject, plexerId, home, cwd, label, env } = request;
  const created = home.create(subject, { cwd, label: homeLabel(label), env });
  await callDaemon(services, "record-home", { subject, plexerId, handle: created.coordinate });
  return created;
}

/** The recorded home coordinate the plexer still lists. A home the human closed
 *  from the plexer side leaves its row open; that row is dropped here so the
 *  subject is owed a fresh home instead of a spawn into a coordinate that is gone. */
export async function listedHomeHandle(services: DaemonClient, subject: HomeSubject, plexerId: string, role: SpaceHomeRole | null): Promise<string | null> {
  const { handle } = await askDaemon(services, "home", { subject, plexerId });
  if (handle === null) return null;
  if (role === null || role.list().some((home) => home.coordinate === handle)) return handle;
  await callDaemon(services, "clear-home", { subject });
  return null;
}
