// The launch decisions only an adapter can make: the command a harness launches under, and
// whether orch's model policy admits a model on it, checked against orchd's own catalogue.
import { resolveAdapter } from "../../../adapters/registry.ts";
import { admitModel } from "../../../policy/model.ts";
import { workerPolicyFrom, workerTools } from "../../../policy/workers.ts";
import { takesModel } from "../../../shared/harness.ts";
import { SpawnRefusalError } from "../../../refusal.ts";
import { errorMessage } from "../../../util.ts";
import type { AdapterId, AgentAdapter, ModelCatalogue } from "../../../types/adapter.ts";
import type { OfferedModels } from "../../../policy/compaction.ts";
import type { ThinkingLevel } from "../../../types/policy.ts";
import type { OrchSettings } from "../../../types/settings.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";
import type { DaemonState } from "../state.ts";

/** The adapter for a harness id, or a refusal naming the supported ones. */
/** The models each harness offers now, read from orchd's catalogue. */
export function offeredModels(catalogue: ModelCatalogue): OfferedModels {
  return (harness) => resolveAdapter(harness).models?.listModels(catalogue) ?? [];
}

export function resolveAdapterOrDie(id: string): AgentAdapter {
  try {
    return resolveAdapter(id);
  } catch (error: unknown) {
    throw new SpawnRefusalError(errorMessage(error));
  }
}

/** The command one harness launches under, built by that harness's own adapter. `launch` carries
 *  what this launch selected — the model it starts on and the quicklist its picker shows — so a
 *  previewed command is the command the backend actually runs. */
export function adapterCommand(
  adapter: string,
  settings: OrchSettings,
  launch: { model?: string; thinking?: ThinkingLevel; preferredModels?: readonly string[] } = {},
): string {
  const resolved = resolveAdapterOrDie(adapter);
  const opts = { ...launch, tools: workerTools(settings), workers: workerPolicyFrom(settings) };
  return resolved.workerLaunch?.restrictedInteractiveCmd(opts) ?? resolved.interactiveCmd(opts);
}

/** Enforce orch's model policy at the launch's side-effect gate and return the spec the launch
 *  runs on: a short name comes back expanded, a full spec comes back as is. */
export function admitLaunchModel(settings: OrchSettings, adapterId: AdapterId, catalogue: ModelCatalogue, model: string): string {
  const adapter = resolveAdapterOrDie(adapterId);
  try {
    return admitModel(settings, adapter, catalogue, model);
  } catch (error: unknown) {
    throw new SpawnRefusalError(errorMessage(error));
  }
}

/** The model as `harness` names it: `claude/haiku` is `haiku` to claude. */
function modelOn(harness: AdapterId, model: string): string {
  return model.startsWith(`${harness}/`) ? model.slice(harness.length + 1) : model;
}

/** Another enabled harness that admits `model`, and the model in its own vocabulary. */
function otherHarnessFor(settings: OrchSettings, catalogue: ModelCatalogue, current: AdapterId, model: string): { harness: AdapterId; model: string } | undefined {
  for (const harness of settings.enabled.adapters) {
    if (harness === current) continue;
    try {
      return { harness, model: admitModel(settings, resolveAdapterOrDie(harness), catalogue, modelOn(harness, model)) };
    } catch {
      continue;
    }
  }
  return undefined;
}

/** Admit a model for a running agent, which keeps its harness. A refusal names the harness that offers it. */
export function admitAgentModel(settings: OrchSettings, adapterId: AdapterId, catalogue: ModelCatalogue, model: string, name: string): string {
  try {
    return admitModel(settings, resolveAdapterOrDie(adapterId), catalogue, model);
  } catch (error: unknown) {
    const other = otherHarnessFor(settings, catalogue, adapterId, model);
    const hint = other === undefined
      ? ""
      : ` ${name} runs ${adapterId}, and only a restart changes its harness. Run orch restart ${name} --harness ${other.harness} --model ${other.model}, then try again.`;
    throw new SpawnRefusalError(`${errorMessage(error)}${hint}`);
  }
}

/** `admit-model`: the spec a model runs as on a harness, admitted by orchd's policy and catalogue,
 *  and whether a running session of that harness can change its model. Naming an agent asks
 *  for the running-agent refusal, which points at the harness that offers the model. */
export function admitModelFor(state: DaemonState, params: ParamsOf<"admit-model">): ResultOf<"admit-model"> {
  const { settings, models } = state.services;
  const current = settings.current();
  const model = params.agent === null
    ? admitLaunchModel(current, params.harness, models, params.model)
    : admitAgentModel(current, params.harness, models, params.model, params.agent);
  return { model, takesModel: takesModel(resolveAdapterOrDie(params.harness)) };
}
