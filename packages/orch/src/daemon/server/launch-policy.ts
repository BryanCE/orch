// The policy one launch runs under, built on the host where the agent's process starts from that
// launch's project. Every launch takes it from here, whatever its form or path: a spawn into a tab,
// a headless or held launch, one a linked host asked for, a form switch, a restart and a relaunch in place.
import { CommandRefusal } from "../../refusal.ts";
import { readOnlyOf } from "../../store/read-only-rows.ts";
import { worktreeOf } from "../../store/agent-rows.ts";
import { isThinkingLevel } from "../../policy/thinking.ts";
import type { BackendSpawnOpts } from "../../types/backend.ts";
import type { FormId } from "../../types/form.ts";
import type { AgentTuning, AgentView } from "../../types/store.ts";
import type { HereAgent } from "../../types/agent-place.ts";
import { readOnlyPolicy, policyEnv, policyTools, workerPolicyFrom } from "../../policy/workers.ts";
import { withLaunchPoints } from "../../policy/compaction.ts";
import { ADAPTER_IDS, type AgentAdapter } from "../../types/adapter.ts";
import { refreshStaleShims } from "./doctor/runner.ts";
import { agentProjectDirectory, installSettings } from "./project-settings.ts";
import { offeredModels, resolveAdapterOrDie } from "./spawn/models.ts";
import type { ReadOnly } from "../../policy/read-only.ts";
import type { LaunchPolicy, LaunchRequest } from "../../types/policy.ts";
import type { DaemonServices } from "../../types/services.ts";
import type { DaemonState } from "./state.ts";

/** Builds the error a caller throws for a refused launch: each path keeps its own error class. */
export type LaunchRefusal = (message: string) => Error;

/** Refuse a read-only launch on a harness that cannot refuse a tool call: the agent would run with
 *  every tool. The one message every path gives, naming the harnesses that can. */
export function requireReadOnlyAble(adapter: AgentAdapter, name: string, readOnly: ReadOnly | null, refusal: LaunchRefusal): void {
  if (readOnly === null || adapter.readOnly !== null) return;
  const able = ADAPTER_IDS.filter((id) => resolveAdapterOrDie(id).readOnly !== null);
  throw refusal(`${adapter.id} cannot run ${name} read-only: orch has no way to refuse its tool calls. Launch it on one of: ${able.join(", ")}.`);
}

/** The launch's policy from its project's settings, writing nothing: for a preview, and inside
 *  `prepareLaunch`. It reads the project file and the model catalogue. */
export function launchPolicy(services: Pick<DaemonServices, "settingsFor" | "models">, request: LaunchRequest, refusal: LaunchRefusal): LaunchPolicy {
  requireReadOnlyAble(request.adapter, request.name, request.readOnly, refusal);
  const settings = services.settingsFor(request.project).settings;
  const role = request.adapter.readOnly;
  const base = request.readOnly === null || role === null ? workerPolicyFrom(settings) : readOnlyPolicy(settings, request.readOnly, role.tools);
  const workers = withLaunchPoints(base, offeredModels(services.models));
  return {
    workers,
    tools: policyTools(workers),
    env: policyEnv(request.adapter, request.model, workers),
    preferredModels: settings.models.preferred[request.adapter.id] ?? [],
  };
}

/** Bring a harness's shim up to the install's settings. A launch does it through `prepareLaunch`;
 *  a reload, which sends a running agent text to pick up new code, does it on its own. */
export async function refreshShim(state: DaemonState, adapter: AgentAdapter): Promise<void> {
  await refreshStaleShims(state.directory, state.services.logger, [adapter.id], installSettings(state));
}

/** Refresh the harness's shim, then build the launch's policy. Every launch on this host calls it
 *  once, before it opens any place for the agent. */
export async function prepareLaunch(state: DaemonState, request: LaunchRequest, refusal: LaunchRefusal): Promise<LaunchPolicy> {
  await refreshShim(state, request.adapter);
  return launchPolicy(state.services, request, refusal);
}

/** The project an agent that exists relaunches in: the one recorded for it, else the directory it runs in. */
function relaunchProject(state: DaemonState, view: AgentView): string {
  return agentProjectDirectory(state.directory, view.id) ?? view.environment.cwd;
}

/** Prepare an existing agent's launch from its recorded project and read-only request. */
export function prepareRelaunch(state: DaemonState, view: AgentView, adapter: AgentAdapter, model: string | null): Promise<LaunchPolicy> {
  const request = { adapter, project: relaunchProject(state, view), model: model ?? undefined, name: view.name, readOnly: readOnlyOf(state.directory, view.id) };
  return prepareLaunch(state, request, (message) => new CommandRefusal(message));
}

/** Build spawn opts shared by restarts, form switches and relaunches in place. */
export function restartOpts(state: DaemonState, agent: HereAgent, view: AgentView, launch: LaunchPolicy, tuning: AgentTuning, form: FormId): BackendSpawnOpts {
  const worktree = worktreeOf(state.directory, agent);
  return {
    ...(worktree === null ? {} : { worktree }),
    form,
    key: view.id,
    name: view.name,
    orchDir: state.directory,
    project: relaunchProject(state, view),
    cwd: view.environment.cwd,
    ...(tuning.model === null ? {} : { model: tuning.model }),
    ...(isThinkingLevel(tuning.thinking) ? { thinking: tuning.thinking } : {}),
    preferredModels: launch.preferredModels,
    workers: launch.workers,
    tools: launch.tools,
    env: launch.env,
  };
}
