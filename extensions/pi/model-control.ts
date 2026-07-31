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
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { isThinkingLevel, splitThinkingSuffix, type ThinkingLevel } from "../../src/policy/model.ts";
import { atomicWrite } from "../../src/presence/writer.ts";
import { isRecord, type JsonRecord } from "../../src/util.ts";

export type ResolvedModel = NonNullable<ExtensionContext["model"]>;
export type { ThinkingLevel };

/** A raw inbox control command; `cmd` selects which of `model`/`level` is meaningful. */
export interface ControlCommand {
  cmd: string;
  /** Dispatcher-minted request id, echoed into the control outcome so the waiter matches its own command. */
  id?: unknown;
  model?: unknown;
  level?: unknown;
}

export function isControlCommand(value: unknown): value is ControlCommand {
  return isRecord(value) && typeof value.cmd === "string";
}

/** Look up a registry model by bare provider + id; a fresh value each call so a retry sees a just-loaded registry. */
export type FindRegistryModel = (provider: string, id: string) => ResolvedModel | undefined;

/** Bounded retry while a fresh session's model registry finishes loading. */
export interface RegistryRetry {
  attempts: number;
  delayMs: number;
}

const DEFAULT_REGISTRY_RETRY: RegistryRetry = { attempts: 8, delayMs: 250 };

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
  retry: RegistryRetry = DEFAULT_REGISTRY_RETRY,
): Promise<{ model: ResolvedModel; thinking?: ThinkingLevel }> {
  if (typeof requestedModel !== "string") throw new Error("Model must be a provider/id string");
  const { bare, thinking } = splitThinkingSuffix(requestedModel);
  const slash = bare.indexOf("/");
  if (slash <= 0 || slash === bare.length - 1) {
    throw new Error("Model must be a provider/id string");
  }
  const provider = bare.slice(0, slash);
  const id = bare.slice(slash + 1);
  let model: ResolvedModel | undefined;
  for (let attempt = 0; attempt < retry.attempts && !model; attempt++) {
    model = findModel(provider, id);
    if (!model) await new Promise((resolve) => setTimeout(resolve, retry.delayMs));
  }
  if (!model) throw new Error(`Model not in registry (session still booting?): ${bare}`);
  return { model, thinking };
}

export interface ModelControlDeps {
  pi: ExtensionAPI;
  /** The running agent's context, read fresh so a retry sees a registry that just loaded. */
  context: () => ExtensionContext | undefined;
  /** Absolute path of the presence control-outcome record; resolved lazily (set at presence init). */
  controlFile: () => string;
  /** Re-read the applied model into presence state and flush status.json. */
  refreshPresence: () => void;
}

/** pi's control-command applier: resolves+applies a model or thinking change and records the outcome. */
export function createModelControl(deps: ModelControlDeps) {
  const { pi, context, controlFile, refreshPresence } = deps;
  const findModel: FindRegistryModel = (provider, id) => context()?.modelRegistry.find(provider, id);

  function applyThinkingLevel(level: unknown): void {
    if (!isThinkingLevel(level)) throw new Error("Thinking level must be valid");
    pi.setThinkingLevel(level);
  }

  async function applyModelCommand(requestedModel: unknown): Promise<void> {
    const { model, thinking } = await resolveRegistryModel(requestedModel, findModel);
    await pi.setModel(model);
    if (thinking !== undefined) pi.setThinkingLevel(thinking);
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

export type ModelControl = ReturnType<typeof createModelControl>;
