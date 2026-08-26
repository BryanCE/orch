import { openStore } from "./connection.ts";

/** Record which orchestrator controls an agent, replacing any prior owner. */
export function setOwner(orchDir: string, agentKey: string, owner: string): void {
  const updatedAt = new Date().toISOString();
  openStore(orchDir)
    .query(
      `INSERT INTO ownership (agent_key, owner, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(agent_key) DO UPDATE SET owner = excluded.owner, updated_at = excluded.updated_at`,
    )
    .run(agentKey, owner, updatedAt);
}

export function getOwner(orchDir: string, agentKey: string): string | undefined {
  const row = openStore(orchDir)
    .query("SELECT owner FROM ownership WHERE agent_key = ?")
    .get(agentKey) as { owner: string } | null;
  return row?.owner;
}

export function deleteOwner(orchDir: string, agentKey: string): void {
  openStore(orchDir).query("DELETE FROM ownership WHERE agent_key = ?").run(agentKey);
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
  const changes = openStore(orchDir)
    .query("UPDATE ownership SET owner = ?, updated_at = ? WHERE agent_key = ? AND owner = ?")
    .run(actor, new Date().toISOString(), agentKey, owner).changes;
  if (changes === 1) return { ok: true, reassigned: true };
  const current = getOwner(orchDir, agentKey);
  return { ok: false, reason: `agent is owned by ${current ?? owner}` };
}
