import { lt } from "drizzle-orm";
import { orm } from "./connection.ts";
import { controlOutcomes } from "../db/schema.ts";
import type { ControlOutcomeRecord } from "../types/store.ts";

/** Record what an agent did with a control command. The daemon carries the live
 *  reply to whoever is waiting; this is the copy that outlives them both. */
export function insertControlOutcome(d: string, outcome: ControlOutcomeRecord): void {
  orm(d).insert(controlOutcomes).values({
    id: outcome.id,
    agentId: outcome.agentId,
    command: outcome.command,
    requested: JSON.stringify(outcome.requested),
    settledAt: outcome.settledAt,
    error: outcome.error ?? null,
  }).run();
}

export function deleteControlOutcomesBefore(d: string, cutoff: number): number {
  return Number(orm(d).delete(controlOutcomes).where(lt(controlOutcomes.settledAt, cutoff)).run().changes);
}
