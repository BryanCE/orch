import { and, eq } from "drizzle-orm";
import { orm } from "./connection.ts";
import { ownership } from "./tables.ts";

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

/** Check ownership synchronously and optionally transfer control to the actor. */
export function checkOwnerWrite(
  orchDir: string,
  agentKey: string,
  actor: string,
  opts: { steal?: boolean } = {},
): OwnerWriteResult {
  const owner = getOwner(orchDir, agentKey);
  if (owner === undefined || owner === actor) return { ok: true };
  if (!opts.steal) return { ok: false, reason: `agent is owned by ${owner}` };
  const result = orm(orchDir).update(ownership)
    .set({ owner: actor, updatedAt: Date.now() })
    .where(and(eq(ownership.agentKey, agentKey), eq(ownership.owner, owner))).run();
  if (result.changes === 1) return { ok: true, reassigned: true };
  const current = getOwner(orchDir, agentKey);
  return { ok: false, reason: `agent is owned by ${current ?? owner}` };
}
