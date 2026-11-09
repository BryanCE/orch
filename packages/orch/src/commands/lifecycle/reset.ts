import { modelSpec } from "../../policy/thinking.ts";
import { NO_TUNING } from "../../policy/tuning.ts";
import type { Tuning } from "../../policy/tuning.ts";
import { admitAgentModel, pinModels, refuseModelChange } from "../spawn/models.ts";
import { agentAdapter, resolveAdapterOrDie, resolveTuningOrDie } from "../selection.ts";
import { takesModel } from "../../shared/harness.ts";
import { writeRpc } from "../daemon.ts";
import { hostCallTimeoutMs } from "../host.ts";
import { placeLabel, resolveLifecycle, refuseForeignHolder, targetName } from "../resolve.ts";
import { whoAmI } from "../self.ts";
import { requireLifecycleTargets } from "./index.ts";

import type { Services } from "../../types/services.ts";

interface ClearedAgent { key: string; handle: string; name: string }

/** Clear one agent's session and wait for it to come back ready. orchd does both where the
 *  agent runs: here, or through its host's orchd, which clears and waits on its own agent. */
export async function clearSession(services: Pick<Services, "orchDir" | "settings" | "logger">, target: string, steal: boolean): Promise<ClearedAgent> {
  const self = await whoAmI(services);
  const resolved = await resolveLifecycle(services, target);
  refuseForeignHolder(self, target, resolved, steal);
  const waitMs = services.settings.current().timeouts.reset_ready_ms + hostCallTimeoutMs(services);
  await writeRpc(services, "clear-session", { target: resolved.key }, { steal }, waitMs);
  return { key: resolved.key, handle: placeLabel(resolved), name: targetName(resolved) };
}

export async function cmdNew(services: Services, args: string[]): Promise<void> {
  const { self, targets, json, steal, selection: flags } = await requireLifecycleTargets(services, "reset", args);
  const settings = services.settings.current();
  // Check ownership before resolving model configuration: a driving verb must
  // name a live foreign holder even when this caller has no model selected.
  const owned = await Promise.all(targets.map(async (target) => {
    const resolved = await resolveLifecycle(services, target);
    refuseForeignHolder(self, target, resolved, steal);
    return { target, key: resolved.key, tuning: resolved.view?.tuning ?? NO_TUNING, harness: resolved.view?.harnessId };
  }));
  // Each agent keeps the tuning it holds unless this reset names another: a
  // reset clears the session, never the model the orchestrator chose.
  const plans = owned.map(({ target, tuning: pinned, harness }) => {
    const adapter = resolveAdapterOrDie(agentAdapter(flags, settings, harness));
    const tuning = resolveTuningOrDie(flags, settings, adapter.id, pinned);
    const model = admitAgentModel(settings, adapter.id, services.models, tuning.model, target);
    refuseModelChange(adapter, pinned.model, model);
    return { target, pinnable: takesModel(adapter), tuning: { ...tuning, model } };
  });
  const cleared: (ClearedAgent & Tuning)[] = [];
  const pins: (ClearedAgent & Tuning)[] = [];
  for (const plan of plans) {
    const agent = await clearSession(services, plan.target, steal);
    cleared.push({ ...agent, ...plan.tuning });
    if (plan.pinnable) pins.push({ ...agent, ...plan.tuning });
    if (!json) process.stdout.write(`Cleared ${agent.name}'s session; ready.\n`);
  }
  // A reset that could not re-pin its model left the agent on the wrong one, and
  // re-running reset is idempotent — unlike a spawn, nothing duplicates on retry.
  if ((await pinModels(services, services.logger, pins)).length) process.exitCode = 1;
  const results = cleared.map((agent) => ({ target: agent.handle, cleared: true, ready: true }));
  if (json) process.stdout.write(JSON.stringify(results.length === 1 ? results[0] : results) + "\n");
  else for (const agent of cleared) process.stdout.write(`Pinned ${agent.name} to ${modelSpec(agent.model, agent.thinking)}.\n`);
}
