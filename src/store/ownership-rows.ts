import { and, eq } from "drizzle-orm";
import { openStore, orm } from "./connection.ts";
import { ownership } from "../db/schema.ts";
import { processInstanceMatches, processIsAlive } from "../process-identity.ts";

/** Record which orchestrator controls an agent, replacing any prior owner. */
export function setOwner(orchDir: string, agentKey: string, owner: string): void {
  const updatedAt = Date.now();
  orm(orchDir).insert(ownership).values({ agentKey, owner, updatedAt }).onConflictDoUpdate({
    target: ownership.agentKey,
    set: { owner, updatedAt },
  }).run();
}

export function getOwner(orchDir: string, agentKey: string): string | undefined {
  return orm(orchDir).select({ owner: ownership.owner }).from(ownership)
    .where(eq(ownership.agentKey, agentKey)).get()?.owner;
}

export function deleteOwner(orchDir: string, agentKey: string): void {
  orm(orchDir).delete(ownership).where(eq(ownership.agentKey, agentKey)).run();
}

export type OwnerWriteResult =
  | { ok: true; reassigned?: boolean }
  | { ok: false; reason: string };

interface OwnerProcessRow { pid: number | null; start_token: string | null }

function isOwnerProcessRow(value: unknown): value is OwnerProcessRow {
  if (typeof value !== "object" || value === null) return false;
  const row: Record<string, unknown> = { ...value };
  return (row.pid === null || typeof row.pid === "number")
    && (row.start_token === null || typeof row.start_token === "string");
}

/** Whether an owner token names an agent orch can prove is no longer running.
 *
 *  Rule 11 / C3: exclusion is mutual exclusion against a LIVE claimant, and a
 *  dead claimant is not a collision. An owner token orch cannot resolve to an
 *  agent has no liveness to prove either way, so it keeps excluding - the
 *  conservative answer, not a silent grant. */
function ownerIsProvablyDead(orchDir: string, owner: string): boolean {
  const row = openStore(orchDir).query(
    `SELECT p.pid AS pid, p.start_token AS start_token
       FROM agents a
       LEFT JOIN agent_processes p ON p.agent_id = a.id AND p.until IS NULL
      WHERE a.id = ?`,
  ).get(owner);
  if (!isOwnerProcessRow(row)) return false;
  if (row.pid === null) return true;
  if (!processIsAlive(row.pid)) return true;
  // A recycled pid must never pass for the process orch recorded; an un-tokened
  // live pid stays conservatively alive.
  return row.start_token !== null && !processInstanceMatches(row.pid, row.start_token);
}

/** Check ownership synchronously and optionally transfer control to the actor. */
export function checkOwnerWrite(
  orchDir: string,
  agentKey: string,
  actor: string,
  opts: { steal?: boolean } = {},
): OwnerWriteResult {
  const owner = getOwner(orchDir, agentKey);
  if (owner === undefined || owner === actor) return { ok: true };
  if (ownerIsProvablyDead(orchDir, owner)) return { ok: true };
  if (!opts.steal) return { ok: false, reason: `agent is owned by ${owner}` };
  const result = orm(orchDir).update(ownership)
    .set({ owner: actor, updatedAt: Date.now() })
    .where(and(eq(ownership.agentKey, agentKey), eq(ownership.owner, owner))).run();
  if (result.changes === 1) return { ok: true, reassigned: true };
  const current = getOwner(orchDir, agentKey);
  return { ok: false, reason: `agent is owned by ${current ?? owner}` };
}
