import type { OrchDir } from "../types/core.ts";
import { and, asc, eq, isNull } from "drizzle-orm";
import { orm, withTransaction } from "./connection.ts";
import { agentLeases } from "../db/schema.ts";
import { refreshAgent } from "./agent-view.ts";
import type { Lease, LeaseReleaseReason } from "../types/store.ts";
export type { Lease };

type LeaseRow = typeof agentLeases.$inferSelect;

function isLeaseReleaseReason(value: string | null): value is LeaseReleaseReason | null {
  return value === null || value === "released" || value === "handoff" || value === "adopted" || value === "expired";
}

function toLease(row: LeaseRow): Lease {
  if (!isLeaseReleaseReason(row.releaseReason)) throw new Error("invalid lease release reason");
  return { id: row.id, agentId: row.agentId, orchId: row.orchId, since: row.since, until: row.until, releaseReason: row.releaseReason };
}

function openLease(orchDir: OrchDir, agentId: string): LeaseRow | undefined {
  return orm(orchDir).select().from(agentLeases)
    .where(and(eq(agentLeases.agentId, agentId), isNull(agentLeases.until))).get();
}

function insertLease(orchDir: OrchDir, agentId: string, orchId: string, since: number): number {
  const row = orm(orchDir).insert(agentLeases).values({ agentId, orchId, since }).returning({ id: agentLeases.id }).get();
  if (!row) throw new Error("lease insert did not produce a row");
  return row.id;
}

/** The fencing token of the open lease, or null when the agent is unleased.
 *
 *  C4a: `agent_leases.id` is monotonic and every holding is an INSERT, so the id
 *  a holder was handed at acquire time identifies THAT holding and no later one.
 *  A holder that carries it can prove it is still the current holder; a woken
 *  zombie orch carrying a superseded one cannot clobber the adopter, even when
 *  the zombie's own id happens to be the current holder's again. */
export function openLeaseId(orchDir: OrchDir, agentId: string): number | null {
  return openLease(orchDir, agentId)?.id ?? null;
}

export function acquireLease(orchDir: OrchDir, agentId: string, orchId: string, since = Date.now()): number {
  const id = withTransaction(orchDir, () => {
    if (openLease(orchDir, agentId)) throw new Error("one_lease");
    return insertLease(orchDir, agentId, orchId, since);
  });
  refreshAgent(orchDir, agentId);
  return id;
}

/** Close the open holding. `orchId === null` closes whoever holds it (expiry,
 *  which nobody asserts). `fence`, when given, must be the open lease's id. */
function closeLease(
  orchDir: OrchDir,
  agentId: string,
  orchId: string | null,
  until: number,
  reason: LeaseReleaseReason,
  fence?: number,
): void {
  if (fence !== undefined && openLeaseId(orchDir, agentId) !== fence) throw new Error("stale_fence");
  const where = orchId === null
    ? and(eq(agentLeases.agentId, agentId), isNull(agentLeases.until))
    : and(eq(agentLeases.agentId, agentId), eq(agentLeases.orchId, orchId), isNull(agentLeases.until));
  const changes = orm(orchDir).update(agentLeases).set({ until, releaseReason: reason }).where(where).run().changes;
  if (changes !== 1) throw new Error(orchId === null ? "no_lease" : "lease_holder");
}

export function releaseLease(orchDir: OrchDir, agentId: string, orchId: string, until = Date.now(), fence?: number): void {
  withTransaction(orchDir, () => closeLease(orchDir, agentId, orchId, until, "released", fence));
  refreshAgent(orchDir, agentId);
}

export function expireLease(orchDir: OrchDir, agentId: string, until = Date.now()): void {
  withTransaction(orchDir, () => closeLease(orchDir, agentId, null, until, "expired"));
  refreshAgent(orchDir, agentId);
}

export function handoffLease(orchDir: OrchDir, agentId: string, from: string, to: string, since = Date.now(), fence?: number): number {
  const id = withTransaction(orchDir, () => {
    closeLease(orchDir, agentId, from, since, "handoff", fence);
    return insertLease(orchDir, agentId, to, since);
  });
  refreshAgent(orchDir, agentId);
  return id;
}

export function adoptLease(orchDir: OrchDir, agentId: string, orchId: string, since = Date.now()): number {
  const id = withTransaction(orchDir, () => {
    if (openLease(orchDir, agentId)) closeLease(orchDir, agentId, null, since, "adopted");
    return insertLease(orchDir, agentId, orchId, since);
  });
  refreshAgent(orchDir, agentId);
  return id;
}

export function currentLease(orchDir: OrchDir, agentId: string): Lease | null {
  const row = openLease(orchDir, agentId);
  return row ? toLease(row) : null;
}

/** Whether `holder` holds the open lease on `agentId`. */
export function holdsLease(orchDir: OrchDir, agentId: string, holder: string): boolean {
  return currentLease(orchDir, agentId)?.orchId === holder;
}

/** Every holding this agent has ever had, oldest first. C7: history is read from
 *  the lease trail, never inferred from whoever happens to hold it now. */
export function leaseHistory(orchDir: OrchDir, agentId: string): Lease[] {
  return orm(orchDir).select().from(agentLeases)
    .where(eq(agentLeases.agentId, agentId)).orderBy(asc(agentLeases.id)).all().map(toLease);
}

export function leasesByOrch(orchDir: OrchDir, orchId: string): Lease[] {
  return orm(orchDir).select().from(agentLeases)
    .where(and(eq(agentLeases.orchId, orchId), isNull(agentLeases.until)))
    .orderBy(asc(agentLeases.id)).all().map(toLease);
}
