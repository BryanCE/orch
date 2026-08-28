import { openStore, withTransaction } from "./connection.ts";

export type LeaseReleaseReason = "released" | "handoff" | "adopted" | "expired";

export interface Lease {
  readonly id: number;
  readonly agentId: string;
  readonly orchId: string;
  readonly since: number;
  readonly until: number | null;
  readonly releaseReason: LeaseReleaseReason | null;
}

interface LeaseRow {
  id: number;
  agent_id: string;
  orch_id: string;
  since: number;
  until: number | null;
  release_reason: LeaseReleaseReason | null;
}

const SELECT = "SELECT id, agent_id, orch_id, since, until, release_reason FROM agent_leases";

function toLease(row: LeaseRow): Lease {
  return {
    id: Number(row.id), agentId: row.agent_id, orchId: row.orch_id,
    since: Number(row.since), until: row.until == null ? null : Number(row.until),
    releaseReason: row.release_reason,
  };
}

function openLease(orchDir: string, agentId: string): LeaseRow | null {
  return openStore(orchDir).query(`${SELECT} WHERE agent_id = ? AND until IS NULL`).get(agentId) as LeaseRow | null;
}

function insertLease(orchDir: string, agentId: string, orchId: string, since: number): number {
  const db = openStore(orchDir);
  db.query("INSERT INTO agent_leases (agent_id, orch_id, since) VALUES (?, ?, ?)").run(agentId, orchId, since);
  const row = db.query("SELECT id FROM agent_leases ORDER BY id DESC LIMIT 1").get() as { id: number } | null;
  if (!row) throw new Error("lease insert did not produce a row");
  return Number(row.id);
}

/** Acquire the sole open lease for an agent; the generated id is its fencing token. */
export function acquireLease(orchDir: string, agentId: string, orchId: string, since = Date.now()): number {
  return withTransaction(orchDir, () => {
    if (openLease(orchDir, agentId)) throw new Error("one_lease");
    return insertLease(orchDir, agentId, orchId, since);
  });
}

function closeLease(orchDir: string, agentId: string, orchId: string | null, until: number, reason: LeaseReleaseReason): void {
  const db = openStore(orchDir);
  const params = orchId == null ? [until, reason, agentId] : [until, reason, agentId, orchId];
  const sql = orchId == null
    ? "UPDATE agent_leases SET until = ?, release_reason = ? WHERE agent_id = ? AND until IS NULL"
    : "UPDATE agent_leases SET until = ?, release_reason = ? WHERE agent_id = ? AND orch_id = ? AND until IS NULL";
  if (db.query(sql).run(...params).changes !== 1) throw new Error(orchId == null ? "no_lease" : "lease_holder");
}

export function releaseLease(orchDir: string, agentId: string, orchId: string, until = Date.now()): void {
  withTransaction(orchDir, () => closeLease(orchDir, agentId, orchId, until, "released"));
}

export function expireLease(orchDir: string, agentId: string, until = Date.now()): void {
  withTransaction(orchDir, () => closeLease(orchDir, agentId, null, until, "expired"));
}

export function handoffLease(orchDir: string, agentId: string, fromOrchId: string, toOrchId: string, since = Date.now()): number {
  return withTransaction(orchDir, () => {
    closeLease(orchDir, agentId, fromOrchId, since, "handoff");
    return insertLease(orchDir, agentId, toOrchId, since);
  });
}

export function adoptLease(orchDir: string, agentId: string, orchId: string, since = Date.now()): number {
  return withTransaction(orchDir, () => {
    const current = openLease(orchDir, agentId);
    if (current) closeLease(orchDir, agentId, null, since, "adopted");
    return insertLease(orchDir, agentId, orchId, since);
  });
}

export function currentLease(orchDir: string, agentId: string): Lease | null {
  const row = openLease(orchDir, agentId);
  return row ? toLease(row) : null;
}

export function leasesByOrch(orchDir: string, orchId: string): Lease[] {
  const rows = openStore(orchDir).query(`${SELECT} WHERE orch_id = ? AND until IS NULL ORDER BY id`).all(orchId) as LeaseRow[];
  return rows.map(toLease);
}
