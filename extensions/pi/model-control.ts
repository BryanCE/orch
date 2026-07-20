// pi's handling of orch control commands that retarget the running agent: the
// {"cmd":"model","model":"provider/id[:effort]"} and {"cmd":"thinking","level":…}
// messages drained from the inbox. Extracted from presence.ts (CLAUDE.md task
// 8.6); presence owns the inbox transport and calls in here to apply a command.
//
// Two things live here that presence deliberately does not: the model allowlist
// gate (a set-model must not escape the configured patterns) and the registry
// resolution that turns a requested token into a concrete pi model. Orch's model
// ladder names a model AND a thinking effort in one token ("provider/id:medium");
// the registry keys on the bare id, so the effort suffix is split off before the
// lookup and applied through pi's own thinking mechanism afterwards.
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { allowedModelPatterns } from "../../src/config.ts";
import { atomicWrite } from "../../src/presence/writer.ts";
import { isRecord, type JsonRecord } from "../../src/util.ts";

export type ResolvedModel = NonNullable<ExtensionContext["model"]>;
export type ThinkingLevel = Parameters<ExtensionAPI["setThinkingLevel"]>[0];

/** A raw inbox control command; `cmd` selects which of `model`/`level` is meaningful. */
export interface ControlCommand {
  cmd: string;
  model?: unknown;
  level?: unknown;
}

export function isControlCommand(value: unknown): value is ControlCommand {
  return isRecord(value) && typeof value.cmd === "string";
}

const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;

export function isThinkingLevel(value: unknown): value is ThinkingLevel {
  return typeof value === "string" && (THINKING_LEVELS as readonly string[]).includes(value);
}

/**
 * Split orch's ladder token ("provider/id:medium") into the bare model id and the
 * thinking effort. Only a trailing `:token` whose token is itself a valid thinking
 * level is treated as a suffix — a colon anywhere else stays part of the model id,
 * so a provider whose ids legitimately contain colons is never truncated.
 */
export function splitThinkingSuffix(model: string): { bare: string; thinking?: ThinkingLevel } {
  const colon = model.lastIndexOf(":");
  if (colon <= 0) return { bare: model };
  const suffix = model.slice(colon + 1);
  if (!isThinkingLevel(suffix)) return { bare: model };
  return { bare: model.slice(0, colon), thinking: suffix };
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, (char) => `\\${char}`);
  return new RegExp(`^${escaped.replace(/\*/g, ".*")}$`);
}

/** True when the bare `provider/id` matches the configured allowlist. `openai-codex/*` is always allowed. */
export function isAllowedModel(orchDir: string, bareModel: string): boolean {
  if (bareModel.startsWith("openai-codex/")) return true;
  for (const pattern of allowedModelPatterns(orchDir)) {
    if (globToRegex(pattern).test(bareModel)) return true;
  }
  return false;
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
 * effort. The `:effort` suffix is split off BEFORE the allowlist gate and the
 * registry lookup — the registry keys on the bare id, so a suffixed token that
 * `pi --list-models` shows would otherwise never be found (task 12.7).
 *
 * Registry-find ONLY: a plain candidate object from getAvailable() passes setModel
 * but poisons the next turn ("Model not found <id>"). The bounded retry re-reads
 * the registry each attempt, so a session still booting its providers is tolerated.
 */
export async function resolveRegistryModel(
  requestedModel: unknown,
  orchDir: string,
  findModel: FindRegistryModel,
  retry: RegistryRetry = DEFAULT_REGISTRY_RETRY,
): Promise<{ model: ResolvedModel; thinking?: ThinkingLevel }> {
  if (typeof requestedModel !== "string") throw new Error("Model must be a provider/id string");
  const { bare, thinking } = splitThinkingSuffix(requestedModel);
  const slash = bare.indexOf("/");
  if (slash <= 0 || slash === bare.length - 1) {
    throw new Error("Model must be a provider/id string");
  }
  if (!isAllowedModel(orchDir, bare)) {
    throw new Error(`Model not allowed: ${bare}`);
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
  orchDir: string;
  /** The running agent's context, read fresh so a retry sees a registry that just loaded. */
  context: () => ExtensionContext | undefined;
  /** Absolute path of pi's control.json outcome record; resolved lazily (set at presence init). */
  controlFile: () => string;
  /** Re-read the applied model into presence state and flush status.json. */
  refreshPresence: () => void;
}

/** pi's control-command applier: resolves+applies a model or thinking change and records the outcome. */
export function createModelControl(deps: ModelControlDeps) {
  const { pi, orchDir, context, controlFile, refreshPresence } = deps;
  const findModel: FindRegistryModel = (provider, id) => context()?.modelRegistry.find(provider, id);

  function applyThinkingLevel(level: unknown): void {
    if (!isThinkingLevel(level)) throw new Error("Thinking level must be valid");
    pi.setThinkingLevel(level);
  }

  async function applyModelCommand(requestedModel: unknown): Promise<void> {
    const { model, thinking } = await resolveRegistryModel(requestedModel, orchDir, findModel);
    await pi.setModel(model);
    if (thinking !== undefined) pi.setThinkingLevel(thinking);
  }

  async function applyControlCommand(parsed: ControlCommand): Promise<void> {
    const requested: JsonRecord = parsed.cmd === "model"
      ? { model: parsed.model }
      : { thinking: parsed.level };
    const outcome: JsonRecord = { requested, success: false, ts: new Date().toISOString() };
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
