// orch's own grouping, written by orchd. A space is user-created, optional and
// named by orch; a plexer may additionally HOLD it as a home. orchd drives the home in the
// caller's plexer, which runs on this machine, and writes the rows that record it.
import { mintAgentId } from "../../../shared/agent-id.ts";
import { clearHome, homeHandle } from "../../../store/home-rows.ts";
import { deleteSpaceRow, findSpace, insertSpace, listSpaces, renameSpaceRow, spaceNameTaken, spaceOccupied } from "../../../store/space-rows.ts";
import { homeLabel, openHome } from "../home.ts";
import { selectBackend } from "../spawn/plan.ts";
import type { OrchDir } from "../../../types/core.ts";
import type { SpaceHomeRole } from "../../../types/backend.ts";
import type { SpaceListing, SpaceRow } from "../../../types/store.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";
import type { DaemonState } from "../state.ts";

/** A space with the home coordinate ONE plexer holds for it: a home recorded in
 *  another plexer is not the caller's to drive, so it reads as none. */
function listingOf(directory: OrchDir, space: SpaceRow, plexerId: string): SpaceListing {
  return { ...space, home: homeHandle(directory, { kind: "space", id: space.id }, plexerId) };
}

/** One space, with the home the given plexer holds for it. */
export function spaceListing(directory: OrchDir, params: { readonly target: string; readonly plexerId: string }): SpaceListing {
  return listingOf(directory, findSpace(directory, params.target), params.plexerId);
}

/** The plexer the caller works in, which settings name, and its home role when it composes one. */
function homePlexer(state: DaemonState): { readonly id: string; readonly home: SpaceHomeRole | null } {
  const backend = selectBackend(null, state.services.settings.current());
  return { id: backend.id, home: backend.spaceHome };
}

/** The home a recorded coordinate names, when this plexer composes the role that opened it. */
function drivableHome(home: SpaceHomeRole | null, space: SpaceListing): { readonly role: SpaceHomeRole; readonly coordinate: string } | null {
  if (home === null || space.home === null) return null;
  return { role: home, coordinate: space.home };
}

export function spaceListings(state: DaemonState): ResultOf<"spaces"> {
  const plexer = homePlexer(state);
  return { spaces: listSpaces(state.directory).map((space) => listingOf(state.directory, space, plexer.id)) };
}

/** The spaces row lands FIRST: the home row's foreign key names it. The home is part of what was
 *  asked for, so its failure fails the whole create. */
export function createSpace(state: DaemonState, params: ParamsOf<"space-create">): ResultOf<"space-create"> {
  const directory = state.directory;
  if (spaceNameTaken(directory, params.name)) throw new Error(`A space named "${params.name}" already exists.`);
  const id = mintAgentId();
  insertSpace(directory, id, params.name, params.actor, Date.now());
  const plexer = homePlexer(state);
  if (plexer.home === null) return { id, name: params.name, home: "none" };
  openHome({ services: state.services, subject: { kind: "space", id }, plexerId: plexer.id, home: plexer.home, cwd: params.cwd, label: params.name, actor: params.actor ?? null });
  return { id, name: params.name, home: "created" };
}

/** orch's name is orch's own write and commits first; plexer chrome is a separate action whose
 *  failure never rewrites whether the rename happened. The home keeps orch's MARK. */
export function renameSpace(state: DaemonState, params: ParamsOf<"space-rename">): ResultOf<"space-rename"> {
  const directory = state.directory;
  const space = findSpace(directory, params.target);
  if (spaceNameTaken(directory, params.name, space.id)) throw new Error(`A space named "${params.name}" already exists.`);
  renameSpaceRow(directory, space.id, params.name);
  const plexer = homePlexer(state);
  const home = drivableHome(plexer.home, listingOf(directory, { id: space.id, name: params.name }, plexer.id));
  if (home !== null) home.role.rename(home.coordinate, homeLabel(params.name));
  return { id: space.id, name: params.name, previousName: space.name, home: home === null ? "none" : "renamed" };
}

/** Nobody moves the wall out from under someone else's agents: an occupied space stays, and no
 *  plexer window closes for it. */
export function deleteSpace(state: DaemonState, params: ParamsOf<"space-delete">): ResultOf<"space-delete"> {
  const directory = state.directory;
  const plexer = homePlexer(state);
  const space = listingOf(directory, findSpace(directory, params.target), plexer.id);
  if (spaceOccupied(directory, space.id)) throw new Error(`Space "${space.name}" is not empty; move its agents out first.`);
  clearHome(directory, { kind: "space", id: space.id });
  deleteSpaceRow(directory, space.id);
  const home = drivableHome(plexer.home, space);
  if (home !== null) home.role.close(home.coordinate);
  return { id: space.id, name: space.name, home: home === null ? "none" : "closed" };
}

/** Focus a space's home. Only focus genuinely needs the home, so only focus is answered with an
 *  absence, naming the space and the verb. */
export function focusSpace(state: DaemonState, params: ParamsOf<"space-focus">): ResultOf<"space-focus"> {
  const plexer = homePlexer(state);
  const space = spaceListing(state.directory, { target: params.target, plexerId: plexer.id });
  const home = drivableHome(plexer.home, space);
  if (home === null) return { outcome: "answer", reason: "no-environment-role", text: `${space.name} has no home in this environment; focus does not apply.` };
  home.role.focus(home.coordinate);
  return { outcome: "focused", space: { id: space.id, name: space.name } };
}

