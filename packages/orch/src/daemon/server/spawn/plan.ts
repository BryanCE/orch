// What one spawn launches, planned by orchd from what the CLI asked for and orchd's own settings:
// the plexer, each agent's harness command, the worker policy, and the worktree intent.
import { headlessBackend, resolveBackend } from "../../../backends/registry.ts";
import { workerPolicyFrom, workerTools } from "../../../policy/workers.ts";
import { SpawnRefusalError } from "../../../refusal.ts";
import { errorMessage } from "../../../util.ts";
import { adapterCommand } from "./models.ts";
import type { AdapterId } from "../../../types/adapter.ts";
import type { Backend } from "../../../types/backend.ts";
import type { ThinkingLevel, WorkerPolicy } from "../../../types/policy.ts";
import type { OrchSettings } from "../../../types/settings.ts";
import type { WorktreeIntent } from "../../../worktrees/agent.ts";
import type { ParamsOf } from "../../client/protocol.ts";

export interface SpawnAgentPlan {
  readonly name: string;
  readonly adapter: AdapterId;
  /** The harness command this agent launches under: `--cmd`, or its adapter's own. */
  readonly cmd: string;
  /** The quicklist this agent's harness picker is given; never a launch gate. */
  readonly preferredModels: readonly string[];
  readonly model: string;
  readonly thinking: ThinkingLevel;
  /** The initial task, or null when the fleet starts idle. All agents have one or none have one. */
  readonly prompt: string | null;
}

export interface SpawnSettings {
  readonly backend: string;
  readonly tools: string | undefined;
  readonly workers: WorkerPolicy;
  /** The tab --tab named: an existing match is joined, not recreated. Null rolls a free label. */
  readonly tab: string | null;
  /** True when the human chose the plexer: `--plexer` or the default in `settings.json`. A
   *  chosen plexer is one orch may open a home in. A plexer orch only probed is not. */
  readonly backendChosen: boolean;
  readonly cwd: string;
  readonly commandFlag: boolean;
  readonly space: string | null;
  /** The linked host the agents run on, headless; null runs them here. */
  readonly host: { readonly name: string } | null;
  readonly prefix: string;
  /** One resolved plan per agent. */
  readonly agents: readonly SpawnAgentPlan[];
  /** Null when these agents run in the directory they were launched from. */
  readonly worktree: WorktreeIntent | null;
  readonly fleet: OrchSettings["fleet"];
  readonly tiling: OrchSettings["tiling"];
}

/** The plexer a launch names, else the configured one, else the first that can take an agent. */
export function selectBackend(explicit: string | null, settings: OrchSettings): Backend {
  try {
    return resolveBackend({ explicit, configured: settings.defaults.backend ?? null });
  } catch (error: unknown) {
    throw new SpawnRefusalError(errorMessage(error));
  }
}

/** A worktree the launch asked for, with orchd's worktree settings. */
export function worktreeIntent(requested: ParamsOf<"spawn">["worktree"], settings: OrchSettings): WorktreeIntent | null {
  return requested === null ? null : { provider: requested.provider, config: settings.worktrees };
}

/** The settings a spawn runs on. On another host the agents run with no pane: the backend
 *  that places nothing. */
export function planSpawn(params: ParamsOf<"spawn">, settings: OrchSettings): SpawnSettings {
  const backend = params.host === null ? selectBackend(params.plexer, settings) : headlessBackend;
  const agents = params.agents.map((agent): SpawnAgentPlan => {
    const preferredModels = settings.models.preferred[agent.harness] ?? [];
    const cmd = params.cmd ?? adapterCommand(agent.harness, settings, { model: agent.model, thinking: agent.thinking, preferredModels });
    return { name: agent.name, adapter: agent.harness, cmd, preferredModels, model: agent.model, thinking: agent.thinking, prompt: agent.prompt };
  });
  const first = agents[0];
  if (first === undefined) throw new SpawnRefusalError("spawn requires at least one agent");
  return {
    backend: backend.id,
    tools: workerTools(settings),
    workers: workerPolicyFrom(settings),
    tab: params.tab,
    backendChosen: (params.plexer ?? settings.defaults.backend ?? null) !== null,
    cwd: params.cwd,
    commandFlag: params.cmd !== null,
    space: params.space,
    host: params.host === null ? null : { name: params.host },
    prefix: first.name,
    agents,
    worktree: params.host === null ? worktreeIntent(params.worktree, settings) : null,
    fleet: settings.fleet,
    tiling: settings.tiling,
  };
}
