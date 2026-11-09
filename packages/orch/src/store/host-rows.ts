import type { OrchDir } from "../types/core.ts";
import { and, desc, eq, isNull } from "drizzle-orm";
import { orm, withTransaction, type Orm } from "./connection.ts";
import { ensureHost } from "./agent-rows.ts";
import { hostLinks, hostNames } from "../db/schema.ts";
import type { HostIdentity } from "../types/host.ts";

/**
 * The hosts orch reaches over SSH: the name settings gives each, bound to the host id
 * it answered as, and the stretches of time orch held a link to it. A host's id is its
 * own ({@link hostIdentity}); a hostname or a settings name only points at one.
 */

/** What binding a settings name to the host that answered on its route decided. */
export type HostBinding =
  | { readonly kind: "bound" }
  | { readonly kind: "mismatch"; readonly boundId: string };

/** Bind `name` to the host that answered as `host`, recording that host. The first answer
 *  binds the name; a later answer from another id is a different machine and is refused. */
export function bindHostName(orchDir: OrchDir, name: string, host: HostIdentity, now: number): HostBinding {
  return withTransaction(orchDir, () => {
    const db = orm(orchDir);
    const bound = db.select({ hostId: hostNames.hostId }).from(hostNames).where(eq(hostNames.name, name)).get();
    if (bound !== undefined && bound.hostId !== host.id) return { kind: "mismatch", boundId: bound.hostId };
    ensureHost(orchDir, host.id, host.name, host.os, now);
    if (bound === undefined) db.insert(hostNames).values({ name, hostId: host.id, boundAt: now }).run();
    return { kind: "bound" };
  });
}

/** The host id a settings name is bound to, or null before that host first answered. */
export function hostIdOfName(orchDir: OrchDir, name: string): string | null {
  return orm(orchDir).select({ hostId: hostNames.hostId }).from(hostNames).where(eq(hostNames.name, name)).get()?.hostId ?? null;
}

/** Forget which host a name meant, so the next host to answer on its route binds it. */
export function unbindHostName(orchDir: OrchDir, name: string): void {
  orm(orchDir).delete(hostNames).where(eq(hostNames.name, name)).run();
}

/** Close a host's open link row. `until > since` forbids closing a row at its own start,
 *  so a link opened this same millisecond closes one later. */
function closeOpenLink(db: Orm, hostId: string, at: number): void {
  const open = db.select({ since: hostLinks.since }).from(hostLinks)
    .where(and(eq(hostLinks.hostId, hostId), isNull(hostLinks.until))).get();
  if (open === undefined) return;
  db.update(hostLinks).set({ until: Math.max(at, open.since + 1) })
    .where(and(eq(hostLinks.hostId, hostId), isNull(hostLinks.until))).run();
}

/** Record that the link to a host came up. */
export function openHostLink(orchDir: OrchDir, hostId: string, now: number): void {
  withTransaction(orchDir, () => {
    const db = orm(orchDir);
    closeOpenLink(db, hostId, now);
    const since = db.select({ until: hostLinks.until }).from(hostLinks)
      .where(eq(hostLinks.hostId, hostId)).orderBy(desc(hostLinks.since)).limit(1).get()?.until ?? now;
    const opensAt = Math.max(now, since);
    db.insert(hostLinks).values({ hostId, since: opensAt, until: null, lastSeen: opensAt }).run();
  });
}

/** Record that the far side of an open link answered at `now`. */
export function touchHostLink(orchDir: OrchDir, hostId: string, now: number): void {
  orm(orchDir).update(hostLinks).set({ lastSeen: now })
    .where(and(eq(hostLinks.hostId, hostId), isNull(hostLinks.until))).run();
}

/** Record that the link to a host went down at `now`. */
export function closeHostLink(orchDir: OrchDir, hostId: string, now: number): void {
  withTransaction(orchDir, () => closeOpenLink(orm(orchDir), hostId, now));
}

/** Close every link a previous orchd left open, at the last instant each was seen: a link
 *  dies with the orchd that held it, and nothing after its last answer was ever observed. */
export function closeOrphanedHostLinks(orchDir: OrchDir): void {
  withTransaction(orchDir, () => {
    const db = orm(orchDir);
    const open = db.select({ hostId: hostLinks.hostId, lastSeen: hostLinks.lastSeen }).from(hostLinks).where(isNull(hostLinks.until)).all();
    for (const link of open) closeOpenLink(db, link.hostId, link.lastSeen);
  });
}

/** The latest link to a host: open (`until` null) while it is up. Null when orch never reached it. */
export interface HostLinkRecord {
  readonly since: number;
  readonly until: number | null;
  readonly lastSeen: number;
}

export function latestHostLink(orchDir: OrchDir, hostId: string): HostLinkRecord | null {
  const row = orm(orchDir).select({ since: hostLinks.since, until: hostLinks.until, lastSeen: hostLinks.lastSeen }).from(hostLinks)
    .where(eq(hostLinks.hostId, hostId)).orderBy(desc(hostLinks.since)).limit(1).get();
  return row ?? null;
}
