import type { CallerCredential, OrchDir, Entity } from "../types/core.ts";
import { sameSpace, spaceOf } from "../policy/space.ts";
import { callerSpaceOf } from "../identity/self.ts";

export function entitySpace(root: OrchDir, e: Entity): string | null {
  return e.space ?? spaceOf(root, e.key);
}

export function scopeEntitiesToSpaceFor(
  root: OrchDir,
  credential: CallerCredential,
  entities: Entity[],
  opts?: { all?: boolean },
): Entity[] {
  const current = callerSpaceOf(root, credential);
  if (opts?.all === true || current === null) return entities;
  return entities.filter((entity) => sameSpace(entitySpace(root, entity), current));
}
