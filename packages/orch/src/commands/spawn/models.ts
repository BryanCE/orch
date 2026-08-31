import { orchDir } from "../../presence/store.ts";
import { loadConfig } from "../../config.ts";
import { assertModelAllowed } from "../../policy/model.ts";
import { resolveThinking, splitThinkingSuffix } from "../../policy/thinking.ts";
import { workerPolicyFrom, workerTools } from "../../policy/workers.ts";
import { repickCommand } from "../../adapters/prerequisites.ts";
import { pickAdapter, requestedModel, resolveAdapterOrDie } from "../selection.ts";
import { SpawnRefusalError } from "../../refusal.ts";
import { resolveBackend } from "../../backends/registry.ts";
import { errorMessage } from "../../util.ts";
import { retryingAsync } from "../../retry.ts";
import { callDaemon } from "../daemon.ts";
import { die } from "../target.ts";
import { commandLogger } from "../logging.ts";
import type { Backend } from "../../types/backend.ts";
import type { AdapterId, AgentAdapter } from "../../types/adapter.ts";
import type { ThinkingLevel } from "../../types/policy.ts";
import type { RetryPolicy } from "../../types/core.ts";
import type { OrchConfig } from "../../types/config.ts";
import type { AgentFlags, AgentSettings } from "../../types/command.ts";


/** The command one harness launches under, built by that harness's own adapter. `launch` carries
 *  what this launch selected — the model it starts on and the quicklist its picker shows — so a
 *  previewed command is the command the backend actually runs. */
export function adapterCommand(
  adapter: string,
  config = loadConfig(orchDir()),
  launch: { model?: string; thinking?: ThinkingLevel; preferredModels?: readonly string[] } = {},
): string {
  const resolved = resolveAdapterOrDie(adapter);
  const opts = { ...launch, tools: workerTools(config), workers: workerPolicyFrom(config) };
  return resolved.workerLaunch?.restrictedInteractiveCmd(opts) ?? resolved.interactiveCmd(opts);
}

/** Pin one agent's model, retrying while its bridge finishes registering.
 *  Re-delivering the same model is idempotent, so a bounded retry absorbs the
 *  routine race between a fresh spawn and its bridge coming up.
 *  Resolves to the agent's own refusal reason, never to a bare boolean: a pin
 *  that reports success without one is how a fleet silently ran the wrong model. */
const MODEL_PIN_RETRY: RetryPolicy = { attempts: 5, delayMs: 200, backoff: 2 };

async function deliverModelPin(key: string, model: string): Promise<string | null> {
  try {
    await retryingAsync(
      `pin model for ${key}`,
      () => callDaemon("set-model", { target: key, model }),
      MODEL_PIN_RETRY,
    );
    return null;
  } catch (error: unknown) {
    return errorMessage(error);
  }
}

/** Pin every agent to the launch model and return the refusals as warning text.
 *  A pin is the last step of a launch whose panes already exist and are registered:
 *  its failure is a warning the caller reads, never an exit code that tells an
 *  automated caller to retry a spawn that already created panes. */
export async function pinModels(
  created: { key: string; pane: string; name: string }[],
  model: string,
  thinking?: ThinkingLevel,
): Promise<string[]> {
  // The pin must carry the SAME thinking effort the launch resolved. Pinning the
  // bare model re-set the harness's model and dropped the level, so the agent fell
  // back to the harness's own default and the fleet silently ran at that effort
  // however `defaults.thinking` was configured. Spawn, `orch model` and reset's
  // re-pin all route through the same resolution.
  // `model:level` is the control plane's wire spelling, never a stored shape.
  const spec = thinking === undefined ? model : `${model}:${thinking}`;
  const results = await Promise.all(created.map(async ({ key, pane, name }) => ({
    pane,
    name,
    failure: await deliverModelPin(key, spec),
  })));
  const warnings = results
    .filter((result) => result.failure)
    .map((result) => `could not pin ${result.name} (${result.pane}) to ${spec}: ${result.failure}`);
  for (const warning of warnings) {
    commandLogger().warn("spawn.model-pin-failed", { warning });
    process.stdout.write(`warning: ${warning}\n`);
  }
  return warnings;
}

/** The harness this command runs: flag, then ORCH_ADAPTER, then the configured default. */

/** The model a fresh session runs on: what the caller named, else the configured
 *  default. With neither, refuse — an unpinned session silently runs whatever the
 *  harness happens to default to, which is never what the orchestrator asked for.
 *  Every path that starts a clean session (spawn, tile, reset) resolves it here. Spawn
 *  validates the model only after policy accepts; the launch hands this string to the harness CLI, whose own
 *  resolver fuzzy-matches a shorthand onto whatever registry entry shares a prefix. A
 *  model the harness does not list must never reach that resolver. */
export function launchModel(flags: AgentFlags, config: OrchConfig, adapter: AgentAdapter): string {
  const model = requestedModel(flags) ?? config.defaults.models[adapter.id] ?? "";
  if (!model) die(`no model selected for ${adapter.id} - pass --model <model[:thinking]>, or record one with: ${repickCommand(adapter.id)}`);
  return splitThinkingSuffix(model).bare;
}

/** Enforce orch's model policy at the command's side-effect gate. */
export function assertLaunchModelAllowed(adapterId: AdapterId, model: string): void {
  const adapter = resolveAdapterOrDie(adapterId);
  try {
    assertModelAllowed(orchDir(), adapter, model);
  } catch (error: unknown) {
    throw new SpawnRefusalError(errorMessage(error));
  }
}

export function resolveAgentSettings(flags: AgentFlags, config = loadConfig(orchDir())): AgentSettings {
  const adapter = pickAdapter(flags, config);
  const harness = resolveAdapterOrDie(adapter);
  // Selection flows through the backend factory: explicit flag/env, then config
  // default, then a capability-probed fallback. No per-backend branch is hard-coded here.
  let backend: Backend;
  try {
    backend = resolveBackend({
      explicit: flags.backendFlag ?? process.env.ORCH_BACKEND ?? null,
      configured: config.defaults.backend ?? null,
    });
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  return {
    adapter,
    backend: backend.id,
    model: launchModel(flags, config, harness),
    thinking: resolveThinking({ flag: flags.thinkingFlag, modelSuffix: splitThinkingSuffix(requestedModel(flags) ?? config.defaults.models[adapter] ?? "").thinking, harness: adapter, config }),
    preferredModels: config.models.preferred[adapter] ?? [],
  };
}

