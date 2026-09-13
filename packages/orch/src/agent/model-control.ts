// pi's model-delivery applier. Presence receives a model message from orchd;
// this module resolves the registry model, applies its optional thinking suffix,
// and reports the control outcome.
// What lives here is pi's registry resolution and nothing else. Whether a model
// is PERMITTED is orch policy, ruled on once in the control dispatcher;
// a harness never re-litigates it. Orch's ladder token names a model and a
// thinking effort; the registry keys on the bare id, so the suffix is split off
// before lookup and applied through pi's own mechanism.
import { modelSpec, splitThinkingSuffix } from "../policy/thinking.ts";
import { retryingAsync } from "../retry.ts";
import type { ControlOutcome, FindRegistryModel, ModelControlDeps, ResolvedModel } from "../types/agent.ts";
import type { BridgeMessage } from "../control/bridge-message.ts";
import type { RetryPolicy } from "../types/core.ts";
import type { ThinkingLevel } from "../types/policy.ts";
import type { JsonRecord } from "../types/core.ts";
import { randomUUID } from "node:crypto";

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

  let pin: { model: ResolvedModel; thinking?: ThinkingLevel } | undefined;
  let applying = false;
  let activeApply: Promise<void> | undefined;

  async function applyPin(nextPin: { model: ResolvedModel; thinking?: ThinkingLevel }): Promise<void> {
    const previousApply = activeApply;
    if (previousApply) await previousApply;

    applying = true;
    const operation = (async () => {
      await harness.setModel(nextPin.model);
      if (nextPin.thinking !== undefined) harness.setThinkingLevel(nextPin.thinking);
    })();
    activeApply = operation;
    try {
      await operation;
    } finally {
      activeApply = undefined;
      applying = false;
    }
  }

  function appliedModel(nextPin: { model: ResolvedModel; thinking?: ThinkingLevel }): NonNullable<ControlOutcome["applied"]> {
    const thinking = harness.getThinkingLevel();
    return {
      model: `${nextPin.model.provider}/${nextPin.model.id}`,
      ...(thinking === undefined ? {} : { thinking }),
    };
  }

  async function applyModelCommand(requestedModel: unknown): Promise<NonNullable<ControlOutcome["applied"]>> {
    const nextPin = await resolveRegistryModel(requestedModel, findModel);
    await applyPin(nextPin);
    pin = nextPin;
    return appliedModel(nextPin);
  }

  async function reassert(): Promise<void> {
    const currentPin = pin;
    if (!currentPin || applying) return;
    const id = randomUUID();
    const requested: JsonRecord = {
      model: modelSpec(`${currentPin.model.provider}/${currentPin.model.id}`, currentPin.thinking),
    };
    let error: string | undefined;
    let applied: NonNullable<ControlOutcome["applied"]> | undefined;
    try {
      await applyPin(currentPin);
      applied = appliedModel(currentPin);
    } catch (thrown: unknown) {
      error = thrown instanceof Error ? thrown.message : String(thrown);
    } finally {
      refreshPresence();
    }
    const outcome: ControlOutcome = {
      id,
      command: "model",
      requested,
      ...(applied === undefined ? {} : { applied }),
      ...(error === undefined ? {} : { error }),
    };
    recordOutcome({
      ...outcome,
      ts: new Date().toISOString(),
    });
    await reportOutcome(outcome);
  }

  function onSessionStart(): void {
    void reassert().catch(() => {
      /* A later control command can retry a failed harness apply. */
    });
  }

  function onModelSelect(model: ResolvedModel): void {
    if (applying || !pin) return;
    if (model.provider === pin.model.provider && model.id === pin.model.id) return;
    onSessionStart();
  }

  function onThinkingLevelSelect(level: ThinkingLevel): void {
    if (applying || !pin || pin.thinking === undefined || level === pin.thinking) return;
    onSessionStart();
  }

  // The dispatcher blocks on the report to learn whether the model landed, so
  // the delivery id is echoed into the outcome it must match.
  async function applyControlCommand(
    message: Extract<BridgeMessage, { action: "model" }>,
    id: string,
  ): Promise<void> {
    const requested: JsonRecord = { model: message.model };
    let error: string | undefined;
    let applied: NonNullable<ControlOutcome["applied"]> | undefined;
    try {
      applied = await applyModelCommand(message.model);
    } catch (thrown: unknown) {
      error = thrown instanceof Error ? thrown.message : String(thrown);
    }
    recordOutcome({ id, requested, success: error === undefined, ts: new Date().toISOString(), ...(applied === undefined ? {} : { applied }), ...(error === undefined ? {} : { error }) });
    const settled: ControlOutcome = { id, command: "model", requested, ...(applied === undefined ? {} : { applied }), ...(error === undefined ? {} : { error }) };
    await reportOutcome(settled);
    refreshPresence();
  }

  return { applyControlCommand, onSessionStart, onModelSelect, onThinkingLevelSelect, reassert };
}

