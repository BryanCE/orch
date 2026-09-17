import type { OrchDir } from "../types/core.ts";
import { lt } from "drizzle-orm";
import { orm, queueWrite } from "./connection.ts";
import { controlOutcomes } from "../db/schema.ts";
import type { ControlOutcomeRecord } from "../types/store.ts";

/** Record what an agent did with a control command. The daemon carries the live
 *  reply to whoever is waiting; this is the copy that outlives them both. */
export function insertControlOutcome(d: OrchDir, outcome: ControlOutcomeRecord): void {
  queueWrite(d, (db) => {
    db.insert(controlOutcomes).values({
      id: outcome.id,
      agentId: outcome.agentId,
      command: outcome.command,
      requested: JSON.stringify(outcome.requested),
      settledAt: outcome.settledAt,
      error: outcome.error ?? null,
    }).run();
  });
}

export function deleteControlOutcomesBefore(d: OrchDir, cutoff: number): number {
  return Number(orm(d).delete(controlOutcomes).where(lt(controlOutcomes.settledAt, cutoff)).run().changes);
}
