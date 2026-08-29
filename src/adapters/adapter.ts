import { ADAPTER_IDS, LIFECYCLE_VERBS, type AdapterId, type LifecycleVerb } from "../types/adapter.ts";

export function isAdapterId(value: unknown): value is AdapterId {
  return typeof value === "string" && ADAPTER_IDS.some((id) => id === value);
}

export function isLifecycleVerb(value: unknown): value is LifecycleVerb {
  return typeof value === "string" && LIFECYCLE_VERBS.some((verb) => verb === value);
}

/** States an adapter may expose through orch's presence protocol. */
export { AGENT_STATES, type AgentState } from "../agent-state.ts";

