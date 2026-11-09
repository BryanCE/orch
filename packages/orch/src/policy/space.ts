import { resolve } from "node:path";
import { repositoryRootOf } from "../worktrees/repository.ts";
import { agentView } from "../store/agent-view.ts";
import { agentLocation } from "../store/interval-rows.ts";
import { hereAgentIfAny } from "../process-place.ts";
import { sameSpace } from "../shared/space.ts";
import type { WallDecision } from "../types/policy.ts";
import type { OrchDir } from "../types/core.ts";

/** The space an agent is composed into, read from the store. */
export function spaceOf(orchDir: OrchDir, id: string | null | undefined): string | null {
  if (id === null || id === undefined) return null;
  return agentView(orchDir, id)?.environment.space ?? null;
}

/** The human operator of a space controls every agent keyed into it. */
export function operatorControls(
  orchDir: OrchDir,
  actor: string | null | undefined,
  agentKey: string | null | undefined,
  actorSpace: string | null | undefined,
  actorIsOperator: boolean,
): boolean {
  return actor !== null && actor !== undefined
    && actorIsOperator
    && sameSpace(actorSpace, spaceOf(orchDir, agentKey));
}

/**
 * The repo an agent's `cwd` sits in. A7: with no space set, THIS is the
 * reachability boundary — unspaced does not mean "reaches every agent on the
 * machine". A worktree belongs to its repository, wherever its tool put it. A
 * directory outside any repository is its own boundary, which is the honest
 * answer rather than widening to the filesystem.
 */
function repoRootOf(cwd: string | null | undefined): string | null {
  if (cwd === null || cwd === undefined || cwd.length === 0) return null;
  return repositoryRootOf(cwd) ?? resolve(cwd);
}

/** The repository an agent works in, read on this machine's disk. An agent on another host
 *  works in a directory on that host's disk, which this one cannot read or compare, so it
 *  has no repo root here and the repo-root wall does not divide it from anyone. */
function repoRootFor(orchDir: OrchDir, key: string | null | undefined): string | null {
  if (key === null || key === undefined) return null;
  const here = hereAgentIfAny(orchDir, key);
  if (here === null) return null;
  return repoRootOf(agentLocation(orchDir, here.id)?.cwd);
}

/** Decide whether a caller may cross the space wall. */
export function checkWall(
  orchDir: OrchDir,
  ownKey: string | null | undefined,
  targetKey: string | null | undefined,
  opts: { crossSpace: boolean },
): WallDecision {
  const ownSpace = spaceOf(orchDir, ownKey);
  const targetSpace = spaceOf(orchDir, targetKey);

  if (sameSpace(ownSpace, targetSpace)) return { allowed: true };
  if (opts.crossSpace) return { allowed: true };

  // A7: with no space on either side the boundary falls back to the repo root.
  // A space, once created, OUTRANKS it — creating one is the statement "these
  // belong together", and it is what widens the wall past a single repo.
  if (ownSpace === null && targetSpace === null) {
    const ownRepo = repoRootFor(orchDir, ownKey);
    const targetRepo = repoRootFor(orchDir, targetKey);
    if (ownRepo === null || targetRepo === null || ownRepo === targetRepo) return { allowed: true };
    return {
      allowed: false,
      reason: `space wall: no space is set, so the boundary is the repo root — ${ownRepo} cannot write to ${targetRepo} (${targetKey ?? "unknown"})`,
    };
  }

  // One side is in a space and the other is not: an unplaced target is eligible,
  // because nothing has said it belongs anywhere else.
  if (ownSpace === null || targetSpace === null) return { allowed: true };

  return {
    allowed: false,
    reason: `space wall: actor space ${ownSpace} cannot write to target space ${targetSpace} (${targetKey ?? "unknown"})`,
  };
}
