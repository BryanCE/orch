import { and, asc, eq, isNull } from "drizzle-orm";
import { orm, withTransaction } from "./connection.ts";
import { agentLeases } from "../db/schema.ts";

export type LeaseReleaseReason = "released" | "handoff" | "adopted" | "expired";

export interface Lease {
  readonly id: number;
  readonly agentId: string;
  readonly orchId: string;
  readonly since: number;
  readonly until: number | null;
  readonly releaseReason: LeaseReleaseReason | null;
}

type LeaseRow = typeof agentLeases.$inferSelect;

function isLeaseReleaseReason(value: string | null): value is LeaseReleaseReason | null {
  return value === null || value === "released" || value === "handoff" || value === "adopted" || value === "expired";
}

function toLease(row: LeaseRow): Lease {
  if (!isLeaseReleaseReason(row.releaseReason)) throw new Error("invalid lease release reason");
  return { id: row.id, agentId: row.agentId, orchId: row.orchId, since: row.since, until: row.until, releaseReason: row.releaseReason };
}

function openLease(orchDir: string, agentId: string): LeaseRow | undefined {
  return orm(orchDir).select().from(agentLeases)
    .where(and(eq(agentLeases.agentId, agentId), isNull(agentLeases.until))).get();
}

function insertLease(orchDir: string, agentId: string, orchId: string, since: number): number {
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
export function openLeaseId(orchDir: string, agentId: string): number | null {
  return openLease(orchDir, agentId)?.id ?? null;
}

export function acquireLease(orchDir: string, agentId: string, orchId: string, since = Date.now()): number {
  return withTransaction(orchDir, () => {
    if (openLease(orchDir, agentId)) throw new Error("one_lease");
    return insertLease(orchDir, agentId, orchId, since);
  });
}

/** Close the open holding. `orchId === null` closes whoever holds it (expiry,
 *  which nobody asserts). `fence`, when given, must be the open lease's id. */
function closeLease(
  orchDir: string,
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

export function releaseLease(orchDir: string, agentId: string, orchId: string, until = Date.now(), fence?: number): void {
  withTransaction(orchDir, () => closeLease(orchDir, agentId, orchId, until, "released", fence));
}

export function expireLease(orchDir: string, agentId: string, until = Date.now()): void {
  withTransaction(orchDir, () => closeLease(orchDir, agentId, null, until, "expired"));
}

export function handoffLease(orchDir: string, agentId: string, from: string, to: string, since = Date.now(), fence?: number): number {
  return withTransaction(orchDir, () => {
    closeLease(orchDir, agentId, from, since, "handoff", fence);
    return insertLease(orchDir, agentId, to, since);
  });
}

export function adoptLease(orchDir: string, agentId: string, orchId: string, since = Date.now()): number {
  return withTransaction(orchDir, () => {
    if (openLease(orchDir, agentId)) closeLease(orchDir, agentId, null, since, "adopted");
    return insertLease(orchDir, agentId, orchId, since);
  });
}

export function currentLease(orchDir: string, agentId: string): Lease | null {
  const row = openLease(orchDir, agentId);
  return row ? toLease(row) : null;
}

/** Every holding this agent has ever had, oldest first. C7: history is read from
 *  the lease trail, never inferred from whoever happens to hold it now. */
export function leaseHistory(orchDir: string, agentId: string): Lease[] {
  return orm(orchDir).select().from(agentLeases)
    .where(eq(agentLeases.agentId, agentId)).orderBy(asc(agentLeases.id)).all().map(toLease);
}

export function leasesByOrch(orchDir: string, orchId: string): Lease[] {
  return orm(orchDir).select().from(agentLeases)
    .where(and(eq(agentLeases.orchId, orchId), isNull(agentLeases.until)))
    .orderBy(asc(agentLeases.id)).all().map(toLease);
}
