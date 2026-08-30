import { agentView } from "../store/agent-view.ts";
import { isDescendantOf } from "./provenance.ts";
import type { CloseAuthority } from "../types/policy.ts";

/**
 * Who may END an agent.
 *
 * The human is NEVER gated — they must always be able to stop a runaway agent
 * from the CLI or the web. That is a statement about the human, and only about
 * the human: an agent is not a human and does not inherit it.
 *
 * For an agent, ownership is a CHAIN — user → orch → the slaves that orch owns
 * — and it is NOT the lease. The lease answers "who is driving this right now"
 * and gates the driving verbs (dispatch/steer/model/reset). This answers "whose
 * is this" and gates ending it. Consulting the lease here would be wrong twice
 * over: an orch closing its own slave must never be blocked because another
 * orch holds the lease, and clearing a dead holder's lease must never be a
 * prerequisite for killing a runaway.
 *
 * The caller is told apart the way `orch clean` already does it (see
 * `src/commands/clean.ts:118`): no `ORCH_AGENT_KEY` in the environment is the
 * human at a terminal, and a key present is an agent whose reach is its own
 * provenance subtree.
 */

/** The human may end anything. An agent's reach is what it spawned. */
export type { CloseAuthority };

export function callerAuthority(agentKey: string | undefined): CloseAuthority {
  const key = agentKey?.trim();
  return key === undefined || key.length === 0 ? { kind: "human" } : { kind: "agent", agentId: key };
}

/**
 * `null` when the caller may end this agent; otherwise the refusal to print.
 * A refusal names the owner so the caller knows who to ask.
 */
export function refuseClose(orchDir: string, authority: CloseAuthority, agentId: string): string | null {
  if (authority.kind === "human") return null;
  // Acting on yourself is not driving anyone else's fleet.
  if (authority.agentId === agentId) return null;
  // Provenance is immutable, so this answer cannot be changed by a lease moving.
  if (isDescendantOf((id) => agentView(orchDir, id), agentId, authority.agentId)) return null;
  const view = agentView(orchDir, agentId);
  const name = view?.name ?? agentId;
  const owner = view?.spawnedByName ?? view?.spawnedBy;
  return owner === null || owner === undefined
    ? `cannot close ${name}: it is not yours to close. Ask the user.`
    : `cannot close ${name}: it belongs to ${owner}. Ask ${owner}, or ask the user.`;
}
