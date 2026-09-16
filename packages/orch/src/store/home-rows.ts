import type { OrchDir } from "../types/core.ts";
import { and, eq, isNull } from "drizzle-orm";
import { orm } from "./connection.ts";
import { packPlexers, spacePlexers } from "../db/schema.ts";
import { ensurePlexer } from "./agent-rows.ts";
import type { HomeSubject } from "../types/backend.ts";

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

/** Which interval table holds this subject's home, and which column keys it.
 *  The branch is on orch's own noun — the two subjects orch has — never on which
 *  plexer is answering. Returning the drizzle table keeps the two spellings of
 *  each column in ONE place: the schema. */
function tableFor(subject: HomeSubject) {
  return subject.kind === "space"
    ? { table: spacePlexers, key: spacePlexers.spaceId }
    : { table: packPlexers, key: packPlexers.packId };
}

/** This plexer's live home coordinate for a subject, or null when it has none
 *  HERE — a home recorded in another plexer is not this one's to drive. */
export function homeHandle(directory: OrchDir, subject: HomeSubject, plexerId: string): string | null {
  const { table, key } = tableFor(subject);
  const row = orm(directory).select({ handle: table.handle }).from(table)
    .where(and(eq(key, subject.id), eq(table.plexerId, plexerId), isNull(table.until))).get();
  return row?.handle ?? null;
}

/** Record a coordinate a plexer just handed back. */
export function recordHome(
  directory: OrchDir,
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
export function clearHome(directory: OrchDir, subject: HomeSubject): void {
  const { table, key } = tableFor(subject);
  orm(directory).delete(table).where(eq(key, subject.id)).run();
}

