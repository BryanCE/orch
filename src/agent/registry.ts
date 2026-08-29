import { tryParseIdentity } from "../backends/identity.ts";
import { agentView } from "../store/agent-view.ts";

/**
 * Where an agent runs, read back from the environment satellites that own each
 * axis (src/store/agent-view.ts).
 *
 * A1: environment is one of four facts and is MUTABLE — an agent that moves
 * plexer, space or pane keeps the identity it was minted with. It is never
 * derived from the agent key, and the agent never reports it. Every field is
 * nullable because an axis with no row is genuinely absent: a headless agent
 * has no pane handle, and that is an answer, not a missing value.
 */
export interface Placement {
  /** The key this lookup was made with. Identity is `agentId`, never this. */
  readonly key: string;
  readonly agentId: string;
  readonly backend: string | null;
  readonly space: string | null;
  readonly handle: string | null;
  readonly cwd: string;
  readonly worktree: string | null;
  readonly branch: string | null;
}

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
