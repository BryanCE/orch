import { and, asc, eq, isNull } from "drizzle-orm";
import { orm } from "./connection.ts";
import { agentSpaces, agents, spaces } from "../db/schema.ts";
import type { OrchDir } from "../types/core.ts";
import type { SpaceRow } from "../types/store.ts";

/** Every space, by name then id. */
export function listSpaces(directory: OrchDir): SpaceRow[] {
  return orm(directory).select({ id: spaces.id, name: spaces.name }).from(spaces)
    .orderBy(asc(spaces.name), asc(spaces.id)).all();
}

/** The one space an id or a name points at. */
export function findSpace(directory: OrchDir, target: string): SpaceRow {
  const matches = listSpaces(directory).filter((space) => space.id === target || space.name === target);
  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1) throw new Error(`Ambiguous space "${target}": ${matches.map((space) => space.id).join(", ")}.`);
  throw new Error(`No space named or identified "${target}".`);
}

export function spaceNameTaken(directory: OrchDir, name: string, exceptId?: string): boolean {
  return listSpaces(directory).some((space) => space.name === name && space.id !== exceptId);
}

/** The actor id, but only while orch's own store still holds that agent: a
 *  `created_by` naming a reaped row would fail the foreign key on a write that
 *  the reference grants nothing to. */
function recordableActor(directory: OrchDir, actorId: string | undefined): string | null {
  if (actorId === undefined) return null;
  const row = orm(directory).select({ id: agents.id }).from(agents).where(eq(agents.id, actorId)).get();
  return row ? actorId : null;
}

export function insertSpace(directory: OrchDir, id: string, name: string, actorId: string | undefined, now: number): void {
  orm(directory).insert(spaces).values({ id, name, createdBy: recordableActor(directory, actorId), createdAt: now }).run();
}

export function renameSpaceRow(directory: OrchDir, id: string, name: string): void {
  orm(directory).update(spaces).set({ name }).where(eq(spaces.id, id)).run();
}

export function deleteSpaceRow(directory: OrchDir, id: string): void {
  orm(directory).delete(spaces).where(eq(spaces.id, id)).run();
}

/** Whether any agent is in the space now. */
export function spaceOccupied(directory: OrchDir, id: string): boolean {
  return orm(directory).select({ agentId: agentSpaces.agentId }).from(agentSpaces)
    .where(and(eq(agentSpaces.spaceId, id), isNull(agentSpaces.until))).limit(1).get() !== undefined;
}
