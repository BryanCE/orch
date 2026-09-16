import { selectAgentStatus } from "../../store/status-rows.ts";
import { tuningOf } from "../../store/agent-view.ts";
import { modelSpec } from "../../policy/thinking.ts";
import type { Tuning } from "../../policy/tuning.ts";
import { admitLaunchModel, pinModels } from "../spawn/models.ts";
import { agentFlags, pickAdapter, resolveAdapterOrDie, resolveTuningOrDie } from "../selection.ts";
import { writeRpc } from "../daemon.ts";
import { parseCommand } from "../registry.ts";
import { assertAgentOwned, die, resolveLifecycleTarget } from "../target.ts";
import { lifecycleTargets, awaitIdleAfter } from "./index.ts";
import { describeHandle } from "./close.ts";

import type { Services } from "../../types/services.ts";

interface ClearedAgent { key: string; handle: string; name: string }

/** Clear one agent's session and wait for it to come back ready. */
export async function clearSession(services: Pick<Services, "orchDir" | "settings" | "logger">, target: string, force: boolean): Promise<ClearedAgent> {
  // Resolved through the lifecycle resolver, which answers for an agent placed
  // nowhere; the placement resolver rejects the whole headless fleet outright.
  const { entity: ent, handle } = resolveLifecycleTarget(services.orchDir, services.settings.current(), target);
  const label = describeHandle(handle);
  assertAgentOwned(services.orchDir, target, ent, force);
  const beforeUpdated = selectAgentStatus(services.orchDir, ent.key)?.updatedAt;
  const sentAt = Date.now();
  // The daemon owns every lifecycle mechanism: a console gets the adapter's
  // text, an agent with none is refused. Neither is the CLI's to choose.
  await writeRpc(services, "reclaim", { target: ent.key });
  await writeRpc(services, "lifecycle", { target: ent.key, verb: "reset" });
  if (!awaitIdleAfter(services.orchDir, ent.key, beforeUpdated, sentAt)) die(`${label}: reset did not become ready within 75s.`);
  return { key: ent.key, handle: label, name: ent.name ?? label };
}

export async function cmdNew(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("reset", args);
  const json = invocation.flags.has("--json");
  const force = invocation.flags.has("--force");
  const flags = agentFlags(invocation.flags);
  const { targets } = await lifecycleTargets(services, invocation);
  if (!targets.length) die("usage: orch reset <target>... | --all [--model <model>] [--thinking <level>] [--json]");
  const settings = services.settings.current();
  // Check ownership before resolving model configuration: a driving verb must
  // name a live foreign holder even when this caller has no model selected.
  const owned = targets.map((target) => {
    const { entity: ent } = resolveLifecycleTarget(services.orchDir, settings, target);
    assertAgentOwned(services.orchDir, target, ent, force);
    return { target, key: ent.key };
  });
  const adapter = resolveAdapterOrDie(pickAdapter(flags, settings));
  // Each agent keeps the tuning it holds unless this reset names another: a
  // reset clears the session, never the model the orchestrator chose.
  const plans = owned.map(({ target, key }) => {
    const tuning = resolveTuningOrDie(flags, settings, adapter.id, tuningOf(services.orchDir, key));
    return { target, tuning: { ...tuning, model: admitLaunchModel(settings, adapter.id, services.models, tuning.model) } };
  });
  const cleared: (ClearedAgent & Tuning)[] = [];
  for (const plan of plans) {
    const agent = await clearSession(services, plan.target, force);
    cleared.push({ ...agent, ...plan.tuning });
    if (!json) process.stdout.write(`Cleared session on ${agent.handle}; ready.\n`);
  }
  // A reset that could not re-pin its model left the agent on the wrong one, and
  // re-running reset is idempotent — unlike a spawn, nothing duplicates on retry.
  if ((await pinModels(services, services.logger, cleared)).length) process.exitCode = 1;
  const results = cleared.map((agent) => ({ target: agent.handle, cleared: true, ready: true }));
  if (json) process.stdout.write(JSON.stringify(results.length === 1 ? results[0] : results) + "\n");
  else for (const agent of cleared) process.stdout.write(`Pinned ${agent.handle} to ${modelSpec(agent.model, agent.thinking)}.\n`);
}
