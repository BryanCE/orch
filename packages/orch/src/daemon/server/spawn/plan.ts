// What one spawn launches, planned by orchd from what the CLI asked for and orchd's own settings:
// the plexer, each agent's harness and form, and the worktree intent.
import { heldBackend, resolveBackend } from "../../../backends/registry.ts";
import { SpawnRefusalError } from "../../../refusal.ts";
import { errorMessage } from "../../../util.ts";
import { resolveAdapterOrDie } from "./models.ts";
import { requireReadOnlyAble } from "../launch-policy.ts";
import { nativeForm, offersForm, type FormId } from "../../../types/form.ts";
import type { AgentAdapter, AdapterId } from "../../../types/adapter.ts";
import type { Backend } from "../../../types/backend.ts";
import type { ReadOnly } from "../../../policy/read-only.ts";
import type { ThinkingLevel } from "../../../types/policy.ts";
import type { OrchSettings } from "../../../types/settings.ts";
import type { WorktreeIntent } from "../../../worktrees/agent.ts";
import type { ParamsOf } from "../../client/protocol.ts";

interface SpawnAgentCommon {
  /** The form the spawn asked for with `--form`, unresolved; a linked host resolves it. */
  readonly requestedForm: FormId | null;
  readonly backend: Backend;
  readonly name: string;
  readonly adapter: AdapterId;
  readonly model: string;
  readonly thinking: ThinkingLevel;
  /** The initial task, or null when the fleet starts idle. All agents have one or none have one. */
  readonly prompt: string | null;
  /** Set for a read-only agent, with the one directory it may write in. Its launch builds the policy. */
  readonly readOnly: ReadOnly | null;
}

/** An agent launched here: its form and the backend that holds it are resolved. */
export interface LocalSpawnAgentPlan extends SpawnAgentCommon {
  readonly form: FormId;
}

/** An agent on a linked host: that host's orchd resolves its form. */
export interface FarSpawnAgentPlan extends SpawnAgentCommon {
  readonly form: null;
}

export type SpawnAgentPlan = LocalSpawnAgentPlan | FarSpawnAgentPlan;

export interface SpawnSettings {
  readonly backend: string;
  /** The tab --tab named: an existing match is joined, not recreated. Null rolls a free label. */
  readonly tab: string | null;
  /** True when the human chose the plexer: `--plexer` or the default in `settings.json`. A
   *  chosen plexer is one orch may open a home in. A plexer orch only probed is not. */
  readonly backendChosen: boolean;
  readonly cwd: string;
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

/** Match an agent's selected form to the stdio a backend offers. */
export function selectSpawnForm(requested: FormId | null, defaults: OrchSettings["defaults"]["forms"], adapter: AgentAdapter, backend: Backend, held: Backend): { form: FormId; backend: Backend } {
  const selected = requested ?? defaults[adapter.id] ?? adapter.preferredForm ?? undefined;
  if (selected === undefined) {
    const form = nativeForm(backend.offers);
    if (form === null) throw new SpawnRefusalError(`no backend here runs a native form`);
    return { form, backend };
  }
  const supported: Record<FormId, boolean> = { tui: true, oneshot: true, acp: adapter.acp !== null, server: adapter.server !== null };
  if (!supported[selected]) throw new SpawnRefusalError(`harness ${adapter.id} has no ${selected} form`);
  const compatible = offersForm(backend.offers, selected);
  if (compatible) return { form: selected, backend };
  if (offersForm(held.offers, selected)) return { form: selected, backend: held };
  throw new SpawnRefusalError(`no backend here runs the ${selected} form`);
}

/** The plexer a spawn asks for, and whether the human chose it: the one reading both spawn paths share. */
export function plexerRequest(params: Pick<ParamsOf<"spawn">, "plexer" | "host">, settings: OrchSettings): { backend: Backend; backendChosen: boolean } {
  return {
    backend: params.host === null ? selectBackend(params.plexer, settings) : heldBackend,
    backendChosen: params.plexer !== null || settings.defaults.backend !== undefined,
  };
}

/** The local plan of one agent. Its form was resolved here, so a far agent's plan is refused. */
export function localAgentPlan(plan: SpawnAgentPlan): LocalSpawnAgentPlan {
  if (plan.form === null) throw new SpawnRefusalError(`agent ${plan.name} has no form resolved here`);
  return plan;
}

/** A worktree the launch asked for, with orchd's worktree settings. */
export function worktreeIntent(requested: ParamsOf<"spawn">["worktree"], settings: OrchSettings): WorktreeIntent | null {
  return requested === null ? null : { provider: requested.provider, config: settings.worktrees };
}

/** The settings a spawn runs on. On another host the agents run with no pane: the backend
 *  that places nothing. */
export function planSpawn(params: ParamsOf<"spawn">, settings: OrchSettings, chosen?: Backend): SpawnSettings {
  const requested = plexerRequest(params, settings);
  const backend = chosen ?? requested.backend;
  const agents = params.agents.map((agent): SpawnAgentPlan => {
    const common = { requestedForm: params.form, name: agent.name, adapter: agent.harness, model: agent.model, thinking: agent.thinking, prompt: agent.prompt, backend, readOnly: agent.readOnly };
    // A far agent's launch is built on its host, which refuses what it cannot run.
    if (params.host !== null) return { ...common, form: null };
    const adapter = resolveAdapterOrDie(agent.harness);
    // Refused here, before anything is made, as its launch would refuse it.
    requireReadOnlyAble(adapter, agent.name, agent.readOnly, (message) => new SpawnRefusalError(message));
    return { ...common, ...selectSpawnForm(params.form, settings.defaults.forms, adapter, backend, heldBackend) };
  });
  const first = agents[0];
  if (first === undefined) throw new SpawnRefusalError("spawn requires at least one agent");
  return {
    backend: backend.id,
    tab: params.tab,
    backendChosen: requested.backendChosen,
    cwd: params.cwd,
    space: params.space,
    host: params.host === null ? null : { name: params.host },
    prefix: first.name,
    agents,
    worktree: params.host === null ? worktreeIntent(params.worktree, settings) : null,
    fleet: settings.fleet,
    tiling: settings.tiling,
  };
}
