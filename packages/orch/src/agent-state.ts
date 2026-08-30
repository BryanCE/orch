/**
 * Orch's agent-state vocabulary: the ONE place the set of states is written.
 *
 * A leaf on purpose — it imports nothing, so any module may read the vocabulary
 * without dragging in the adapter port (and without the import cycle that costs).
 * Every narrower view of a state is DERIVED from this list with `Extract`, never
 * re-spelled: a second literal union wearing the same name is how two different
 * meanings end up behind one identifier.
 */
export const AGENT_STATES = ["idle", "working", "blocked", "asking", "done", "error", "aborted", "exited", "unknown"] as const;

export type AgentState = (typeof AGENT_STATES)[number];

/** Verify that an unknown value is one of orch's declared agent states. */
export function isAgentState(value: unknown): value is AgentState {
  return typeof value === "string" && AGENT_STATES.some((state) => state === value);
}
