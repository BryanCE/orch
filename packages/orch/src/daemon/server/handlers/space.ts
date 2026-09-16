// orch's own grouping, written by orchd. A space is user-created, optional and
// named by orch; a plexer may additionally HOLD it as a home. The plexer action
// runs in the caller's session; the rows that record it are written here.
import { mintAgentId } from "../../../backends/identity.ts";
import { clearHome, homeHandle, recordHome } from "../../../store/home-rows.ts";
import { deleteSpaceRow, findSpace, insertSpace, listSpaces, renameSpaceRow, spaceNameTaken, spaceOccupied } from "../../../store/space-rows.ts";
import type { OrchDir } from "../../../types/core.ts";
import type { SpaceListing, SpaceRow } from "../../../types/store.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";

/** A space with the home coordinate ONE plexer holds for it: a home recorded in
 *  another plexer is not the caller's to drive, so it reads as none. */
function listingOf(directory: OrchDir, space: SpaceRow, plexerId: string): SpaceListing {
  return { ...space, home: homeHandle(directory, { kind: "space", id: space.id }, plexerId) };
}

export function spaceListings(directory: OrchDir, params: ParamsOf<"spaces">): ResultOf<"spaces"> {
  return { spaces: listSpaces(directory).map((space) => listingOf(directory, space, params.plexerId)) };
}

export function spaceListing(directory: OrchDir, params: ParamsOf<"space">): ResultOf<"space"> {
  return listingOf(directory, findSpace(directory, params.target), params.plexerId);
}

export function createSpace(directory: OrchDir, params: ParamsOf<"space-create">): ResultOf<"space-create"> {
  if (spaceNameTaken(directory, params.name)) throw new Error(`A space named "${params.name}" already exists.`);
  const id = mintAgentId();
  insertSpace(directory, id, params.name, params.actor, Date.now());
  return { id, name: params.name };
}

export function renameSpace(directory: OrchDir, params: ParamsOf<"space-rename">): ResultOf<"space-rename"> {
  const space = findSpace(directory, params.target);
  if (spaceNameTaken(directory, params.name, space.id)) throw new Error(`A space named "${params.name}" already exists.`);
  renameSpaceRow(directory, space.id, params.name);
  return { ...listingOf(directory, { id: space.id, name: params.name }, params.plexerId), previousName: space.name };
}

/** Nobody moves the wall out from under someone else's agents: an occupied space
 *  stays. The answer carries the home the caller's plexer held, for it to close. */
export function deleteSpace(directory: OrchDir, params: ParamsOf<"space-delete">): ResultOf<"space-delete"> {
  const space = listingOf(directory, findSpace(directory, params.target), params.plexerId);
  if (spaceOccupied(directory, space.id)) throw new Error(`Space "${space.name}" is not empty; move its agents out first.`);
  clearHome(directory, { kind: "space", id: space.id });
  deleteSpaceRow(directory, space.id);
  return space;
}

export function subjectHome(directory: OrchDir, params: ParamsOf<"home">): ResultOf<"home"> {
  return { handle: homeHandle(directory, params.subject, params.plexerId) };
}

export function recordSubjectHome(directory: OrchDir, params: ParamsOf<"record-home">): ResultOf<"record-home"> {
  recordHome(directory, params.subject, params.plexerId, params.handle);
  return { ok: true };
}

export function clearSubjectHome(directory: OrchDir, params: ParamsOf<"clear-home">): ResultOf<"clear-home"> {
  clearHome(directory, params.subject);
  return { ok: true };
}
