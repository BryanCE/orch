import { selectSpawnedRecord, type SpawnedRecord } from "../store/spawned-rows.ts";

/** Where an agent runs. Orch records this at spawn and owns it for the agent's
 *  whole life; it is never derived from the agent key, and the agent never
 *  reports it. A projection of the registry row so the two cannot drift. */
export type Placement = Pick<SpawnedRecord, "pane" | "backend" | "space" | "handle" | "cwd" | "worktree" | "branch">;

/** The one placement lookup for an opaque agent key. Throws if the registry is
 *  unreadable rather than reporting an agent as unplaced — a swallowed error
 *  here reads as "no space", which opens the space wall. */
export function placementOf(orchDir: string, key: string): Placement | null {
  const record = selectSpawnedRecord(orchDir, key);
  if (!record) return null;
  const { pane, backend, space, handle, cwd, worktree, branch } = record;
  return { pane, backend, space, handle, cwd, worktree, branch };
}
