import type { OrchDir } from "../types/core.ts";
import { notify } from "../notify/router.ts";
import { abstractAgentLabel, spaceLabelForKey } from "../notify/format.ts";
import { loadPresence } from "../presence/store.ts";
import { agentViews } from "../store/agent-view.ts";
import { computeFleetCapacity, packsUsed } from "../policy/capacity.ts";
import type { NotifyEvent } from "../types/notify.ts";
import type { NotifyEntry } from "../types/settings.ts";
import type { SettingsManager } from "../types/services.ts";

/** How many events this daemon has published for each agent. The publish point is the
 * one place every event passes through, so the ordinal it stamps is unique per agent. */
const published = new Map<string, number>();

/** How long an identical transition for one agent stays suppressed. */
const REPEAT_WINDOW_MS = 120_000;

/** When each (agent, transition-signature) pair was last published. */
const recentTransitions = new Map<string, number>();

/** True when this exact transition for this agent was already published inside the
 * fixed suppression window. */
export function isRepeatTransition(event: NotifyEvent, now = Date.now()): boolean {
  let oldState = "";
  let dispatchId = "";
  let task = "";
  let askCount = "";
  let gaveUp = "";
  switch (event.type) {
    case "transition":
    case "asking":
      oldState = event.oldState;
      dispatchId = event.dispatchId ?? "";
      task = event.task ?? "";
      if (event.type === "asking") {
        askCount = String(event.askCount);
        gaveUp = event.gaveUp ? "gave-up" : "";
      }
      break;
    case "closed":
      oldState = event.oldState;
      break;
    case "task":
      oldState = event.oldState;
      task = event.task;
      break;
    case "message":
      break;
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
  const signature = `${event.key}|${oldState}>${event.newState}|${dispatchId}|${task}|${askCount}|${gaveUp}`;
  const lastPublished = recentTransitions.get(signature);
  const repeated = lastPublished !== undefined && now - lastPublished < REPEAT_WINDOW_MS;
  if (!repeated) recentTransitions.set(signature, now);
  if (recentTransitions.size > 1_000) {
    for (const [key, at] of recentTransitions) if (now - at > REPEAT_WINDOW_MS) recentTransitions.delete(key);
  }
  return repeated;
}

/** Publish one event to the RPC stream and every configured sink. */
export function emitAndNotify(
  emit: (event: NotifyEvent) => void,
  sinks: NotifyEntry[],
  event: NotifyEvent,
  orchDir: OrchDir | undefined,
  settings: SettingsManager,
  now = Date.now(),
): void {
  if (isRepeatTransition(event, now)) return;
  const space = event.space ?? spaceLabelForKey(event.key);
  const seq = (published.get(event.key) ?? 0) + 1;
  published.set(event.key, seq);
  const named = event.agent?.trim() ? event : { ...event, agent: abstractAgentLabel(space, event.key), space };
  const capacity = event.type !== "transition" && event.type !== "asking"
    ? undefined
    : orchDir === undefined
      ? event.capacity
      : (() => {
        const views = new Map(agentViews(orchDir).map((view) => [view.id, view]));
        const presence = loadPresence(orchDir);
        const view = views.get(event.key);
        const currentSettings = settings.current();
        const computed = computeFleetCapacity(views, presence, currentSettings, { packRootId: view?.rootAgentId });
        return { packUsed: packsUsed(computed), packCap: currentSettings.fleet.max_agents_per_pack };
      })();
  const canonical: NotifyEvent = { ...named, seq, ...(capacity === undefined ? {} : { capacity }) };
  emit(canonical);
  if (orchDir !== undefined) notify(orchDir, settings.currentOrNull(), sinks, canonical);
}
