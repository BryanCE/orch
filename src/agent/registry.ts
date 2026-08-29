import { tryParseIdentity } from "../backends/identity.ts";
import { agentView } from "../store/agent-view.ts";
import type { Placement } from "../types/agent.ts";

/** The one placement lookup for an opaque agent key. Throws if the store is
 *  unreadable rather than reporting an agent as unplaced — a swallowed error
 *  here reads as "no space", which opens the space wall. */
export function placementOf(orchDir: string, key: string): Placement | null {
  // A key that carries no minted id names no agent orch has ever registered.
  const agentId = tryParseIdentity(key)?.id;
  if (agentId === undefined) return null;
  const view = agentView(orchDir, agentId);
  if (!view) return null;
  const { plexer, space, handle, worktree, branch } = view.environment;
  return { key, agentId, backend: plexer, space, handle, cwd: view.cwd, worktree, branch };
}
