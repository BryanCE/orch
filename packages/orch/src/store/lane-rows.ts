// The queue lane each agent drains. One row per agent spawned into a lane.
import { eq } from "drizzle-orm";
import { agentLanes } from "../db/schema.ts";
import { orm } from "./connection.ts";
import { isLane, type Lane } from "../types/queue.ts";
import type { OrchDir } from "../types/core.ts";

/** Record the lane an agent drains. Written once, with the agent's spawn. */
export function setLane(orchDir: OrchDir, agentId: string, now: number, lane: Lane): void {
  orm(orchDir).insert(agentLanes).values({ agentId, lane, setAt: now }).run();
}

/** The lane an agent drains, or null for an agent in no lane. A row that is no lane is malformed. */
export function laneOf(orchDir: OrchDir, agentId: string): Lane | null {
  const row = orm(orchDir).select({ lane: agentLanes.lane }).from(agentLanes).where(eq(agentLanes.agentId, agentId)).get();
  if (row === undefined) return null;
  if (!isLane(row.lane)) throw new Error(`Malformed lane for agent ${agentId}: ${JSON.stringify(row.lane)}`);
  return row.lane;
}
