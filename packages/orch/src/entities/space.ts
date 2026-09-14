import type { OrchDir, Entity } from "../types/core.ts";
import { sameSpace, spaceOf } from "../policy/space.ts";
import { callerSpace } from "../identity/self.ts";

export function entitySpace(root: OrchDir, e: Entity): string | null {
  return e.space ?? spaceOf(root, e.key);
}

export function scopeEntitiesToSpace(root: OrchDir, entities: Entity[], opts?: { all?: boolean }): Entity[] {
  const current = callerSpace(root);
  if (opts?.all === true || current === null) return entities;
  return entities.filter((entity) => sameSpace(entitySpace(root, entity), current));
}
