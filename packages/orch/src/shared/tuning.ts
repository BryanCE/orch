// The model and effort a command applies, refused with the fix when it names none.
import { resolveTuning, type Tuning } from "../policy/tuning.ts";
import { repickCommand } from "./prerequisites.ts";
import { die } from "../refusal.ts";
import type { AdapterId } from "../types/adapter.ts";
import type { AgentFlags } from "../types/command.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { AgentTuning } from "../types/store.ts";

/** The model THIS command named, or null when the caller named none. NEVER the
 *  configured default: only a launch may apply that. A dispatch that fell back to
 *  it re-pinned every agent to the default and erased the model it spawned on. */
export function requestedModel(flags: AgentFlags): string | null {
  return flags.modelFlag ?? null;
}

/** Resolve the one model/effort pair every tuning-aware command applies: the
 *  flags on this command, else the tuning the agent already holds (`pinned`),
 *  else the configured default. A launch passes `null`: it has no agent yet. */
export function resolveTuningOrDie(flags: AgentFlags, settings: OrchSettings, harness: AdapterId, pinned: AgentTuning | null): Tuning {
  const tuning = resolveTuning({ model: requestedModel(flags), thinking: flags.thinkingFlag, pinned, harness, settings });
  if (tuning === null) die(`no model selected for ${harness} - pass --model <model[:thinking]>, or record one with: ${repickCommand(harness)}`);
  return tuning;
}
