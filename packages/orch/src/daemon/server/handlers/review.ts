// Review of the branches finished agents leave in their worktrees. A worktree is on the host its
// agent runs on, so that host's orchd reads, lands and removes it: this one for an agent here,
// the linked host's over its link for one there.
import { agentView, agentViews } from "../../../store/agent-view.ts";
import { loadPresence } from "../../../presence/store.ts";
import { repositoryCommonRoot, worktreeHasChanges, worktreeReviewSummary } from "../../../worktrees/repository.ts";
import { worktreeProvider } from "../../../worktrees/registry.ts";
import { addressOf, indexPresenceById } from "../../../shared/lookup.ts";
import { collapse, errorMessage } from "../../../util.ts";
import type { WorktreeConfig } from "../../../types/worktree.ts";
import { worktreeOf } from "../../../store/agent-rows.ts";
import { hereAgentIfAny, placeHere } from "../../../process-place.ts";
import type { HereAgent } from "../../../types/agent-place.ts";
import { atAgentHost } from "./host.ts";
import { requireOriginPeer } from "./peer.ts";
import type { OrchDir } from "../../../types/core.ts";
import type { RpcHandler } from "../../../types/daemon.ts";
import type { ParamsOf, ResultOf, WorktreeAction, WorktreeActed } from "../../client/protocol.ts";
import type { DaemonState } from "../state.ts";

type ReviewItem = ResultOf<"reviews">["reviews"][number];

/** Review, land or remove the worktree of an agent that runs on this host. Landing refuses a
 *  worktree with uncommitted changes; removing discards, because a landed branch holds nothing
 *  to lose and `git branch -d` judges it against the root's HEAD, not its base. */
export function actOnWorktreeHere(directory: OrchDir, config: WorktreeConfig, agent: HereAgent, action: WorktreeAction): WorktreeActed {
  const view = agentView(directory, agent.id);
  const worktree = worktreeOf(directory, agent);
  if (view === null || worktree === null) throw new Error(`${agent.id} has no worktree on this host`);
  const root = repositoryCommonRoot(worktree.path);
  const provider = worktreeProvider(worktree.provider, config);
  const request = { root, worktree: worktree.path, branch: worktree.branch };
  switch (action) {
    case "review":
      return { action, review: worktreeReviewSummary(worktree.path, worktree.base, worktree.branch) };
    case "land":
      if (worktreeHasChanges(worktree.path)) {
        throw new Error(`${view.name} has uncommitted changes in ${worktree.path}. Reject it with feedback so the agent commits them, or commit them there yourself.`);
      }
      return { action, strategy: provider.land({ ...request, base: worktree.base }) };
    case "remove":
      provider.remove({ ...request, discard: true });
      return { action };
    default: {
      const exhaustive: never = action;
      throw new Error(`unknown worktree action ${String(exhaustive)}`);
    }
  }
}

/** Act on an agent's worktree on the host it is on. `host` names a linked host; null is this one. */
interface WorktreeActedOn {
  readonly host: string | null;
  readonly acted: WorktreeActed;
}

async function actOnWorktree(state: DaemonState, key: string, action: WorktreeAction): Promise<WorktreeActedOn> {
  const config = state.services.settings.current().worktrees;
  return await atAgentHost<WorktreeActedOn>(state, key, {
    here: (agent) => ({ host: null, acted: actOnWorktreeHere(state.directory, config, agent, action) }),
    there: async (link, host) => ({ host: host.name, acted: await link.deliver("peer-worktree", { key, action }, config.timeout_ms) }),
  });
}

/** What review calls a branch: its name past orch's prefix. */
function reviewTarget(key: string, branch: string, prefix: string): string {
  return branch.startsWith(prefix) ? branch.slice(prefix.length) : branch || key;
}

/** Every finished agent's branch that is ahead of its base. A worktree that cannot be read, or
 *  is on a host orch cannot reach now, is not reviewable. */
export async function reviewsOf(state: DaemonState): Promise<ResultOf<"reviews">> {
  const prefix = state.services.settings.current().worktrees.branch_prefix;
  const presence = indexPresenceById(loadPresence(state.directory).values());
  const reviews: ReviewItem[] = [];
  for (const view of agentViews(state.directory)) {
    // A worktree is read where its agent runs; one on a linked host is not made yet.
    const here = hereAgentIfAny(state.directory, view.id);
    const worktree = here === null ? null : worktreeOf(state.directory, here);
    const entry = presence.get(view.id);
    // Closing a finished agent is the normal end of its turn; its branch still waits for review.
    const ended = view.endedAt !== null;
    const adapter = view.harnessId;
    if (worktree === null || !adapter || (!ended && entry?.status?.state !== "done")) continue;
    let read: WorktreeActedOn;
    try {
      read = await actOnWorktree(state, view.id, "review");
    } catch (error: unknown) {
      state.services.logger.debug("review.unreadable", { key: view.id, error: errorMessage(error) });
      continue;
    }
    if (read.acted.action !== "review" || read.acted.review.commitsAhead === 0) continue;
    const { review } = read.acted;
    const key = addressOf(view, presence);
    const resultSummary = entry?.result ? collapse(entry.result) : "";
    reviews.push({
      target: reviewTarget(key, worktree.branch, prefix),
      key,
      branch: worktree.branch,
      worktree: worktree.path,
      base: worktree.base,
      state: "done",
      task: entry?.status?.task ?? "",
      summary: resultSummary || review.summary,
      diff: review.diff,
      commitsAhead: review.commitsAhead,
      adapter,
      provider: worktree.provider,
      ended,
      host: read.host,
    });
  }
  return { reviews };
}

/** Land an agent's branch, or remove its worktree, where the worktree is. */
export async function agentWorktree(state: DaemonState, params: ParamsOf<"agent-worktree">): Promise<ResultOf<"agent-worktree">> {
  return (await actOnWorktree(state, params.key, params.action)).acted;
}

/** The far side of {@link actOnWorktree}: only for an agent the asking host asked this one to run. */
export function peerWorktreeHandler(state: DaemonState): RpcHandler<"peer-worktree"> {
  return (params, _emit, context) => {
    requireOriginPeer(state.directory, context, params.key);
    return actOnWorktreeHere(state.directory, state.services.settings.current().worktrees, placeHere(state.directory, params.key), params.action);
  };
}
