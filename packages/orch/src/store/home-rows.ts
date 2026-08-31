import { and, eq, isNull } from "drizzle-orm";
import { orm } from "./connection.ts";
import { packPlexers, spacePlexers } from "../db/schema.ts";
import { ensurePlexer } from "./agent-rows.ts";
import type { HomeSubject } from "../types/backend.ts";
import type { OpenHomeRequest } from "../types/store.ts";
export type { OpenHomeRequest };

/**
 * The one reader and writer of a plexer HOME for orch's own structure.
 *
 * Holding orch's structure is something an environment
 * PROVIDES — create / rename / close a home for a space or a pack, branched on
 * by what the environment provides and never by a plexer id.
 *
 * There is no new noun and there must not be one. The thing being grouped
 * is already a **space** or a **pack**; what the plexer groups by is a
 * coordinate orch stores and hands back, never says. Minting an orch word for a
 * plexer coordinate is exactly how `wF` got printed as a name a human chose.
 *
 * Everything has an environment, so the same interval shape holds both —
 * `space_plexers` and `pack_plexers` differ only in which id column they key on,
 * which is a branch on an ORCH noun (the subject's kind), never on a plexer.
 */

/** The mark every home orch opens carries: allowable, but never unmarked.
 *  Without it a fleet's home is indistinguishable from the human's own panes and
 *  its agents read as random agents with no discoverable origin. */
export const ORCH_HOME_LABEL = "orch";

/** Which interval table holds this subject's home, and which column keys it.
 *  The branch is on orch's own noun — the two subjects orch has — never on which
 *  plexer is answering. Returning the drizzle table keeps the two spellings of
 *  each column in ONE place: the schema. */
function tableFor(subject: HomeSubject) {
  return subject.kind === "space"
    ? { table: spacePlexers, key: spacePlexers.spaceId }
    : { table: packPlexers, key: packPlexers.packId };
}

/** The label orch asks a plexer to put on a home it opens for itself. */
export function homeLabel(name: string): string {
  return `${ORCH_HOME_LABEL}/${name}`;
}

/** This plexer's live home coordinate for a subject, or null when it has none
 *  HERE — a home recorded in another plexer is not this one's to drive. */
export function homeHandle(directory: string, subject: HomeSubject, plexerId: string): string | null {
  const { table, key } = tableFor(subject);
  const row = orm(directory).select({ handle: table.handle }).from(table)
    .where(and(eq(key, subject.id), eq(table.plexerId, plexerId), isNull(table.until))).get();
  return row?.handle ?? null;
}

/** Record a coordinate a plexer just handed back. */
export function recordHome(
  directory: string,
  subject: HomeSubject,
  plexerId: string,
  handle: string,
  now: number = Date.now(),
): void {
  ensurePlexer(directory, plexerId, plexerId);
  const values = { since: now, until: null, plexerId, handle };
  if (subject.kind === "space") orm(directory).insert(spacePlexers).values({ spaceId: subject.id, ...values }).run();
  else orm(directory).insert(packPlexers).values({ packId: subject.id, ...values }).run();
}

/** Drop every home row for a subject. The partial unique index (`one_pack_home`
 *  / `one_space_home`) admits exactly one open interval, so a subject whose home
 *  is gone must leave no open row behind or the next open is refused. */
export function clearHome(directory: string, subject: HomeSubject): void {
  const { table, key } = tableFor(subject);
  orm(directory).delete(table).where(eq(key, subject.id)).run();
}

/**
 * Open a plexer home for one space or pack and record its coordinate.
 *
 * Returns the coordinate, or null when this environment holds nothing. The
 * coordinate is for orch to STORE and to hand back to the plexer — never to
 * display and never to use as an orch id.
 */
export function openHome(request: OpenHomeRequest): string | null {
  const { directory, subject, plexerId, home, cwd, label, env } = request;
  if (home === null) return null;
  const created = home.create(subject, { cwd, label: homeLabel(label), env });
  recordHome(directory, subject, plexerId, created.coordinate);
  return created.coordinate;
}
