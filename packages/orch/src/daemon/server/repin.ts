import { randomUUID } from "node:crypto";
import type { AgentTuning } from "../../types/store.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { AdapterId } from "../../types/adapter.ts";
import type { ControlAction, ControlBoundaryOutcome } from "../../types/control.ts";
import type { Logger } from "../../types/core.ts";
import { modelSpec } from "../../policy/thinking.ts";
import { resolveTuning } from "../../policy/tuning.ts";
import { errorMessage } from "../../util.ts";

export interface LiveAgentForRepin {
  readonly id: string;
  readonly harnessId: string;
  /** The tuning the agent holds. A pinned agent keeps it across a settings change. */
  readonly tuning: AgentTuning;
}

export interface RepinAdapterCapabilities {
  readonly id: AdapterId;
  readonly modelControl: object | null;
  readonly bridge: { readonly takes: readonly string[] } | null;
}

export interface RepinLiveFleetOptions {
  readonly previousSettings: OrchSettings;
  readonly settings: OrchSettings;
  readonly listLiveAgents: () => readonly LiveAgentForRepin[];
  readonly resolveAdapter: (agent: LiveAgentForRepin) => RepinAdapterCapabilities | undefined;
  readonly deliver: (target: string, action: Extract<ControlAction, { kind: "model" }>) => Promise<ControlBoundaryOutcome>;
  readonly logger: Pick<Logger, "info" | "warn">;
}

function settingMapsDiffer(left: object, right: object): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = new Map(Object.entries(right));
  if (leftEntries.length !== rightEntries.size) return true;
  return leftEntries.some(([key, value]) => !rightEntries.has(key) || rightEntries.get(key) !== value);
}

export function tuningSettingsChanged(previous: OrchSettings, settings: OrchSettings): boolean {
  return previous.defaults.thinking !== settings.defaults.thinking
    || settingMapsDiffer(previous.defaults.thinking_by_harness, settings.defaults.thinking_by_harness)
    || settingMapsDiffer(previous.defaults.models, settings.defaults.models);
}

/** A settings change tunes the agents nobody has tuned. An agent holding a pin
 *  chose its model (or its orchestrator did) and keeps it; the default is for
 *  the rest. Same precedence as dispatch, reset and restart: `resolveTuning`. */
export async function repinLiveFleet(options: RepinLiveFleetOptions): Promise<void> {
  if (!tuningSettingsChanged(options.previousSettings, options.settings)) return;
  for (const agent of options.listLiveAgents()) {
    try {
      const adapter = options.resolveAdapter(agent);
      if (adapter === undefined) continue;
      if (adapter.modelControl === null && !adapter.bridge?.takes.includes("model")) continue;
      if (agent.tuning.model !== null) {
        options.logger.info("settings.repin.kept", { agentId: agent.id, model: modelSpec(agent.tuning.model, agent.tuning.thinking) });
        continue;
      }
      const tuning = resolveTuning({ pinned: agent.tuning, harness: adapter.id, settings: options.settings });
      if (tuning === null) continue;
      const spec = modelSpec(tuning.model, tuning.thinking);
      const outcome = await options.deliver(agent.id, { kind: "model", model: spec, id: randomUUID() });
      options.logger.info("settings.repin.applied", {
        agentId: agent.id,
        model: spec,
        thinking: tuning.thinking,
        outcome: outcome.outcome,
      });
    } catch (error: unknown) {
      options.logger.warn("settings.repin.failed", { agentId: agent.id, error: errorMessage(error) });
    }
  }
}
