// A model change a held session's link takes: applied through the link's own wire, then reported
// the way a bridge reports it, so `orch model` waits on the same outcome for every channel.
import { splitThinkingSuffix } from "../policy/thinking.ts";
import { errorMessage } from "../util.ts";
import type { BridgeDelivery } from "../shared/bridge-message.ts";
import type { SessionLinkEvents } from "../types/held-session.ts";
import type { ThinkingLevel } from "../types/policy.ts";

/** What a link's wire applied: the model, and the thinking level when the harness took it. */
export interface AppliedModel {
  readonly model: string;
  readonly thinking?: ThinkingLevel;
}

/** Apply `model`, its thinking suffix split off, through `apply`, and report the outcome. */
export function applyLinkModel(delivery: BridgeDelivery, model: string, apply: (bare: string, thinking: ThinkingLevel | undefined) => Promise<AppliedModel>, events: Pick<SessionLinkEvents, "onApplied" | "onOutcome" | "onError">): void {
  const { bare, thinking } = splitThinkingSuffix(model);
  const requested = { model };
  void apply(bare, thinking).then((applied) => {
    events.onApplied(delivery.id);
    events.onOutcome({ id: delivery.id, command: "model", requested, applied });
  }, (error: unknown) => {
    events.onError(error instanceof Error ? error : new Error(String(error)));
    events.onOutcome({ id: delivery.id, command: "model", requested, error: errorMessage(error) });
  });
}
