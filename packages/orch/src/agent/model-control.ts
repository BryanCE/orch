// pi's model-delivery applier. Presence receives a model message from orchd;
// this module resolves the registry model, applies its optional thinking suffix,
// and reports the control outcome.
// What lives here is pi's registry resolution and nothing else. Whether a model
// is PERMITTED is orch policy, ruled on once in the control dispatcher;
// a harness never re-litigates it. Orch's ladder token names a model and a
// thinking effort; the registry keys on the bare id, so the suffix is split off
// before lookup and applied through pi's own mechanism.
import { splitThinkingSuffix } from "../policy/thinking.ts";
import { retryingAsync } from "../retry.ts";
import type { ControlOutcome, FindRegistryModel, ModelControlDeps, ResolvedModel } from "../types/agent.ts";
import type { BridgeMessage } from "../control/bridge-message.ts";
import type { RetryPolicy } from "../types/core.ts";
import type { ThinkingLevel } from "../types/policy.ts";
import type { JsonRecord } from "../types/core.ts";

export type { ThinkingLevel };

const DEFAULT_REGISTRY_RETRY: RetryPolicy = { attempts: 8, delayMs: 250, backoff: 1 };

/**
 * Resolve a requested model token to a concrete registry model plus any thinking
 * effort. The `:effort` suffix is split off before the registry lookup — the
 * registry keys on the bare id, so a suffixed token that `pi --list-models`
 * shows would otherwise never be found (task 12.7).
 *
 * Registry-find ONLY: a plain candidate object from getAvailable() passes setModel
 * but poisons the next turn ("Model not found <id>"). The bounded retry re-reads
 * the registry each attempt, so a session still booting its providers is tolerated.
 */
export async function resolveRegistryModel(
  requestedModel: unknown,
  findModel: FindRegistryModel,
  retry: RetryPolicy = DEFAULT_REGISTRY_RETRY,
): Promise<{ model: ResolvedModel; thinking?: ThinkingLevel }> {
  if (typeof requestedModel !== "string") throw new Error("Model must be a provider/id string");
  const { bare, thinking } = splitThinkingSuffix(requestedModel);
  const slash = bare.indexOf("/");
  if (slash <= 0 || slash === bare.length - 1) {
    throw new Error("Model must be a provider/id string");
  }
  const provider = bare.slice(0, slash);
  const id = bare.slice(slash + 1);
  const model = await retryingAsync(
    `Model not in registry (session still booting?): ${bare}`,
    () => findModel(provider, id),
    retry,
    { retryOnResult: (value) => value === undefined },
  );
  if (model === undefined) throw new Error(`Model not in registry (session still booting?): ${bare}`);
  return { model, thinking };
}

/** pi's control-command applier: resolves+applies a model or thinking change and records the outcome. */
export function createModelControl(deps: ModelControlDeps) {
  const { harness, context, recordOutcome, reportOutcome, refreshPresence } = deps;
  const findModel: FindRegistryModel = (provider, id) => context()?.modelRegistry.find(provider, id);

  async function applyModelCommand(requestedModel: unknown): Promise<void> {
    const { model, thinking } = await resolveRegistryModel(requestedModel, findModel);
    await harness.setModel(model);
    if (thinking !== undefined) harness.setThinkingLevel(thinking);
  }

  // The dispatcher blocks on the report to learn whether the model landed, so
  // the delivery id is echoed into the outcome it must match.
  async function applyControlCommand(
    message: Extract<BridgeMessage, { action: "model" }>,
    id: string,
  ): Promise<void> {
    const requested: JsonRecord = { model: message.model };
    let error: string | undefined;
    try {
      await applyModelCommand(message.model);
    } catch (thrown: unknown) {
      error = thrown instanceof Error ? thrown.message : String(thrown);
    }
    recordOutcome({ id, requested, success: error === undefined, ts: new Date().toISOString(), ...(error === undefined ? {} : { error }) });
    const settled: ControlOutcome = { id, command: "model", requested, ...(error === undefined ? {} : { error }) };
    await reportOutcome(settled);
    refreshPresence();
  }

  return { applyControlCommand };
}

