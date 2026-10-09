import { modelSpec } from "../../policy/thinking.ts";
import { NO_TUNING } from "../../policy/tuning.ts";
import type { Tuning } from "../../policy/tuning.ts";
import { admitLaunchModel, pinModels, refuseModelChange } from "../spawn/models.ts";
import { agentAdapter, agentFlags, resolveAdapterOrDie, resolveTuningOrDie } from "../selection.ts";
import { takesModel } from "../../adapters/adapter.ts";
import { readRpc, writeRpc } from "../daemon.ts";
import { parseCommand } from "../registry.ts";
import { usageError } from "../../cli/usage.ts";
import { die } from "../target.ts";
import { resolveLifecycle, refuseForeignHolder, targetName } from "../resolve.ts";
import { whoAmI } from "../self.ts";
import { lifecycleTargets, awaitIdleAfter } from "./index.ts";
import { describeHandle } from "../../backends/backend.ts";

import type { Services } from "../../types/services.ts";

interface ClearedAgent { key: string; handle: string; name: string }

/** Clear one agent's session and wait for it to come back ready. */
export async function clearSession(services: Pick<Services, "orchDir" | "settings" | "logger">, target: string, steal: boolean): Promise<ClearedAgent> {
  const self = await whoAmI(services);
  const resolved = await resolveLifecycle(services, target);
  refuseForeignHolder(self, target, resolved, steal);
  const label = describeHandle(resolved.handle);
  const ent = resolved.entity;
  const name = targetName(resolved);
  const { status } = await readRpc(services, "agent-status", { target: ent.key });
  const beforeUpdated = status?.updatedAt;
  const sentAt = Date.now();
  // The daemon owns every lifecycle mechanism: a console gets the adapter's
  // text, an agent with none is refused. Neither is the CLI's to choose.
  await writeRpc(services, "reclaim", { target: ent.key });
  await writeRpc(services, "lifecycle", { target: ent.key, verb: "reset" });
  const readyMs = services.settings.current().timeouts.reset_ready_ms;
  if (!await awaitIdleAfter(services, ent.key, beforeUpdated, sentAt)) die(`Reset ${name} failed: it did not become ready within ${Math.round(readyMs / 1000)}s.`);
  return { key: ent.key, handle: label, name };
}

export async function cmdNew(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("reset", args);
  const json = invocation.flags.has("--json");
  const steal = invocation.flags.has("--steal");
  const flags = agentFlags(invocation.flags);
  const self = await whoAmI(services);
  const { targets } = await lifecycleTargets(services, self, invocation);
  if (!targets.length) throw usageError(invocation);
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
    const model = admitLaunchModel(settings, adapter.id, services.models, tuning.model);
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
