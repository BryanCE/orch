// Which agents are read-only, and where each may write. One row per read-only agent.
import { eq } from "drizzle-orm";
import { agentReadOnly } from "../db/schema.ts";
import { orm } from "./connection.ts";
import type { ReadOnly } from "../policy/read-only.ts";
import type { OrchDir } from "../types/core.ts";

/** Record that an agent is read-only, with its output directory. Written once, with the agent's spawn. */
export function setReadOnly(orchDir: OrchDir, agentId: string, now: number, readOnly: ReadOnly): void {
  orm(orchDir).insert(agentReadOnly).values({ agentId, outDir: readOnly.out, setAt: now }).run();
}

/** What a read-only agent is held to, or null for an agent that is not read-only. */
export function readOnlyOf(orchDir: OrchDir, agentId: string): ReadOnly | null {
  const row = orm(orchDir).select({ outDir: agentReadOnly.outDir }).from(agentReadOnly).where(eq(agentReadOnly.agentId, agentId)).get();
  return row === undefined ? null : { out: row.outDir };
}
