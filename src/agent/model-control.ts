// pi's handling of orch control commands that retarget the running agent: the
// {"cmd":"model","model":"provider/id[:effort]"} and {"cmd":"thinking","level":…}
// messages drained from the inbox. Extracted from presence.ts (CLAUDE.md task
// 8.6); presence owns the inbox transport and calls in here to apply a command.
//
// What lives here is pi's registry resolution and nothing else. Whether a model
// is PERMITTED is orch policy, ruled on once in the control dispatcher
// (src/policy/model.ts) before the command is ever written to the inbox — a
// harness never re-litigates it. Orch's ladder token names a model AND a
// thinking effort ("provider/id:medium"); the registry keys on the bare id, so
// the suffix is split off before lookup and applied through pi's own mechanism.
import { isThinkingLevel, splitThinkingSuffix } from "../policy/thinking.ts";
import { atomicWrite } from "../presence/writer.ts";
import { retryingAsync } from "../retry.ts";
import { isRecord } from "../util.ts";
import type { ControlCommand, FindRegistryModel, ModelControlDeps, ResolvedModel } from "../types/agent.ts";
import type { RetryPolicy } from "../types/core.ts";
import type { ThinkingLevel } from "../types/policy.ts";
import type { JsonRecord } from "../types/core.ts";

export type { ThinkingLevel };

export function isControlCommand(value: unknown): value is ControlCommand {
  return isRecord(value) && typeof value.cmd === "string";
}

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
    async () => findModel(provider, id),
    retry,
    { retryOnResult: (value) => value === undefined },
  );
  if (model === undefined) throw new Error(`Model not in registry (session still booting?): ${bare}`);
  return { model, thinking };
}

/** pi's control-command applier: resolves+applies a model or thinking change and records the outcome. */
export function createModelControl(deps: ModelControlDeps) {
  const { harness, context, controlFile, refreshPresence } = deps;
  const findModel: FindRegistryModel = (provider, id) => context()?.modelRegistry.find(provider, id);

  function applyThinkingLevel(level: unknown): void {
    if (!isThinkingLevel(level)) throw new Error("Thinking level must be valid");
    harness.setThinkingLevel(level);
  }

  async function applyModelCommand(requestedModel: unknown): Promise<void> {
    const { model, thinking } = await resolveRegistryModel(requestedModel, findModel);
    await harness.setModel(model);
    if (thinking !== undefined) harness.setThinkingLevel(thinking);
  }

  // The dispatcher blocks on this record to learn whether its command landed, so
  // the outcome carries back the request id it must match.
  async function applyControlCommand(parsed: ControlCommand): Promise<void> {
    const requested: JsonRecord = parsed.cmd === "model"
      ? { model: parsed.model }
      : { thinking: parsed.level };
    const outcome: JsonRecord = { id: parsed.id, requested, success: false, ts: new Date().toISOString() };
    try {
      if (parsed.cmd === "model") {
        await applyModelCommand(parsed.model);
      } else {
        applyThinkingLevel(parsed.level);
      }
      outcome.success = true;
    } catch (error: unknown) {
      outcome.error = error instanceof Error ? error.message : String(error);
    }
    atomicWrite(controlFile(), outcome);
    refreshPresence();
  }

  return { applyControlCommand };
}

