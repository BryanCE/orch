import { assertModelAllowed } from "../../policy/model.ts";
import { modelSpec } from "../../policy/thinking.ts";
import { workerPolicyFrom, workerTools } from "../../policy/workers.ts";
import { resolveAdapterOrDie } from "../selection.ts";
import { SpawnRefusalError } from "../../refusal.ts";
import { errorMessage } from "../../util.ts";
import { retryingAsync } from "../../retry.ts";
import { callDaemon } from "../daemon.ts";
import type { AdapterId } from "../../types/adapter.ts";
import type { ThinkingLevel } from "../../types/policy.ts";
import type { Logger, RetryPolicy } from "../../types/core.ts";
import type { Services } from "../../types/services.ts";
import type { OrchSettings } from "../../types/settings.ts";


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

/** Pin one agent's model, retrying while its bridge finishes registering.
 *  Re-delivering the same model is idempotent, so a bounded retry absorbs the
 *  routine race between a fresh spawn and its bridge coming up.
 *  Resolves to the agent's own refusal reason, never to a bare boolean: a pin
 *  that reports success without one is how a fleet silently ran the wrong model. */
const MODEL_PIN_RETRY: RetryPolicy = { attempts: 5, delayMs: 200, backoff: 2 };

async function deliverModelPin(services: Pick<Services, "orchDir" | "settings">, key: string, model: string): Promise<string | null> {
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
  services: Pick<Services, "orchDir" | "settings">,
  logger: Logger,
  created: { key: string; handle: string; name: string }[],
  model: string,
  thinking?: ThinkingLevel,
): Promise<string[]> {
  // The pin must carry the SAME thinking effort the launch resolved. Pinning the
  // bare model re-set the harness's model and dropped the level, so the agent fell
  // back to the harness's own default and the fleet silently ran at that effort
  // however `defaults.thinking` was configured. Spawn, `orch model` and reset's
  // re-pin all route through the same resolution.
  // `model:level` is the control plane's wire spelling, never a stored shape.
  const spec = modelSpec(model, thinking);
  const results = await Promise.all(created.map(async ({ key, handle, name }) => ({
    handle,
    name,
    failure: await deliverModelPin(services, key, spec),
  })));
  const warnings = results
    .filter((result) => result.failure)
    .map((result) => `could not pin ${result.name} (${result.handle}) to ${spec}: ${result.failure}`);
  for (const warning of warnings) {
    logger.warn("spawn.model-pin-failed", { warning });
    process.stdout.write(`warning: ${warning}\n`);
  }
  return warnings;
}

/** The harness this command runs: flag, then ORCH_ADAPTER, then the configured default. */

/** Enforce orch's model policy at the command's side-effect gate. */
export function assertLaunchModelAllowed(orchDir: string, adapterId: AdapterId, model: string): void {
  const adapter = resolveAdapterOrDie(adapterId);
  try {
    assertModelAllowed(orchDir, adapter, model);
  } catch (error: unknown) {
    throw new SpawnRefusalError(errorMessage(error));
  }
}


