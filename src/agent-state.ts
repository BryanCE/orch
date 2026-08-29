import { AGENT_STATES, type AgentState } from "./adapters/adapter.ts";

/** Verify that an unknown value is one of orch's declared agent states. */
export function isAgentState(value: unknown): value is AgentState {
  return typeof value === "string" && AGENT_STATES.some((state) => state === value);
}
