import { modelSpec } from "../../policy/thinking.ts";
import { SpawnRefusalError } from "../../refusal.ts";
import { errorMessage } from "../../util.ts";
import { retryingAsync } from "../../retry.ts";
import { askDaemon, callDaemon } from "../daemon.ts";
import type { AdapterId } from "../../types/adapter.ts";
import type { ThinkingLevel } from "../../types/policy.ts";
import type { Logger, RetryPolicy } from "../../types/core.ts";
import type { DaemonClient, Services } from "../../types/services.ts";
import type { ResultOf } from "../../daemon/client/protocol.ts";

/** A model orchd admitted on a harness, and whether that harness's running sessions take a new one. */
export type AdmittedModel = ResultOf<"admit-model">;

/** Ask orchd to admit `model` on `harness`: its policy and its catalogue rule, and a short name
 *  comes back expanded. `agent` names the running agent the model is for, or null for a launch. */
export async function admitModel(services: DaemonClient, harness: AdapterId, model: string, agent: string | null): Promise<AdmittedModel> {
  try {
    return await askDaemon(services, "admit-model", { harness, model, agent }, services.settings.current().timeouts.adapter_command_ms);
  } catch (error: unknown) {
    throw new SpawnRefusalError(errorMessage(error));
  }
}

/** Pin one agent's model, retrying while its bridge finishes registering.
 *  Re-delivering the same model is idempotent, so a bounded retry absorbs the
 *  routine race between a fresh spawn and its bridge coming up.
 *  Resolves to the agent's own refusal reason, never to a bare boolean: a pin
 *  that reports success without one is how a fleet silently ran the wrong model. */
const MODEL_PIN_RETRY: RetryPolicy = { attempts: 5, delayMs: 200, backoff: 2 };

async function deliverModelPin(services: Pick<Services, "orchDir" | "settings" | "logger">, key: string, model: string): Promise<string | null> {
  try {
    await retryingAsync(
      `pin model for ${key}`,
      () => callDaemon(services, "set-model", { target: key, model }),
      MODEL_PIN_RETRY,
    );
    return null;
  } catch (error: unknown) {
    return errorMessage(error);
  }
}

/** Pin every agent to the launch model and return the refusals as warning text.
 *  A pin is the last step of a launch whose agents already exist and are registered:
 *  its failure is a warning the caller reads, never an exit code that tells an
 *  automated caller to retry a spawn that already created agents. */
export async function pinModels(
  services: Pick<Services, "orchDir" | "settings" | "logger">,
  logger: Logger,
  created: readonly { key: string; handle: string; name: string; model: string; thinking: ThinkingLevel }[],
): Promise<string[]> {
  // The pin must carry the SAME thinking effort the launch resolved. Pinning the
  // bare model re-set the harness's model and dropped the level, so the agent fell
  // back to the harness's own default and the fleet silently ran at that effort
  // however `defaults.thinking` was configured. Spawn, `orch model` and reset's
  // re-pin all route through the same resolution.
  // `model:level` is the control plane's wire spelling, never a stored shape.
  const results = await Promise.all(created.map(async ({ key, handle, name, model, thinking }) => {
    const spec = modelSpec(model, thinking);
    return {
      handle,
      name,
      spec,
      failure: await deliverModelPin(services, key, spec),
    };
  }));
  const warnings = results
    .filter((result) => result.failure)
    .map((result) => `could not pin ${result.name} (${result.handle}) to ${result.spec}: ${result.failure}`);
  for (const warning of warnings) {
    logger.warn("spawn.model-pin-failed", { warning });
    process.stdout.write(`warning: ${warning}\n`);
  }
  return warnings;
}

/** Refuse a model change a running session cannot take: such a harness keeps the model it launched on. */
export function refuseModelChange(harness: AdapterId, admitted: Pick<AdmittedModel, "takesModel">, launched: string | null | undefined, model: string): void {
  if (admitted.takesModel || !launched || launched === model) return;
  throw new SpawnRefusalError(`${harness} cannot change a running session's model (${launched}); spawn a new agent on ${model}`);
}
